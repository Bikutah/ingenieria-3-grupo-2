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

import type { Cliente as DomainCliente } from "@/services/cliente/types/Cliente"
import { clienteService } from "@/services/cliente/api/ClienteService"

// Alias para no chocar nombres
type Cliente = DomainCliente
const PAGE_SIZE = 50;

export default function ClientePage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<number | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [clienteToDelete, setClienteToDelete] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // El formulario ahora usa el schema nuevo
  const [formData, setFormData] = useState<Omit<Cliente, "id">>({
    nombre: "",
    apellido: "",
    dni: "",
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

  // Cargar lista inicial
  // función reutilizable para cargar una página
  const loadPage = useCallback(
    async (p: number, s = size) => {
      setLoading(true);
      try {
        const { items, total, page, pages, size } = await clienteService.list({ page: p, size: s, ...filters });
        setClientes(items);
        setTotal(total ?? 0);
        setPage(page ?? p);
        setPages(pages);
        setSize(size ?? s);
      } catch (e) {
        console.error("Error cargando clientes:", e);
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
        const data = await clienteService.list({ page: 1, size: PAGE_SIZE, ...filters });
        if (!mounted) return;
        setClientes(data.items);
        setTotal(data.total ?? 0);
        setPage(data.page ?? 1);
        setPages(data.pages);
        setSize(data.size ?? PAGE_SIZE);
      } catch (e) {
        console.error("Error cargando clientes:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // solo al montar: no pongas filters para no recargar en cada cambio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDialog = (cliente?: Cliente) => {
    if (cliente) {
      setSelectedCliente(cliente)
      setFormData({
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        dni: cliente.dni,
        telefono: cliente.telefono,
        activo: cliente.activo,
      })
    } else {
      setSelectedCliente(null)
      setFormData({
        nombre: "",
        apellido: "",
        dni: "",
        telefono: "",
        activo: true,
      })
    }
    setIsDialogOpen(true)
  }


  const handleSave = async () => {
    try {
      setSaving(true)
      if (selectedCliente) {
        const updated = await clienteService.update(selectedCliente.id, formData)
        setClientes(prev => prev.map(m => (m.id === selectedCliente.id ? updated : m)))
      } else {
        const created = await clienteService.create(formData)
        setClientes(prev => [...prev, created])
      }
      setIsDialogOpen(false)
    } catch (e) {
      console.error("Error guardando cliente:", e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!clienteToDelete) return
    try {
      await clienteService.remove(clienteToDelete)
      setClientes(prev => prev.filter(m => m.id !== clienteToDelete))
      setIsDeleteDialogOpen(false)
      setClienteToDelete(null)
    } catch (e) {
      console.error("Error eliminando cliente:", e)
    }
  }

  const openDeleteDialog = (id: number) => {
    setClienteToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? "Cargando..." : "Administra los clientes de tu restaurante"}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedCliente ? "Modificar Cliente" : "Nuevo Cliente"}</DialogTitle>
              <DialogDescription>
                {selectedCliente ? "Modifica los datos del cliente" : "Completa los datos del nuevo cliente"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {selectedCliente ? "Guardar Cambios" : "Crear Cliente"}
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
                    "-created_at","created_at",
                    "-id","id",
                    "-apellido","apellido",
                    "-nombre","nombre",
                    "-dni","dni",
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
            {clientes.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell className="font-medium">{cliente.id}</TableCell>
                <TableCell>{cliente.nombre}</TableCell>
                <TableCell>{cliente.apellido}</TableCell>
                <TableCell>{cliente.dni}</TableCell>
                <TableCell>{cliente.telefono}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      cliente.activo
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" 
                        : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    }`}
                  >
                    {cliente.activo ? "Inactivo" : "Activo"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cliente)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(cliente.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && clientes.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No hay clientes cargados.
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
          <span className="text-sm text-muted-.foreground">Filas por página</span>
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
              Esta acción no se puede deshacer. El cliente será eliminado permanentemente del sistema.
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
