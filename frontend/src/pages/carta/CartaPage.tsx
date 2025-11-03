"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { extractApiErrorMessage } from "@/lib/api-error"

import type { Carta as DomainCarta } from "@/services/carta/types/Carta"
import { cartaService } from "@/services/carta/api/CartaService"

type Carta = DomainCarta
const PAGE_SIZE = 50

type ListParams = {
  q?: string
  page?: number
  size?: number
  id?: number
  id__neq?: number
  nombre__ilike?: string
  baja?: boolean
  order_by?: string
}

const DEFAULT_FILTERS: Omit<ListParams, "page" | "size"> = {
  baja: false,
  order_by: "-id",
}

type FormErrors = Partial<Record<"nombre", string>>
type Touched = Partial<Record<keyof FormErrors | "baja", boolean>>

export default function CartaPage() {
  // tabla
  const [cartas, setCartas] = useState<Carta[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(PAGE_SIZE)
  const [total, setTotal] = useState<number>(0)
  const [pages, setPages] = useState<number | undefined>(undefined)
  const [filters, setFilters] = useState<Omit<ListParams, "page" | "size">>(DEFAULT_FILTERS)

  // dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedCarta, setSelectedCarta] = useState<Carta | null>(null)
  const [cartaToDelete, setCartaToDelete] = useState<number | null>(null)

  // form
  const [formData, setFormData] = useState<Omit<Carta, "id">>({
    nombre: "",
    baja: false,
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Touched>({})
  const isFormValid = useMemo(() => Object.keys(formErrors).length === 0, [formErrors])
  const markTouched = (k: keyof Touched) => setTouched(t => ({ ...t, [k]: true }))
  const errorClass = "border-red-500 focus-visible:ring-red-500"

  // ───────────────────────────────
  // CARGA DE DATOS
  // ───────────────────────────────
  const loadPage = useCallback(
    async (p: number, s = size) => {
      setLoading(true)
      try {
        const { items, total, page, pages, size } = await cartaService.list({ page: p, size: s, ...filters })
        setCartas(items ?? [])
        setTotal(total ?? 0)
        setPage(page ?? p)
        setPages(pages)
        setSize(size ?? s)
      } catch (e) {
        console.error("Error cargando cartas:", e)
        toast.error("No se pudieron cargar cartas", { description: extractApiErrorMessage(e) })
      } finally {
        setLoading(false)
      }
    },
    [filters, size]
  )

  useEffect(() => {
    loadPage(1, PAGE_SIZE)
  }, [loadPage])

  // ───────────────────────────────
  // VALIDACIÓN
  // ───────────────────────────────
  const validate = (data = formData): FormErrors => {
    const errors: FormErrors = {}
    if (!data.nombre?.trim()) errors.nombre = "El nombre es obligatorio"
    return errors
  }

  useEffect(() => {
    setFormErrors(validate(formData))
  }, [formData])

  // ───────────────────────────────
  // HANDLERS
  // ───────────────────────────────
  const handleOpenDialog = (carta?: Carta) => {
    if (carta) {
      setSelectedCarta(carta)
      setFormData({
        nombre: carta.nombre ?? "",
        baja: Boolean(carta.baja),
      })
    } else {
      setSelectedCarta(null)
      setFormData({
        nombre: "",
        baja: false,
      })
    }
    setTouched({})
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    setTouched({ nombre: true })
    const errs = validate(formData)
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast.error("Revisá los errores del formulario")
      return
    }

    try {
      setSaving(true)
      if (selectedCarta) {
        const updated = await cartaService.update(selectedCarta.id, {
          nombre: formData.nombre.trim(),
          baja: Boolean(formData.baja),
        })
        setCartas(prev => prev.map(c => (c.id === selectedCarta.id ? updated : c)))
        toast.success("Carta actualizada", { description: `#${updated?.id ?? selectedCarta.id}` })
      } else {
        const created = await cartaService.create({
          nombre: formData.nombre.trim(),
          baja: Boolean(formData.baja),
        })
        // recargo página 1 para mantener orden por -id
        await loadPage(1, size)
        toast.success("Carta creada", { description: `#${created?.id ?? "?"}` })
      }
      setIsDialogOpen(false)
    } catch (e) {
      console.error("Error guardando carta:", e)
      toast.error("No se pudo guardar", { description: extractApiErrorMessage(e) })
    } finally {
      setSaving(false)
    }
  }

  const openDeleteDialog = (id: number) => {
    setCartaToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!cartaToDelete) return
    try {
      await cartaService.remove(cartaToDelete)
      setCartas(prev => prev.filter(c => c.id !== cartaToDelete))
      toast.success("Carta eliminada")
    } catch (e) {
      console.error("Error eliminando carta:", e)
      toast.error("No se pudo eliminar", { description: extractApiErrorMessage(e) })
    } finally {
      setIsDeleteDialogOpen(false)
      setCartaToDelete(null)
    }
  }

  // ───────────────────────────────
  // RENDER
  // ───────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Cartas</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? "Cargando..." : "Administra las cartas disponibles"}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Carta
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedCarta ? "Modificar Carta" : "Nueva Carta"}</DialogTitle>
              <DialogDescription>
                {selectedCarta ? "Modificá los datos de la carta" : "Completá los datos de la nueva carta"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  onBlur={() => markTouched("nombre")}
                  className={touched.nombre && formErrors.nombre ? errorClass : ""}
                />
                {touched.nombre && formErrors.nombre && (
                  <p className="text-sm text-red-600">{formErrors.nombre}</p>
                )}
              </div>

            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !isFormValid}>
                {selectedCarta ? "Guardar Cambios" : "Crear Carta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="rounded-md border p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          {/* ID */}
          <div className="grid gap-2">
            <Label htmlFor="id">ID</Label>
            <Input
              id="id"
              type="number"
              placeholder="= ID"
              value={filters.id ?? ""}
              onChange={(e) => setFilters(f => ({ ...f, id: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>

          {/* ID ≠ */}
          <div className="grid gap-2">
            <Label htmlFor="id_neq">ID ≠</Label>
            <Input
              id="id_neq"
              type="number"
              placeholder="≠ ID"
              value={filters.id__neq ?? ""}
              onChange={(e) => setFilters(f => ({ ...f, id__neq: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>

          {/* nombre__ilike */}
          <div className="grid gap-2">
            <Label htmlFor="nombre__ilike">Nombre ~</Label>
            <Input
              id="nombre__ilike"
              placeholder="Contiene…"
              value={filters.nombre__ilike ?? ""}
              onChange={(e) => setFilters(f => ({ ...f, nombre__ilike: e.target.value || undefined }))}
            />
          </div>

          {/* Estado */}
          <div className="grid gap-2">
            <Label>Estado</Label>
            <Select
              value={filters.baja === undefined ? "all" : (filters.baja ? "baja" : "activos")}
              onValueChange={(v) => {
                if (v === "all") return setFilters(f => ({ ...f, baja: undefined }))
                if (v === "baja") return setFilters(f => ({ ...f, baja: true }))
                setFilters(f => ({ ...f, baja: false }))
              }}
            >
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Filtrar por</SelectLabel>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="activos">Activas</SelectItem>
                  <SelectItem value="baja">Inactivas</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* order_by */}
          <div className="grid gap-2">
            <Label>Ordenar por</Label>
            <Select
              value={filters.order_by ?? "-id"}
              onValueChange={(v) => setFilters(f => ({ ...f, order_by: v || undefined }))}
            >
              <SelectTrigger><SelectValue placeholder="Orden" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Campo (± asc/desc)</SelectLabel>
                  {["-created_at","created_at","-id","id","-nombre","nombre"].map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          <Button onClick={() => loadPage(1, size)} disabled={loading}>
            Aplicar filtros
          </Button>
          <Button
            variant="outline"
            onClick={() => { setFilters(DEFAULT_FILTERS); loadPage(1, size) }}
            disabled={loading}
          >
            Limpiar
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cartas.map((carta) => (
              <TableRow key={carta.id}>
                <TableCell className="font-medium">{carta.id}</TableCell>
                <TableCell>{carta.nombre}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      carta.baja
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    }`}
                  >
                    {carta.baja ? "Inactiva" : "Activa"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(carta)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(carta.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {!loading && cartas.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No hay cartas cargadas.
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
            const start = total === 0 ? 0 : (page - 1) * size + 1
            const end = Math.min(page * size, total ?? 0)
            return `Mostrando ${start}–${end} de ${total ?? 0}`
          })()}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filas por página</span>
          <Select
            value={String(size)}
            onValueChange={(v) => {
              const newSize = Number(v)
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

        {(() => {
          const totalPages = pages ?? Math.max(1, Math.ceil((total ?? 0) / (size || 1)))
          const getVisiblePages = (current: number, total: number) => {
            const res: (number | "ellipsis")[] = []
            const push = (v: number | "ellipsis") => res.push(v)
            if (total <= 7) { for (let i = 1; i <= total; i++) push(i); return res }
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

      {/* Confirmación de borrado */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La carta será eliminada permanentemente del sistema.
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
