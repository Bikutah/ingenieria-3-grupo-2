"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Ban, BadgeDollarSign, XCircle, Check, ChevronsUpDown } from "lucide-react";

import type { Factura, EstadoFactura, MedioPago } from "@/services/facturacion/types/Factura";
import { facturacionService } from "@/services/facturacion/api/FacturacionService";

// ──────────────────────────────────────────────
// Constantes/Helpers locales
const MEDIOS_PAGO = ['transferencia','debito','credito','efectivo'] as const;
const ESTADOS_FACTURA = ['pendiente','pagada','cancelada','anulada'] as const;

const isPending = (f: Factura) => f.estado === "pendiente";
const estadoBadge = (estado: EstadoFactura) => {
  switch (estado) {
    case "pendiente": return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300";
    case "pagada":    return "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400";
    case "cancelada": return "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400";
    case "anulada":   return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300";
  }
};
// ──────────────────────────────────────────────

type Accion = "pagar" | "cancelar" | "anular";

function ConfirmarAccionFactura({
  open, onOpenChange, factura, accion, onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  factura: Factura | null;
  accion: Accion | null;
  onDone: (updated: Factura) => void;
}) {
  const [saving, setSaving] = useState(false);
  if (!factura || !accion) return null;

  const run = async () => {
    try {
      setSaving(true);
      const id = factura.id;
      const updated =
        accion === "pagar"    ? await facturacionService.pagar(id)   :
        accion === "cancelar" ? await facturacionService.cancelar(id):
                                await facturacionService.anular(id);
      toast.success(`Factura #${updated.id} ${accion} ✔`);
      onDone(updated);
      onOpenChange(false);
    } catch (e) {
      toast.error("No se pudo aplicar la acción");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !saving && onOpenChange(v)}>
      <DialogContent className="overflow-hidden rounded-2xl border p-4 sm:max-w-[560px]">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="capitalize">{accion} factura</DialogTitle>
          <DialogDescription>Revisá el resumen y confirmá la acción.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">ID</span>           <span>#{factura.id}</span>
            <span className="text-muted-foreground">Comanda</span>      <span>#{factura.id_comanda}</span>
            <span className="text-muted-foreground">Medio de pago</span><span className="capitalize">{factura.medio_pago}</span>
            <span className="text-muted-foreground">Total</span>        <span>${factura.total}</span>
            <span className="text-muted-foreground">Estado</span>       <span className="capitalize">{factura.estado}</span>
          </div>

          {factura.detalles_factura && (
            <pre className="mt-2 rounded-md border bg-muted/30 p-3 text-xs overflow-x-auto">
              {factura.detalles_factura}
            </pre>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 z-10 bg-background p-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button className="capitalize" onClick={run} disabled={saving}>
            Confirmar {accion}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Página con filtros + tabla + acciones (todo server-side)
// ──────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 50;

type ListFilters = {
  q?: string;
  id?: number;
  id__neq?: number;
  id_comanda?: number;
  id_comanda__neq?: number;
  fecha_emision__gte?: string;
  fecha_emision__lte?: string;
  created_at__gte?: string;
  created_at__lte?: string;
  total__lte?: number;
  total__gte?: number;
  medio_pago?: MedioPago[];
  estado?: EstadoFactura[];
  order_by?: string;
};

const DEFAULT_FILTERS: ListFilters = {
  q: "",
  order_by: "-id",
  medio_pago: [],
  estado: [],
};

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(false);

  // paginación (server-side)
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<number | undefined>(undefined);

  // filtros (server-side)
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS);

  // diálogo de acción
  const [open, setOpen] = useState(false);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [selected, setSelected] = useState<Factura | null>(null);

  const openAccion = (f: Factura, a: Accion) => {
    if (!isPending(f)) {
      toast.message("Acción no disponible", { description: "Solo para facturas pendientes." });
      return;
    }
    setSelected(f);
    setAccion(a);
    setOpen(true);
  };

  const updateInList = (upd: Factura) => {
    setFacturas(prev => prev.map(f => (f.id === upd.id ? upd : f)));
  };

  const load = useCallback(async (p = 1, s = size) => {
    setLoading(true);
    try {
      // Todo se envía al backend; nada se filtra en cliente.
      const params = { ...filters, page: p, size: s };
      const { items, total, page: rp, pages: rpages, size: rsize } = await facturacionService.list(params as any);
      setFacturas(items ?? []);
      setTotal(total ?? 0);
      setPage(rp ?? p);
      setPages(rpages);
      setSize(rsize ?? s);
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar las facturas");
    } finally {
      setLoading(false);
    }
  }, [filters, size]);

  // primera carga
  useEffect(() => { load(1, size); /* eslint-disable-next-line */ }, []);

  // MultiSelect embebido
  const MultiSelect = ({
    label, options, selected, onToggle,
  }: {
    label: string;
    options: readonly string[];
    selected: string[];
    onToggle: (value: string, checked: boolean) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const filtered = useMemo(
      () => options.filter(o => o.toLowerCase().includes(query.trim().toLowerCase())),
      [options, query]
    );
    const formatMulti = (items: string[]) => items.length ? items.join(", ") : "Todos";

    return (
      <div className="grid gap-2">
        <Label>{label}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" role="combobox" className="w-full justify-between">
              <span className="truncate">{formatMulti(selected)}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder={`Filtrar ${label.toLowerCase()}…`} value={query} onValueChange={setQuery}/>
              <CommandList>
                <CommandEmpty className="p-3">Sin resultados</CommandEmpty>
                <CommandGroup>
                  {filtered.map((opt) => {
                    const isSel = selected.includes(opt);
                    return (
                      <CommandItem
                        key={opt}
                        value={opt}
                        onSelect={() => onToggle(opt, !isSel)}
                        className="flex items-center gap-2"
                      >
                        <Checkbox checked={isSel} onCheckedChange={(v) => onToggle(opt, Boolean(v))}/>
                        <span className="capitalize">{opt}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {!!selected.length && (
          <div className="flex flex-wrap gap-1">
            {selected.map(s => (
              <span key={s} className="rounded-full border px-2 py-0.5 text-xs capitalize">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const applyFilters = () => load(1, size);
  const clearFilters = () => { setFilters(DEFAULT_FILTERS); load(1, size); };

  // paginación visible (solo UI; datos vienen del back)
  const totalPages = pages ?? Math.max(1, Math.ceil((total ?? 0) / (size || 1)));
  const visiblePages = useMemo(() => {
    const res: (number | "ellipsis")[] = [];
    const push = (v: number | "ellipsis") => res.push(v);
    if (totalPages <= 7) { for (let i=1;i<=totalPages;i++) push(i); return res; }
    push(1);
    if (page > 3) push("ellipsis");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) push(i);
    if (page < totalPages - 2) push("ellipsis");
    push(totalPages);
    return res;
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Facturación</h1>
        <p className="mt-2 text-muted-foreground">{loading ? "Cargando…" : "Listado de facturas"}</p>
      </div>

      {/* FILTROS (server-side) */}
      <div className="rounded-md border p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="q">Buscar</Label>
            <Input
              id="q" placeholder="ID, comanda, medio, etc."
              value={filters.q ?? ""}
              onChange={(e) => setFilters(f => ({ ...f, q: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="id">ID</Label>
            <Input
              id="id" type="number" placeholder="= ID"
              value={filters.id ?? ""}
              onChange={(e) => setFilters(f => ({ ...f, id: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="id_comanda">ID Comanda</Label>
            <Input
              id="id_comanda" type="number" placeholder="= ID Comanda"
              value={filters.id_comanda ?? ""}
              onChange={(e) => setFilters(f => ({ ...f, id_comanda: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>

          <div className="grid gap-2">
            <Label>Fecha emisión (desde)</Label>
            <Input
              type="date" value={filters.fecha_emision__gte ?? ""}
              onChange={(e) => setFilters(f => ({ ...f, fecha_emision__gte: e.target.value || undefined }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Fecha emisión (hasta)</Label>
            <Input
              type="date" value={filters.fecha_emision__lte ?? ""}
              onChange={(e) => setFilters(f => ({ ...f, fecha_emision__lte: e.target.value || undefined }))}
            />
          </div>

          <div className="grid gap-2">
            <Label>Total ≥</Label>
            <Input
              type="number" min={0} value={filters.total__gte ?? ""}
              onChange={(e) => setFilters(f => ({ ...f, total__gte: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Total ≤</Label>
            <Input
              type="number" min={0} value={filters.total__lte ?? ""}
              onChange={(e) => setFilters(f => ({ ...f, total__lte: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>

          <MultiSelect
            label="Medio de pago"
            options={MEDIOS_PAGO}
            selected={filters.medio_pago ?? []}
            onToggle={(val, checked) =>
              setFilters(f => {
                const arr = new Set(f.medio_pago ?? []);
                checked ? arr.add(val as MedioPago) : arr.delete(val as MedioPago);
                return { ...f, medio_pago: Array.from(arr) as MedioPago[] };
              })
            }
          />

          <MultiSelect
            label="Estado"
            options={ESTADOS_FACTURA}
            selected={filters.estado ?? []}
            onToggle={(val, checked) =>
              setFilters(f => {
                const arr = new Set(f.estado ?? []);
                checked ? arr.add(val as EstadoFactura) : arr.delete(val as EstadoFactura);
                return { ...f, estado: Array.from(arr) as EstadoFactura[] };
              })
            }
          />

          <div className="grid gap-2">
            <Label>Orden</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between">
                  {filters.order_by || "-id"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Buscar campo…" />
                  <CommandList>
                    <CommandGroup heading="Campos">
                      {["-id","id","-created_at","created_at","-total","total"].map(opt => (
                        <CommandItem key={opt} value={opt} onSelect={() => setFilters(f => ({ ...f, order_by: opt }))}>
                          <Check className={`mr-2 h-4 w-4 ${filters.order_by === opt ? "opacity-100" : "opacity-0"}`} />
                          {opt}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => load(1, size)} disabled={loading}>Aplicar filtros</Button>
          <Button variant="outline" onClick={clearFilters} disabled={loading}>Limpiar</Button>
        </div>
      </div>

      {/* TABLA */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Comanda</TableHead>
              <TableHead>Medio</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facturas.map((f) => {
              const pending = isPending(f);
              return (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">#{f.id}</TableCell>
                  <TableCell>#{f.id_comanda}</TableCell>
                  <TableCell className="capitalize">{f.medio_pago}</TableCell>
                  <TableCell>${f.total}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${estadoBadge(f.estado)}`}>
                      {f.estado}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="capitalize" disabled={!pending} onClick={() => openAccion(f, "pagar")} title={pending ? "Pagar" : "Solo si está pendiente"}>
                        <BadgeDollarSign className="mr-1 h-4 w-4" /> Pagar
                      </Button>
                      <Button size="sm" variant="ghost" className="capitalize" disabled={!pending} onClick={() => openAccion(f, "cancelar")} title={pending ? "Cancelar" : "Solo si está pendiente"}>
                        <Ban className="mr-1 h-4 w-4" /> Cancelar
                      </Button>
                      <Button size="sm" variant="ghost" className="capitalize" disabled={!pending} onClick={() => openAccion(f, "anular")} title={pending ? "Anular" : "Solo si está pendiente"}>
                        <XCircle className="mr-1 h-4 w-4" /> Anular
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && facturas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay facturas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          {(() => {
            const start = total === 0 ? 0 : (page - 1) * size + 1;
            const end = Math.min(page * size, total ?? 0);
            return `Mostrando ${start}–${end} de ${total ?? 0}`;
          })()}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filas por página</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[110px] justify-between">
                {String(size)}
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[110px] p-0">
              <Command>
                <CommandList>
                  <CommandGroup>
                    {[10, 20, 50, 100].map((opt) => (
                      <CommandItem
                        key={opt}
                        value={String(opt)}
                        onSelect={() => { setSize(opt); setPage(1); load(1, opt); }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${size === opt ? "opacity-100" : "opacity-0"}`} />
                        {opt}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={page <= 1 || loading}
                className={page <= 1 || loading ? "pointer-events-none opacity-50" : ""}
                onClick={() => page > 1 && !loading && (setPage(page - 1), load(page - 1, size))}
              />
            </PaginationItem>

            {visiblePages.map((p, idx) =>
              p === "ellipsis" ? (
                <PaginationItem key={`el-${idx}`}><PaginationEllipsis /></PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === page}
                    onClick={() => p !== page && !loading && (setPage(p), load(p, size))}
                    className={loading ? "pointer-events-none opacity-50" : ""}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                aria-disabled={page >= totalPages || loading}
                className={page >= totalPages || loading ? "pointer-events-none opacity-50" : ""}
                onClick={() => page < totalPages && !loading && (setPage(page + 1), load(page + 1, size))}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <ConfirmarAccionFactura
        open={open}
        onOpenChange={setOpen}
        factura={selected}
        accion={accion}
        onDone={updateInList}
      />
    </div>
  );
}
