"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"

import type { Mozo as DomainMozo } from "@/services/mozo/types/Mozo"
import { mozoService } from "@/services/mozo/api/MozoService"

import { toast } from "sonner"
import { extractApiErrorMessage } from "@/lib/api-error"

// Alias para no chocar nombres
type Mozo = DomainMozo
const PAGE_SIZE = 50;

export default function MozosPage() {
  const [mozos, setMozos] = useState<Mozo[]>([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<number | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMozo, setSelectedMozo] = useState<Mozo | null>(null)
  const [mozoToDelete, setMozoToDelete] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // El formulario ahora usa el schema nuevo
  const [formData, setFormData] = useState<Omit<Mozo, "id">>({
    nombre: "",
    apellido: "",
    dni: "",
    direccion: "",
    telefono: "",
    activo: true,
  })

  type ListParams = {
    q?: string
    page?: number
    size?: number
    id?: number
    id__neq?: number
    nombre__ilike?: string
    apellido__ilike?: string
    dni__ilike?: string
    direccion__ilike?: string
    baja?: boolean
    order_by?: string
  }

  const DEFAULT_FILTERS: Omit<ListParams, "page" | "size"> = {
    baja: false,
    order_by: "-id",
  }

  const [filters, setFilters] = useState<Omit<ListParams, "page" | "size">>(DEFAULT_FILTERS)


  //Errores
  // --- state y helpers ---
  type FormErrors = {
    nombre?: string;
    apellido?: string;
    direccion?: string;
    dni?: string;
    telefono?: string;
  };

  type Touched = Partial<Record<keyof FormErrors, boolean>>;

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [touched, setTouched] = useState<Touched>({});

  // helpers
  const toStringSafe = (v: unknown) => (typeof v === "string" ? v : String(v ?? ""));

  // DNI AR: 7–8 dígitos (con o sin puntos)
  const isValidDNI = (v: string) => {
    const digits = v.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 8;
  };

  // Teléfono AR: 8–13 dígitos totales (se admite +54/0/15/espacios/guiones/paréntesis)
  const isValidPhoneAR = (v: string) => {
    const digits = v.replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 13;
  };

  // Validación general
  const validateForm = (data = formData): boolean => {
    const errors: FormErrors = {};

    const nombre = toStringSafe(data.nombre).trim();
    const apellido = toStringSafe(data.apellido).trim();
    const direccion = toStringSafe(data.direccion).trim();
    const dni = toStringSafe(data.dni).trim();
    const telefono = toStringSafe(data.telefono).trim();

    if (!nombre) errors.nombre = "El nombre es obligatorio.";
    if (!apellido) errors.apellido = "El apellido es obligatorio.";
    if (!direccion) errors.direccion = "La dirección es obligatoria.";

    if (!dni) errors.dni = "El DNI es obligatorio.";
    else if (!isValidDNI(dni)) errors.dni = "DNI inválido. Usá 7 u 8 dígitos.";

    if (!telefono) errors.telefono = "El teléfono es obligatorio.";
    else if (!isValidPhoneAR(telefono))
      errors.telefono = "Teléfono inválido: 8–13 dígitos (se permite +54, 0/15, espacios, guiones).";

    setFormErrors(errors);
    const ok = Object.keys(errors).length === 0;
    setIsFormValid(ok);
    return ok;
  };

  // Revalidar en vivo al cambiar formData
  useEffect(() => {
    validateForm(formData);
  }, [formData]);

  // marcar touched
  const markTouched = (key: keyof Touched) =>
    setTouched((t) => ({ ...t, [key]: true }));

  // clase de error simple (si usás shadcn, funciona bien sumando esta clase)
  const errorClass = "border-red-500 focus-visible:ring-red-500";


  // Cargar lista inicial
  // función reutilizable para cargar una página
  const loadPage = useCallback(
    async (p: number, s = size) => {
      setLoading(true);
      try {
        const { items, total, page, pages, size } = await mozoService.list({ page: p, size: s, ...filters });
        setMozos(items);
        setTotal(total ?? 0);
        setPage(page ?? p);
        setPages(pages);
        setSize(size ?? s);
      } catch (e) {
        console.error("Error cargando mozos:", e);
      } finally {
        setLoading(false);
      }
    },
    [size, filters]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await mozoService.list({ page: 1, size: PAGE_SIZE, ...filters });
        if (!mounted) return;
        setMozos(data.items);
        setTotal(data.total ?? 0);
        setPage(data.page ?? 1);
        setPages(data.pages);
        setSize(data.size ?? PAGE_SIZE);
      } catch (e) {
        console.error("Error cargando mozos:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // solo al montar: no pongas filters para no recargar en cada cambio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDialog = (mozo?: Mozo) => {
    if (mozo) {
      setSelectedMozo(mozo)
      setFormData({
        nombre: mozo.nombre,
        apellido: mozo.apellido,
        dni: mozo.dni,
        direccion: mozo.direccion,
        telefono: mozo.telefono,
        activo: mozo.activo,
      })
    } else {
      setSelectedMozo(null)
      setFormData({
        nombre: "",
        apellido: "",
        dni: "",
        direccion: "",
        telefono: "",
        activo: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (selectedMozo) {
        const updated = await mozoService.update(selectedMozo.id, formData)
        setMozos(prev => prev.map(m => (m.id === selectedMozo.id ? updated : m)))
        toast.success("Mozo actualizada", { description: `#${updated?.id ?? selectedMozo.id}` })
      } else {
        const created = await mozoService.create(formData)
        setMozos(prev => [...prev, created])
        toast.success("Mozo creada", { description: `#${created?.id ?? "?"}` })
      }
      setIsDialogOpen(false)
    } catch (e) {
      toast.error("No se pudo guardar", { description: extractApiErrorMessage(e) })
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!mozoToDelete) return
    try {
      await mozoService.remove(mozoToDelete)
      setMozos(prev => prev.filter(m => m.id !== mozoToDelete))
      setIsDeleteDialogOpen(false)
      setMozoToDelete(null)
    } catch (e) {
      console.error("Error eliminando mozo:", e)
    }
  }

  const openDeleteDialog = (id: number) => {
    setMozoToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Mozos</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? "Cargando..." : "Administra el personal de tu restaurante"}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Mozo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedMozo ? "Modificar Mozo" : "Nuevo Mozo"}</DialogTitle>
              <DialogDescription>
                {selectedMozo ? "Modifica los datos del mozo" : "Completa los datos del nuevo mozo"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Nombre */}
              <div className="grid gap-1.5">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  onBlur={() => markTouched("nombre")}
                  aria-invalid={!!(touched.nombre && formErrors.nombre)}
                  aria-describedby={touched.nombre && formErrors.nombre ? "nombre-error" : undefined}
                  className={touched.nombre && formErrors.nombre ? errorClass : undefined}
                />
                {touched.nombre && formErrors.nombre && (
                  <p id="nombre-error" className="text-sm text-red-600">{formErrors.nombre}</p>
                )}
              </div>

              {/* Apellido */}
              <div className="grid gap-1.5">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  onBlur={() => markTouched("apellido")}
                  aria-invalid={!!(touched.apellido && formErrors.apellido)}
                  aria-describedby={touched.apellido && formErrors.apellido ? "apellido-error" : undefined}
                  className={touched.apellido && formErrors.apellido ? errorClass : undefined}
                />
                {touched.apellido && formErrors.apellido && (
                  <p id="apellido-error" className="text-sm text-red-600">{formErrors.apellido}</p>
                )}
              </div>

              {/* DNI */}
              <div className="grid gap-1.5">
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  onBlur={() => markTouched("dni")}
                  inputMode="numeric"
                  aria-invalid={!!(touched.dni && formErrors.dni)}
                  aria-describedby={touched.dni && formErrors.dni ? "dni-error" : undefined}
                  className={touched.dni && formErrors.dni ? errorClass : undefined}
                />
                {touched.dni && formErrors.dni && (
                  <p id="dni-error" className="text-sm text-red-600">{formErrors.dni}</p>
                )}
              </div>

              {/* Dirección */}
              <div className="grid gap-1.5">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  onBlur={() => markTouched("direccion")}
                  aria-invalid={!!(touched.direccion && formErrors.direccion)}
                  aria-describedby={touched.direccion && formErrors.direccion ? "direccion-error" : undefined}
                  className={touched.direccion && formErrors.direccion ? errorClass : undefined}
                />
                {touched.direccion && formErrors.direccion && (
                  <p id="direccion-error" className="text-sm text-red-600">{formErrors.direccion}</p>
                )}
              </div>

              {/* Teléfono */}
              <div className="grid gap-1.5">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  onBlur={() => markTouched("telefono")}
                  inputMode="tel"
                  aria-invalid={!!(touched.telefono && formErrors.telefono)}
                  aria-describedby={touched.telefono && formErrors.telefono ? "telefono-error" : undefined}
                  className={touched.telefono && formErrors.telefono ? errorClass : undefined}
                  placeholder="+54 9 11 1234-5678"
                />
                {touched.telefono && formErrors.telefono && (
                  <p id="telefono-error" className="text-sm text-red-600">{formErrors.telefono}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !isFormValid}>
                {selectedMozo ? "Guardar Cambios" : "Crear Mozo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="rounded-md border p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">

          {/* ID exacto */}
          <div className="grid gap-2">
            <Label htmlFor="id">ID</Label>
            <Input
              id="id"
              type="number"
              placeholder="= ID"
              value={filters.id ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, id: e.target.value ? Number(e.target.value) : undefined }))
              }
            />
          </div>

          {/* ID distinto */}
          <div className="grid gap-2">
            <Label htmlFor="id_neq">ID ≠</Label>
            <Input
              id="id_neq"
              type="number"
              placeholder="≠ ID"
              value={filters.id__neq ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, id__neq: e.target.value ? Number(e.target.value) : undefined }))
              }
            />
          </div>

          {/* nombre__ilike */}
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre ~</Label>
            <Input
              id="nombre"
              placeholder="Contiene..."
              value={filters.nombre__ilike ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, nombre__ilike: e.target.value || undefined }))
              }
            />
          </div>

          {/* apellido__ilike */}
          <div className="grid gap-2">
            <Label htmlFor="apellido">Apellido ~</Label>
            <Input
              id="apellido"
              placeholder="Contiene..."
              value={filters.apellido__ilike ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, apellido__ilike: e.target.value || undefined }))
              }
            />
          </div>

          {/* dni__ilike */}
          <div className="grid gap-2">
            <Label htmlFor="dni_ilike">DNI ~</Label>
            <Input
              id="dni_ilike"
              placeholder="Contiene..."
              value={filters.dni__ilike ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dni__ilike: e.target.value || undefined }))
              }
            />
          </div>

          {/* direccion__ilike */}
          <div className="grid gap-2">
            <Label htmlFor="dir_ilike">Dirección ~</Label>
            <Input
              id="dir_ilike"
              placeholder="Contiene..."
              value={filters.direccion__ilike ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, direccion__ilike: e.target.value || undefined }))
              }
            />
          </div>

          {/* Estado (baja) */}
          <div className="grid gap-2">
            <Label>Estado</Label>
            <Select
              value={
                filters.baja === undefined ? "all" : filters.baja ? "baja" : "activos"
              }
              onValueChange={(v) => {
                if (v === "all") return setFilters((f) => ({ ...f, baja: undefined }));
                if (v === "baja") return setFilters((f) => ({ ...f, baja: true }));
                return setFilters((f) => ({ ...f, baja: false }));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Filtrar por</SelectLabel>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="baja">Dados de baja</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* order_by */}
          <div className="grid gap-2">
            <Label>Ordenar por</Label>
            <Select
              value={filters.order_by ?? "-id"}
              onValueChange={(v) => setFilters((f) => ({ ...f, order_by: v || undefined }))}
            >
              <SelectTrigger><SelectValue placeholder="Orden" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Campo (± asc/desc)</SelectLabel>
                  {[
                    "-created_at", "created_at",
                    "-id", "id",
                    "-apellido", "apellido",
                    "-nombre", "nombre",
                    "-dni", "dni",
                  ].map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>




        {/* Acciones */}
        <div className="flex gap-2">
          <Button
            onClick={() => loadPage(1, size)}
            disabled={loading}
          >
            Aplicar filtros
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFilters(DEFAULT_FILTERS)
              loadPage(1, size)
            }}
            disabled={loading}
          >
            Limpiar
          </Button>
        </div>
      </div>


      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Apellido</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mozos.map((mozo) => (
              <TableRow key={mozo.id}>
                <TableCell className="font-medium">{mozo.id}</TableCell>
                <TableCell>{mozo.nombre}</TableCell>
                <TableCell>{mozo.apellido}</TableCell>
                <TableCell>{mozo.dni}</TableCell>
                <TableCell>{mozo.telefono}</TableCell>
                <TableCell>{mozo.direccion}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${mozo.activo
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      }`}
                  >
                    {mozo.activo ? "Inactivo" : "Activo"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(mozo)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(mozo.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && mozos.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No hay mozos cargados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer de paginación */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Rango visible */}
        <div className="text-sm text-muted-foreground">
          {(() => {
            const start = total === 0 ? 0 : (page - 1) * size + 1
            const end = Math.min(page * size, total ?? 0)
            return `Mostrando ${start}–${end} de ${total ?? 0}`
          })()}
        </div>

        {/* Selector de filas por página */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filas por página</span>
          <Select
            value={String(size)}
            onValueChange={(v) => {
              const newSize = Number(v)
              // Reiniciamos a página 1 al cambiar el tamaño
              setSize(newSize)
              loadPage(1, newSize)
            }}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder={String(size)} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Tamaño</SelectLabel>
                {[10, 20, 50, 100].map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Botonera de paginación */}
        {(() => {
          const totalPages =
            pages ?? Math.max(1, Math.ceil((total ?? 0) / (size || 1)))

          // genera páginas visibles: 1 … (p-1, p, p+1) … total
          const getVisiblePages = (current: number, total: number) => {
            const res: (number | "ellipsis")[] = []
            const push = (v: number | "ellipsis") => res.push(v)

            if (total <= 7) {
              for (let i = 1; i <= total; i++) push(i)
              return res
            }

            push(1)
            if (current > 3) push("ellipsis")

            const start = Math.max(2, current - 1)
            const end = Math.min(total - 1, current + 1)
            for (let i = start; i <= end; i++) push(i)

            if (current < total - 2) push("ellipsis")
            push(total)
            return res
          }

          const visible = getVisiblePages(page, totalPages)

          return (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    aria-disabled={page <= 1 || loading}
                    className={page <= 1 || loading ? "pointer-events-none opacity-50" : ""}
                    onClick={() => page > 1 && !loading && loadPage(page - 1)}
                  />
                </PaginationItem>

                {visible.map((p, idx) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`el-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === page}
                        onClick={() => p !== page && !loading && loadPage(p)}
                        className={loading ? "pointer-events-none opacity-50" : ""}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}

                <PaginationItem>
                  <PaginationNext
                    aria-disabled={page >= totalPages || loading}
                    className={page >= totalPages || loading ? "pointer-events-none opacity-50" : ""}
                    onClick={() => page < totalPages && !loading && loadPage(page + 1)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )
        })()}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El mozo será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
