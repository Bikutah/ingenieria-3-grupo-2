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

// servicios
import { sectoresService } from "@/services/sectores/api/SectoresService"
import type { Sectores } from "@/services/sectores/types/Sectores"

// combobox (shadcn/ui)
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { ChevronsUpDown, Check } from "lucide-react"

import type { Mesas as DomainMesas } from "@/services/mesas/types/Mesas"
// si tu servicio exporta como "mozoService" renombralo acá:
import { mesasService as mesasService } from "@/services/mesas/api/MesasService"

type Mesas = DomainMesas

const PAGE_SIZE = 50

// --- Tipado de filtros compatibles con MesasFilter ---
type MesasListParams = {
  q?: string
  page?: number
  size?: number

  id?: number
  id__neq?: number
  numero__ilike?: string
  tipo__ilike?: string
  cantidad__gte?: number
  cantidad__lte?: number
  id_sector?: number
  baja?: boolean
  created_at__gte?: string
  created_at__lte?: string
  order_by?: string // UI usa una, el servicio la convierte a string[]
}

const DEFAULT_FILTERS: Omit<MesasListParams, "page" | "size"> = {
  baja: false,
  order_by: "-id",
}

export default function MesasPage() {
  const [mesas, setMesas] = useState<Mesas[]>([])
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(PAGE_SIZE)
  const [total, setTotal] = useState<number>(0)
  const [pages, setPages] = useState<number | undefined>(undefined)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMesa, setSelectedMesa] = useState<Mesas | null>(null)
  const [mesaToDelete, setMesaToDelete] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form Mesas (usa strings tal como tu tipo)
  const [formData, setFormData] = useState<Omit<Mesas, "id">>({
    numero: "",
    tipo: "",
    cantidad: "",
    id_sector: "",
    baja: "false",
  })

  const [filters, setFilters] = useState<Omit<MesasListParams, "page" | "size">>(DEFAULT_FILTERS)

  const normalizeOrderBy = (v?: string): string[] | undefined => (v ? [v] : undefined)

  const loadPage = useCallback(
    async (p: number, s = size) => {
      setLoading(true)
      try {
        const { items, total, page: cur, pages, size: sz } = await mesasService.list({
          page: p,
          size: s,
          ...filters,
          order_by: normalizeOrderBy(filters.order_by),
        } as any) // el servicio tipa order_by como string[], acá lo adaptamos
        setMesas(items)
        setTotal(total ?? 0)
        setPage(cur ?? p)
        setPages(pages)
        setSize(sz ?? s)
      } catch (e) {
        console.error("Error cargando mesas:", e)
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
        const data = await mesasService.list({
          page: 1,
          size: PAGE_SIZE,
          ...filters,
          order_by: normalizeOrderBy(filters.order_by),
        } as any)
        if (!mounted) return
        setMesas(data.items)
        setTotal(data.total ?? 0)
        setPage(data.page ?? 1)
        setPages(data.pages)
        setSize(data.size ?? PAGE_SIZE)
      } catch (e) {
        console.error("Error cargando mesas:", e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenDialog = (mesa?: Mesas) => {
    if (mesa) {
      setSelectedMesa(mesa)
      setFormData({
        numero: mesa.numero ?? "",
        tipo: mesa.tipo ?? "",
        cantidad: mesa.cantidad ?? "",
        id_sector: mesa.id_sector ?? "",
        baja: mesa.baja ?? "false",
      })
    } else {
      setSelectedMesa(null)
      setFormData({
        numero: "",
        tipo: "",
        cantidad: "",
        id_sector: "",
        baja: "false",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (selectedMesa) {
        const updated = await mesasService.update(selectedMesa.id, formData)
        setMesas((prev) => prev.map((m) => (m.id === selectedMesa.id ? updated : m)))
      } else {
        const created = await mesasService.create(formData)
        setMesas((prev) => [...prev, created])
      }
      setIsDialogOpen(false)
    } catch (e) {
      console.error("Error guardando mesa:", e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!mesaToDelete) return
    try {
      await mesasService.remove(mesaToDelete)
      setMesas((prev) => prev.filter((m) => m.id !== mesaToDelete))
      setIsDeleteDialogOpen(false)
      setMesaToDelete(null)
    } catch (e) {
      console.error("Error eliminando mesa:", e)
    }
  }

  const openDeleteDialog = (id: number) => {
    setMesaToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const parseBoolString = (v?: string) =>
    typeof v === "string" && ["true", "1", "t"].includes(v.toLowerCase())

  // --- Sectores combobox state ---
  const [sectores, setSectores] = useState<Sectores[]>([])
  const [sectoresLoading, setSectoresLoading] = useState(false)
  const [sectorOpen, setSectorOpen] = useState(false)
  const [sectorQuery, setSectorQuery] = useState("")

  // etiqueta amigable: "Salon principal (#12)"
  const sectorLabel = (s: Sectores) => `#${s.id} - ${s.numero} · ${s.nombre}`

  // carga sectores activos (con búsqueda opcional)
  const loadSectores = useCallback(
    async (q?: string) => {
      setSectoresLoading(true)
      try {
        // prioridad: usar q si tu backend lo soporta globalmente, sino nombre__ilike
        const params: any = { baja: false, page: 1, size: 50 }
        if (q && q.trim()) {
          // si tu API soporta q:
          params.q = q.trim()
          // si NO soporta q y querés buscar por nombre, comentá la línea de q y descomentá esta:
          // params.nombre__ilike = `%${q.trim()}%`
        }
        const res = await sectoresService.list(params)
        setSectores(res.items)
      } catch (e) {
        console.error("Error cargando sectores:", e)
        setSectores([])
      } finally {
        setSectoresLoading(false)
      }
    },
    []
  )

  // Debounce simple para sectorQuery
  useEffect(() => {
    const t = setTimeout(() => {
      // cuando se abre el popover, actualizamos resultados con el query
      if (sectorOpen) loadSectores(sectorQuery)
    }, 300)
    return () => clearTimeout(t)
  }, [sectorQuery, sectorOpen, loadSectores])

  // Cargar sectores al abrir el diálogo (modo alta/modif)
  useEffect(() => {
    if (isDialogOpen) {
      // precarga inicial (sin query)
      loadSectores()
    }
  }, [isDialogOpen, loadSectores])


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Mesas</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? "Cargando..." : "Administra las mesas del restaurante"}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Mesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedMesa ? "Modificar Mesa" : "Nueva Mesa"}</DialogTitle>
              <DialogDescription>
                {selectedMesa ? "Modifica los datos de la mesa" : "Completa los datos de la nueva mesa"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Input
                  id="tipo"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cantidad">Cantidad de sillas</Label>
                <Input
                  id="cantidad"
                  type="number"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Sector (activo)</Label>
                <Popover open={sectorOpen} onOpenChange={setSectorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={sectorOpen}
                      className="w-full justify-between"
                    >
                      {(() => {
                        const selected = sectores.find(s => String(s.id) === String(formData.id_sector))
                        return selected ? sectorLabel(selected) : "Seleccioná un sector…"
                      })()}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Buscar sector por nombre o número…"
                        value={sectorQuery}
                        onValueChange={setSectorQuery}
                      />
                      <CommandList>
                        {sectoresLoading ? (
                          <div className="p-3 text-sm text-muted-foreground">Cargando…</div>
                        ) : (
                          <>
                            <CommandEmpty>No se encontraron sectores</CommandEmpty>
                            <CommandGroup heading="Resultados">
                              {sectores.map((s) => {
                                const selected = String(formData.id_sector) === String(s.id)
                                return (
                                  <CommandItem
                                    key={s.id}
                                    value={sectorLabel(s)}
                                    onSelect={() => {
                                      setFormData({ ...formData, id_sector: String(s.id) })
                                      setSectorOpen(false)
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                    {sectorLabel(s)}
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* hint del id seleccionado (útil si el backend espera string numérico) */}
                {formData.id_sector && (
                  <p className="text-xs text-muted-foreground">
                    ID seleccionado: {formData.id_sector}
                  </p>
                )}
              </div>

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {selectedMesa ? "Guardar Cambios" : "Crear Mesa"}
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

          {/* numero__ilike */}
          <div className="grid gap-2">
            <Label htmlFor="numero__ilike">Número ~</Label>
            <Input
              id="numero__ilike"
              placeholder="Contiene..."
              value={filters.numero__ilike ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, numero__ilike: e.target.value || undefined }))}
            />
          </div>

          {/* tipo__ilike */}
          <div className="grid gap-2">
            <Label htmlFor="tipo__ilike">Tipo ~</Label>
            <Input
              id="tipo__ilike"
              placeholder="Contiene..."
              value={filters.tipo__ilike ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, tipo__ilike: e.target.value || undefined }))}
            />
          </div>

          {/* cantidad__gte */}
          <div className="grid gap-2">
            <Label htmlFor="cantidad__gte">Sillas ≥</Label>
            <Input
              id="cantidad__gte"
              type="number"
              value={filters.cantidad__gte ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, cantidad__gte: e.target.value ? Number(e.target.value) : undefined }))
              }
            />
          </div>

          {/* cantidad__lte */}
          <div className="grid gap-2">
            <Label htmlFor="cantidad__lte">Sillas ≤</Label>
            <Input
              id="cantidad__lte"
              type="number"
              value={filters.cantidad__lte ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, cantidad__lte: e.target.value ? Number(e.target.value) : undefined }))
              }
            />
          </div>

          {/* id_sector */}
          <div className="grid gap-2">
            <Label htmlFor="id_sector_f">Sector (ID)</Label>
            <Input
              id="id_sector_f"
              type="number"
              value={filters.id_sector ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, id_sector: e.target.value ? Number(e.target.value) : undefined }))
              }
            />
          </div>

          {/* baja */}
          <div className="grid gap-2">
            <Label>Estado</Label>
            <Select
              value={filters.baja === undefined ? "all" : filters.baja ? "baja" : "activa"}
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
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="activa">Activas</SelectItem>
                  <SelectItem value="baja">Dadas de baja</SelectItem>
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
                    "-numero", "numero",
                    "-tipo", "tipo",
                    "-cantidad", "cantidad",
                    "-id_sector", "id_sector",
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
              <TableHead>Número</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Sillas</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mesas.map((mesa) => {
              const isBaja = parseBoolString(mesa.baja)
              return (
                <TableRow key={mesa.id}>
                  <TableCell className="font-medium">{mesa.id}</TableCell>
                  <TableCell>{mesa.numero}</TableCell>
                  <TableCell>{mesa.tipo}</TableCell>
                  <TableCell>{mesa.cantidad}</TableCell>
                  <TableCell>{mesa.id_sector}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        isBaja
                          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                          : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      }`}
                    >
                      {isBaja ? "Baja" : "Activa"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(mesa)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(mesa.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {!loading && mesas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay mesas cargadas.
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
              Esta acción no se puede deshacer. La mesa será eliminada permanentemente del sistema.
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
