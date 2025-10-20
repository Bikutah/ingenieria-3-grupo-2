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
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { Plus, Pencil, Trash2 } from "lucide-react"

import type { Producto as DomainProducto } from "@/services/producto/types/Producto"
import { productoService } from "@/services/producto/api/ProductoService"

// Alias para no chocar nombres
type Producto = DomainProducto
const PAGE_SIZE = 50;


export default function ProductoPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<number | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [productoToDelete, setProductoToDelete] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<Omit<Producto, "id">>({
    nombre: "",
    precio: "",
    descripcion: "",
    cm3: "",
    activo: true,
  })
  
  type ListParams = {
  q?: string
  page?: number
  size?: number
  id?: number
  id__neq?: number
  nombre__ilike?: string
  nombre__ilike?: string
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
  
  const [filters, setFilters] = useState<Omit<ListParams, "page" | "size">>(DEFAULT_FILTERS)
  
  const loadPage = useCallback(
    async (p: number, s = size) => {
      setLoading(true);
      try {
        const { items, total, page, pages, size } = await productoService.list({ page: p, size: s, ...filters });
        setProductos(items);
        setTotal(total ?? 0);
        setPage(page ?? p);
        setPages(pages);
        setSize(size ?? s);
      } catch (e) {
        console.error("Error cargando productos:", e);
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
        const data = await productoService.list({ page: 1, size: PAGE_SIZE, ...filters });
        console.log("Respuesta del servicio:", data);
        if (!mounted) return;
        setProductos(data.items);
        setTotal(data.total ?? 0);
        setPage(data.page ?? 1);
        setPages(data.pages);
        setSize(data.size ?? PAGE_SIZE);
      } catch (e) {
        console.error("Error cargando productos:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // solo al montar: no pongas filters para no recargar en cada cambio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleOpenDialog = (producto?: Producto) => {
    if (producto) {
      setSelectedProducto(producto)
      setFormData({
		tipo : producto.tipo,
        nombre: producto.nombre,
        precio: producto.precio,
        descripcion: producto.descripcion,
        cm3 : producto.cm3,
        activo: producto.activo,
      })
    } else {
      setSelectedProducto(null)
      setFormData({
        nombre: "",
        precio: "",
        descripcion: "",
        cm3: "",
        activo: true,
      })
    }
    setIsDialogOpen(true)
  }
  
  const handleSave = async () => {
    try {
      setSaving(true)
      if (selectedProducto) {
        const updated = await productoService.update(selectedProducto.id, formData)
        setProducto(prev => prev.map(m => (m.id === selectedProducto.id ? updated : m)))
      } else {
        const created = await productoService.create(formData)
        setProductos(prev => [...prev, created])
      }
      setIsDialogOpen(false)
    } catch (e) {
      console.error("Error guardando producto:", e)
    } finally {
      setSaving(false)
    }
  }
  
  const handleDelete = async () => {
    if (!productoToDelete) return
    try {
      await productoService.remove(productoToDelete)
      setProductos(prev => prev.filter(m => m.id !== productoToDelete))
      setIsDeleteDialogOpen(false)
      setProductoToDelete(null)
    } catch (e) {
      console.error("Error eliminando producto:", e)
    }
  }

  const openDeleteDialog = (id: number) => {
    setProductoToDelete(id)
    setIsDeleteDialogOpen(true)
  }

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
					{selectedProducto ? "Modifica los datos del producto" : "Completa los datos del nuevo producto"}
				  </DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
					  <Label htmlFor="tipo">Tipo de producto</Label>
					  <DropdownMenu>
						<DropdownMenuTrigger asChild>
						  <Button variant="outline">
							{formData.tipo ? formData.tipo : "Seleccionar tipo"}
						  </Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
						  <DropdownMenuItem onClick={() => setFormData({ ...formData, tipo: "plato" })}>
							Plato
						  </DropdownMenuItem>
						  <DropdownMenuItem onClick={() => setFormData({ ...formData, tipo: "postre" })}>
							Postre
						  </DropdownMenuItem>
						  <DropdownMenuItem onClick={() => setFormData({ ...formData, tipo: "bebida" })}>
							Bebida
						  </DropdownMenuItem>
						</DropdownMenuContent>
					  </DropdownMenu>
					</div>
				  <div className="grid gap-2">
					<Label htmlFor="nombre">Nombre</Label>
					<Input
					  id="nombre"
					  value={formData.nombre}
					  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
					/>
				  </div>
				  <div className="grid gap-2">
					<Label htmlFor="precio">Precio</Label>
					<Input
					  id="precio"
					  value={formData.precio}
					  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
					/>
				  </div>
				  <div className="grid gap-2">
					<Label htmlFor="descripcion">Descripcion</Label>
					<Input
					  id="descripcion"
					  value={formData.descripcion}
					  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
					/>
				  {formData.tipo === "Bebida" && (
					  <div className="grid gap-2">
						<Label htmlFor="cm3">cm3</Label>
						<Input
						  id="cm3"
						  type="number"
						  value={formData.cm3}
						  onChange={(e) => setFormData({ ...formData, cm3: e.target.value })}
						/>
					  </div>
					)}
				</div>
			</div>
				<DialogFooter>
				  <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
					Cancelar
				  </Button>
				  <Button onClick={handleSave} disabled={saving}>
					{selectedProducto ? "Guardar Cambios" : "Crear Producto"}
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
						"-precio","precio",
						"-nombre","nombre",
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
				  <TableHead>Tipo</TableHead>
				  <TableHead>Nombre</TableHead>
				  <TableHead>Precio</TableHead>
				  <TableHead>Descripcion</TableHead>
				  <TableHead className="text-right">Acciones</TableHead>
				</TableRow>
			  </TableHeader>
			  <TableBody>
				{productos.map((producto) => (
				  <TableRow key={producto.id}>
					<TableCell className="font-medium">{producto.id}</TableCell>
					<TableCell>{producto.tipo}</TableCell>
					<TableCell>{producto.nombre}</TableCell>
					<TableCell>{producto.precio}</TableCell>
					<TableCell>{producto.descripcion}</TableCell>
					<TableCell>
					  <span
						className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
						  producto.activo
							? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" 
							: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
						}`}
					  >
						{producto.activo ? "Inactivo" : "Activo"}
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
