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

import type { Sectores as DomainSector } from "@/services/sectores/types/Sectores"
import { sectoresService } from "@/services/sectores/api/SectoresService"

type Sector = DomainSector
const PAGE_SIZE = 50

// Filtros compatibles con tu backend (SectoresFilter)
type SectoresListParamsUI = {
  q?: string
  page?: number
  size?: number

  id?: number
  id__neq?: number
  nombre__ilike?: string
  numero__ilike?: string
  baja?: boolean
  created_at__gte?: string
  created_at__lte?: string

  // En el UI usamos una sola opción y la convierto a string[]
  order_by?: string
}

const DEFAULT_FILTERS: Omit<SectoresListParamsUI, "page" | "size"> = {
  baja: false,
  order_by: "-id",
}

export default function SectoresPage() {
  const [sectores, setSectores] = useState<Sector[]>([])
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(PAGE_SIZE)
  const [total, setTotal] = useState<number>(0)
  const [pages, setPages] = useState<number | undefined>(undefined)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null)
  const [sectorToDelete, setSectorToDelete] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form de Sector (usa tu tipo: nombre, numero, baja:boolean)
  const [formData, setFormData] = useState<Omit<Sector, "id">>({
    nombre: "",
    numero: "",
    baja: false,
  })

  const [filters, setFilters] = useState<Omit<SectoresListParamsUI, "page" | "size">>(DEFAULT_FILTERS)

  const normalizeOrderBy = (v?: string): string[] | undefined => (v ? [v] : undefined)

  const loadPage = useCallback(
    async (p: number, s = size) => {
      setLoading(true)
      try {
        const { items, total, page: cur, pages, size: sz } = await sectoresService.list({
          page: p,
          size: s,
          id: filters.id,
          id__neq: filters.id__neq,
          nombre__ilike: filters.nombre__ilike,
          numero__ilike: filters.numero__ilike,
          baja: filters.baja,
          created_at__gte: filters.created_at__gte,
          created_at__lte: filters.created_at__lte,
          order_by: normalizeOrderBy(filters.order_by),
        })
        setSectores(items)
        setTotal(total ?? 0)
        setPage(cur ?? p)
        setPages(pages)
        setSize(sz ?? s)
      } catch (e) {
        console.error("Error cargando sectores:", e)
      } finally {
        setLoading(false)
      }
    },
    [size, filters]
  )

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await sectoresService.list({
          page: 1,
          size: PAGE_SIZE,
          id: filters.id,
          id__neq: filters.id__neq,
          nombre__ilike: filters.nombre__ilike,
          numero__ilike: filters.numero__ilike,
          baja: filters.baja,
          created_at__gte: filters.created_at__gte,
          created_at__lte: filters.created_at__lte,
          order_by: normalizeOrderBy(filters.order_by),
        })
        if (!mounted) return
        setSectores(data.items)
        setTotal(data.total ?? 0)
        setPage(data.page ?? 1)
        setPages(data.pages)
        setSize(data.size ?? PAGE_SIZE)
      } catch (e) {
        console.error("Error cargando sectores:", e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenDialog = (sector?: Sector) => {
    if (sector) {
      setSelectedSector(sector)
      setFormData({
        nombre: sector.nombre ?? "",
        numero: sector.numero ?? "",
        baja: sector.baja ?? false,
      })
    } else {
      setSelectedSector(null)
      setFormData({
        nombre: "",
        numero: "",
        baja: false,
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (selectedSector) {
        const updated = await sectoresService.update(selectedSector.id, formData)
        setSectores((prev) => prev.map((s) => (s.id === selectedSector.id ? updated : s)))
      } else {
        const created = await sectoresService.create(formData)
        setSectores((prev) => [...prev, created])
      }
      setIsDialogOpen(false)
    } catch (e) {
      console.error("Error guardando sector:", e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!sectorToDelete) return
    try {
      await sectoresService.remove(sectorToDelete)
      setSectores((prev) => prev.filter((s) => s.id !== sectorToDelete))
      setIsDeleteDialogOpen(false)
      setSectorToDelete(null)
    } catch (e) {
      console.error("Error eliminando sector:", e)
    }
  }

  const openDeleteDialog = (id: number) => {
    setSectorToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Sectores</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? "Cargando..." : "Administra los sectores del restaurante"}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Sector
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedSector ? "Modificar Sector" : "Nuevo Sector"}</DialogTitle>
              <DialogDescription>
                {selectedSector ? "Modifica los datos del sector" : "Completa los datos del nuevo sector"}
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
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {selectedSector ? "Guardar Cambios" : "Crear Sector"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="rounded-md border p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          {/* id */}
          <div className="grid gap-2">
            <Label htmlFor="id">ID</Label>
            <Input
              id="id"
              type="number"
              value={filters.id ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, id: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>

          {/* id__neq */}
          <div className="grid gap-2">
            <Label htmlFor="id_neq">ID ≠</Label>
            <Input
              id="id_neq"
              type="number"
              value={filters.id__neq ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, id__neq: e.target.value ? Number(e.target.value) : undefined }))
              }
            />
          </div>

          {/* nombre__ilike */}
          <div className="grid gap-2">
            <Label htmlFor="nombre_ilike">Nombre ~</Label>
            <Input
              id="nombre_ilike"
              placeholder="Contiene..."
              value={filters.nombre__ilike ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, nombre__ilike: e.target.value || undefined }))}
            />
          </div>

          {/* numero__ilike */}
          <div className="grid gap-2">
            <Label htmlFor="numero_ilike">Número ~</Label>
            <Input
              id="numero_ilike"
              placeholder="Contiene..."
              value={filters.numero__ilike ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, numero__ilike: e.target.value || undefined }))}
            />
          </div>

          {/* baja */}
          <div className="grid gap-2">
            <Label>Estado</Label>
            <Select
              value={filters.baja === undefined ? "all" : filters.baja ? "baja" : "activos"}
              onValueChange={(v) => {
                if (v === "all") return setFilters((f) => ({ ...f, baja: undefined }))
                if (v === "baja") return setFilters((f) => ({ ...f, baja: true }))
                return setFilters((f) => ({ ...f, baja: false }))
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
                    "-nombre", "nombre",
                    "-numero", "numero",
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
          <Button onClick={() => loadPage(1, size)} disabled={loading}>
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

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sectores.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.id}</TableCell>
                <TableCell>{s.nombre}</TableCell>
                <TableCell>{s.numero}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      s.baja
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    }`}
                  >
                    {s.baja ? "Baja" : "Activo"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && sectores.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No hay sectores cargados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer de paginación */}
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
                  )
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
              Esta acción no se puede deshacer. El sector será eliminado permanentemente del sistema.
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
