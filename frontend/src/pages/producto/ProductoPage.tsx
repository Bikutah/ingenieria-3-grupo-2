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
import { Plus, Pencil, Trash2, ChevronsUpDown, Check } from "lucide-react"
import { toast } from "sonner"
import { extractApiErrorMessage } from "@/lib/api-error"

import type { Producto as DomainProducto } from "@/services/producto/types/Producto"
import type { Carta as DomainCarta } from "@/services/carta/types/Carta"
import { productoService } from "@/services/producto/api/ProductoService"
import { cartaService } from "@/services/carta/api/CartaService"

// Combobox shadcn
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

type Producto = DomainProducto
type Carta = DomainCarta

const PAGE_SIZE = 50
const isBebida = (t?: string) => t?.toLowerCase() === "bebida"

type ListParams = {
  q?: string
  page?: number
  size?: number
  id?: number
  id__neq?: number
  precio__ilike?: number
  descripcion__ilike?: string
  cm3__ilike?: number
  baja?: boolean
  order_by?: string
}

const DEFAULT_FILTERS: Omit<ListParams, "page" | "size"> = {
  baja: false,
  order_by: "-id",
}

type FormErrors = Partial<Record<"tipo"|"nombre"|"precio"|"id_carta"|"cm3", string>>
type Touched = Partial<Record<keyof FormErrors, boolean>>

export default function ProductoPage() {
  // tabla
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(PAGE_SIZE)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState<number|undefined>(undefined)
  const [filters, setFilters] = useState<Omit<ListParams, "page" | "size">>(DEFAULT_FILTERS)

  // cartas (combobox con buscador)
  const [cartas, setCartas] = useState<Carta[]>([])
  const [cartasLoading, setCartasLoading] = useState(false)
  const [cartaOpen, setCartaOpen] = useState(false)
  const [cartaQuery, setCartaQuery] = useState("")

  // dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [productoToDelete, setProductoToDelete] = useState<number | null>(null)

  // form
  const [formData, setFormData] = useState<Omit<Producto,"id">>({
    tipo: "",
    nombre: "",
    precio: 0,
    descripcion: "",
    cm3: undefined,
    baja: false,
    id_carta: 0,
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Touched>({})
  const isFormValid = useMemo(() => Object.keys(formErrors).length === 0, [formErrors])
  const markTouched = (k: keyof Touched) => setTouched(t => ({ ...t, [k]: true }))
  const errorClass = "border-red-500 focus-visible:ring-red-500"

  // ───────────────────────────────
  // CARGA DE DATOS
  // ───────────────────────────────
  const loadCartas = useCallback(async (q?: string) => {
    setCartasLoading(true)
    try {
      const params: any = { page: 1, size: 50, baja: false }
      if (q && q.trim()) params.q = q.trim()
      const res = await cartaService.list(params)
      setCartas(res.items ?? [])
      if (!res.items?.length && !q) {
        toast.message("No hay cartas", { description: "Creá una carta para poder asignarla al producto." })
      }
    } catch (e) {
      console.error("Error cargando cartas:", e)
      toast.error("No se pudieron cargar cartas", { description: extractApiErrorMessage(e) })
      setCartas([])
    } finally {
      setCartasLoading(false)
    }
  }, [])

  const loadPage = useCallback(async (p: number, s = size) => {
    setLoading(true)
    try {
      const { items, total, page, pages, size } = await productoService.list({ page: p, size: s, ...filters })
      setProductos(items ?? [])
      setTotal(total ?? 0)
      setPage(page ?? p)
      setPages(pages)
      setSize(size ?? s)
    } catch (e) {
      console.error("Error cargando productos:", e)
      toast.error("No se pudieron cargar productos", { description: extractApiErrorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [filters, size])

  useEffect(() => {
    loadPage(1, PAGE_SIZE)
    // precarga de cartas para pintar nombres en la tabla
    loadCartas()
  }, [loadPage, loadCartas])

  // Debounce para búsqueda de cartas
  useEffect(() => {
    const t = setTimeout(() => {
      if (cartaOpen) loadCartas(cartaQuery)
    }, 300)
    return () => clearTimeout(t)
  }, [cartaOpen, cartaQuery, loadCartas])

  // ───────────────────────────────
  // VALIDACIÓN DE FORM
  // ───────────────────────────────
  const validate = (data = formData): FormErrors => {
    const errors: FormErrors = {}

    if (!data.tipo) errors.tipo = "Seleccioná un tipo"
    if (!data.nombre?.trim()) errors.nombre = "El nombre es obligatorio"

    if (data.precio == null || isNaN(Number(data.precio))) {
      errors.precio = "Precio numérico requerido"
    } else if (Number(data.precio) <= 0) {
      errors.precio = "El precio debe ser mayor a 0"
    }

    if (!data.id_carta || data.id_carta <= 0) {
      errors.id_carta = "Seleccioná una carta"
    }

    if (isBebida(data.tipo)) {
      const v = data.cm3 ?? 0
      if (v <= 0) errors.cm3 = "Ingresá cm³ > 0"
      if (v && (v < 50 || v > 5000)) errors.cm3 = "cm³ fuera de rango (50–5000)"
    }

    return errors
  }

  useEffect(() => {
    setFormErrors(validate(formData))
  }, [formData])

  // ───────────────────────────────
  // HANDLERS
  // ───────────────────────────────
  const handleOpenDialog = (producto?: Producto) => {
    if (producto) {
      setSelectedProducto(producto)
      setFormData({
        tipo: producto.tipo ?? "",
        nombre: producto.nombre ?? "",
        precio: Number(producto.precio ?? 0),
        descripcion: producto.descripcion ?? "",
        cm3: isBebida(producto.tipo) ? producto.cm3 : undefined,
        baja: Boolean(producto.baja),
        id_carta: Number(producto.id_carta ?? 0),
      })
    } else {
      setSelectedProducto(null)
      setFormData({
        tipo: "",
        nombre: "",
        precio: 0,
        descripcion: "",
        cm3: undefined,
        baja: false,
        id_carta: 0,
      })
    }
    setTouched({})
    setIsDialogOpen(true)
    // cargar cartas cuando abro el diálogo por si no hay
    if (!cartas.length) loadCartas()
  }

  const handleSave = async () => {
    setTouched({ tipo: true, nombre: true, precio: true, id_carta: true, cm3: true })
    const errs = validate(formData)
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast.error("Revisá los errores del formulario")
      return
    }

    const payload: Omit<Producto,"id"> = {
      tipo: formData.tipo,
      nombre: formData.nombre.trim(),
      precio: Number(formData.precio),
      descripcion: formData.descripcion?.trim() || "",
      baja: Boolean(formData.baja),
      id_carta: Number(formData.id_carta),
      ...(isBebida(formData.tipo) && formData.cm3 ? { cm3: Number(formData.cm3) } : { cm3: undefined }),
    }

    try {
      setSaving(true)
      if (selectedProducto) {
        const updated = await productoService.update(selectedProducto.id, payload)
        setProductos(prev => prev.map(p => p.id === selectedProducto.id ? updated : p))
        toast.success("Producto actualizado", { description: `#${updated?.id ?? selectedProducto.id}` })
      } else {
        const created = await productoService.create(payload)
        await loadPage(1, size)
        toast.success("Producto creado", { description: `#${created?.id ?? "?"}` })
      }
      setIsDialogOpen(false)
    } catch (e) {
      console.error("Error guardando producto:", e)
      toast.error("No se pudo guardar", { description: extractApiErrorMessage(e) })
    } finally {
      setSaving(false)
    }
  }

  const openDeleteDialog = (id: number) => {
    setProductoToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!productoToDelete) return
    try {
      await productoService.remove(productoToDelete)
      setProductos(prev => prev.filter(p => p.id !== productoToDelete))
      toast.success("Producto eliminado")
    } catch (e) {
      console.error("Error eliminando producto:", e)
      toast.error("No se pudo eliminar", { description: extractApiErrorMessage(e) })
    } finally {
      setIsDeleteDialogOpen(false)
      setProductoToDelete(null)
    }
  }

  // helpers UI
  const cartaLabel = (c: Carta) => `#${c.id} · ${c.nombre}`

  // ───────────────────────────────
  // RENDER
  // ───────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Productos</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? "Cargando..." : "Administra los productos de tu restaurante"}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedProducto ? "Modificar Producto" : "Nuevo Producto"}</DialogTitle>
              <DialogDescription>
                {selectedProducto ? "Modificá los datos del producto" : "Completá los datos del nuevo producto"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {/* Tipo */}
              <div className="grid gap-1.5">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo || ""}
                  onValueChange={(v) => { setFormData(fd => ({ ...fd, tipo: v, cm3: isBebida(v) ? fd.cm3 : undefined })); markTouched("tipo") }}
                >
                  <SelectTrigger className={touched.tipo && formErrors.tipo ? errorClass : ""}>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Tipo de producto</SelectLabel>
                      <SelectItem value="plato">Plato</SelectItem>
                      <SelectItem value="postre">Postre</SelectItem>
                      <SelectItem value="bebida">Bebida</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {touched.tipo && formErrors.tipo && (
                  <p className="text-sm text-red-600">{formErrors.tipo}</p>
                )}
              </div>

              {/* Nombre */}
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

              {/* Precio */}
              <div className="grid gap-1.5">
                <Label htmlFor="precio">Precio</Label>
                <Input
                  id="precio"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: Number(e.target.value) })}
                  onBlur={() => markTouched("precio")}
                  className={touched.precio && formErrors.precio ? errorClass : ""}
                />
                {touched.precio && formErrors.precio && (
                  <p className="text-sm text-red-600">{formErrors.precio}</p>
                )}
              </div>

              {/* Descripción */}
              <div className="grid gap-1.5">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion ?? ""}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>

              {/* cm3 solo si bebida */}
              {isBebida(formData.tipo) && (
                <div className="grid gap-1.5">
                  <Label htmlFor="cm3">cm³</Label>
                  <Input
                    id="cm3"
                    type="number"
                    min={50}
                    max={5000}
                    placeholder="ej: 500"
                    value={formData.cm3 ?? ""}
                    onChange={(e) => setFormData({ ...formData, cm3: e.target.value ? Number(e.target.value) : undefined })}
                    onBlur={() => markTouched("cm3")}
                    className={touched.cm3 && formErrors.cm3 ? errorClass : ""}
                  />
                  {touched.cm3 && formErrors.cm3 && (
                    <p className="text-sm text-red-600">{formErrors.cm3}</p>
                  )}
                </div>
              )}

              {/* Carta (combobox con buscador) */}
              <div className="grid gap-1.5">
                <Label>Carta</Label>
                <Popover open={cartaOpen} onOpenChange={setCartaOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant={touched.id_carta && formErrors.id_carta ? "destructive" : "outline"}
                      role="combobox"
                      aria-expanded={cartaOpen}
                      aria-invalid={touched.id_carta && !!formErrors.id_carta}
                      className="w-full justify-between"
                      onBlur={() => markTouched("id_carta")}
                      disabled={cartasLoading && !cartaOpen}
                    >
                      {(() => {
                        const selected = cartas.find(c => String(c.id) === String(formData.id_carta))
                        return selected ? cartaLabel(selected) : (cartasLoading ? "Cargando cartas…" : "Seleccionar carta…")
                      })()}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Buscar carta por nombre…"
                        value={cartaQuery}
                        onValueChange={setCartaQuery}
                      />
                      <CommandList>
                        {cartasLoading ? (
                          <div className="p-3 text-sm text-muted-foreground">Cargando…</div>
                        ) : (
                          <>
                            <CommandEmpty>No se encontraron cartas</CommandEmpty>
                            <CommandGroup heading="Resultados">
                              {cartas.map((c) => {
                                const selected = String(formData.id_carta) === String(c.id)
                                return (
                                  <CommandItem
                                    key={c.id}
                                    value={String(c.id)}
                                    onSelect={() => {
                                      setFormData(fd => ({ ...fd, id_carta: Number(c.id) }))
                                      setTouched(t => ({ ...t, id_carta: true }))
                                      setCartaOpen(false)
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                    {cartaLabel(c)}
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
                {touched.id_carta && formErrors.id_carta && (
                  <p className="text-sm text-red-600">{formErrors.id_carta}</p>
                )}
                {formData.id_carta ? (
                  <p className="text-xs text-muted-foreground">ID seleccionado: {formData.id_carta}</p>
                ) : null}
              </div>

            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !isFormValid}>
                {selectedProducto ? "Guardar Cambios" : "Crear Producto"}
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
              onValueChange={(v) => setFilters(f => ({ ...f, order_by: v || undefined }))}
            >
              <SelectTrigger><SelectValue placeholder="Orden" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Campo (± asc/desc)</SelectLabel>
                  {["-created_at","created_at","-id","id","-precio","precio","-nombre","nombre"].map(opt => (
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
              <TableHead>Tipo</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Carta</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((producto) => (
              <TableRow key={producto.id}>
                <TableCell className="font-medium">{producto.id}</TableCell>
                <TableCell>{producto.tipo}</TableCell>
                <TableCell>{producto.nombre}</TableCell>
                <TableCell>${Number(producto.precio).toFixed(2)}</TableCell>
                <TableCell>{producto.descripcion}</TableCell>
                <TableCell>{cartas.find(c => c.id === (producto as any).id_carta)?.nombre ?? `#${(producto as any).id_carta}`}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      producto.baja
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    }`}
                  >
                    {producto.baja ? "Inactivo" : "Activo"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(producto)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(producto.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && productos.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No hay productos cargados.
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
              Esta acción no se puede deshacer. El producto será eliminado permanentemente del sistema.
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
