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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Plus, Trash2, Check, ChevronsUpDown, BadgeDollarSign } from "lucide-react"

import type { Comanda, EstadoComanda } from "@/services/comandas/types/Comanda"
import type { ComandasListParams } from "@/services/comandas/types/Comanda"
import type { DetalleComanda } from "@/services/comandas/types/DetalleComanda"
import { comandasService } from "@/services/comandas/api/ComandaService"

// Mesas
import { mesasService } from "@/services/mesas/api/MesasService"
import type { Mesas } from "@/services/mesas/types/Mesas"

// Mozos
import { mozoService } from "@/services/mozo/api/MozoService"
import type { Mozo } from "@/services/mozo/types/Mozo"

// Reservas
import { reservasService } from "@/services/reservas/api/ReservasService"
import type { Reserva } from "@/services/reservas/types/Reserva"

// Productos
import { productoService } from "@/services/producto/api/ProductoService"
import type { Producto } from "@/services/producto/types/Producto"

import { toast } from "sonner"
import { extractApiErrorMessage } from "@/lib/api-error"

// Facturación
import { facturacionService } from "@/services/facturacion/api/FacturacionService"
import { MEDIOS_PAGO, type MedioPago } from "@/services/facturacion/types/Factura"

const PAGE_SIZE = 50

type ComandaExtended = Comanda & {
  detalles_comanda?: DetalleComanda[]
}

const isPending = (c: Comanda) => c.estado === "pendiente"
const estadoBadge = (estado: EstadoComanda) => {
  switch (estado) {
    case "pendiente":
      return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
    case "pagada":
      return "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
    case "cancelada":
      return "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
    case "anulada":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300"
  }
}

export default function ComandasPage() {
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(PAGE_SIZE)
  const [total, setTotal] = useState<number>(0)
  const [pages, setPages] = useState<number | undefined>(undefined)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null)
  const [comandaToDelete, setComandaToDelete] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // medio de pago para facturación
  const [medioPago, setMedioPago] = useState<MedioPago | null>(null)

  const [formData, setFormData] = useState<Omit<ComandaExtended, "id">>({
    fecha: "",
    id_mesa: 0,
    id_mozo: 0,
    id_reserva: 0,
    estado: "pendiente",
    detalles_comanda: [],
  })

  const DEFAULT_FILTERS: Omit<ComandasListParams, "page" | "size"> = {
    q: "",
    order_by: ["-id"],
  }

  const [filters, setFilters] =
    useState<Omit<ComandasListParams, "page" | "size">>(DEFAULT_FILTERS)

  // Validación
  const isISODate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)

  type FormErrors = {
    fecha?: string
    id_mesa?: string
    id_mozo?: string
    id_reserva?: string
    detalles?: string
  }

  type Touched = Partial<Record<keyof FormErrors, boolean>>

  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [isFormValid, setIsFormValid] = useState(false)
  const [touched, setTouched] = useState<Touched>({})

  const markTouched = (key: keyof Touched) =>
    setTouched((t) => ({ ...t, [key]: true }))

  const errorClass = "border-red-500 focus-visible:ring-red-500"

  const validateForm = (data = formData): boolean => {
    const errors: FormErrors = {}

    if (!data.fecha) errors.fecha = "La fecha es obligatoria"
    else if (!isISODate(data.fecha)) errors.fecha = "Usá formato AAAA-MM-DD"

    if (!data.id_mesa || data.id_mesa <= 0) errors.id_mesa = "Elegí una mesa"
    if (!data.id_mozo || data.id_mozo <= 0) errors.id_mozo = "Elegí un mozo"

    const tieneProductos = (data.detalles_comanda ?? []).some(
      (d) => (d.cantidad ?? 0) > 0,
    )
    if (!tieneProductos) {
      errors.detalles = "Agregá al menos un producto con cantidad > 0"
    }

    setFormErrors(errors)
    const ok = Object.keys(errors).length === 0
    setIsFormValid(ok)
    return ok
  }

  useEffect(() => {
    validateForm(formData)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData])

  const showError = (key: keyof FormErrors) =>
    Boolean(touched[key as keyof Touched] && formErrors[key as keyof FormErrors])

  // Cargar página
  const loadPage = useCallback(
    async (p: number, s = size) => {
      setLoading(true)
      try {
        const { items, total, page, pages, size } = await comandasService.list({
          page: p,
          size: s,
          ...filters,
        })
        setComandas(items)
        setTotal(total ?? 0)
        setPage(page ?? p)
        setPages(pages)
        setSize(size ?? s)
      } catch (e) {
        console.error("Error cargando comandas:", e)
      } finally {
        setLoading(false)
      }
    },
    [size, filters],
  )

  // --- Mesas combobox ---
  const [mesas, setMesas] = useState<Mesas[]>([])
  const [mesasLoading, setMesasLoading] = useState(false)
  const [mesaOpen, setMesaOpen] = useState(false)
  const [mesaQuery, setMesaQuery] = useState("")

  const mesaLabel = (m: Mesas) =>
    `Mesa ${m.numero} (#${m.id}) - ${m.cantidad} sillas`

  const loadMesas = useCallback(async (q?: string) => {
    setMesasLoading(true)
    try {
      const params: any = { baja: false, page: 1, size: 50 }
      if (q && q.trim()) params.q = q.trim()
      const res = await mesasService.list(params)
      setMesas(res.items ?? [])
    } catch (e) {
      console.error("Error cargando mesas:", e)
      setMesas([])
    } finally {
      setMesasLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (mesaOpen) loadMesas(mesaQuery)
    }, 300)
    return () => clearTimeout(t)
  }, [mesaQuery, mesaOpen, loadMesas])

  useEffect(() => {
    if (mesaOpen) loadMesas("")
  }, [mesaOpen, loadMesas])

  // --- Mozos combobox ---
  const [mozos, setMozos] = useState<Mozo[]>([])
  const [mozosLoading, setMozosLoading] = useState(false)
  const [mozoOpen, setMozoOpen] = useState(false)
  const [mozoQuery, setMozoQuery] = useState("")

  const mozoLabel = (m: Mozo) => `#${m.id} · ${m.nombre} ${m.apellido}`

  const loadMozos = useCallback(async (q?: string) => {
    setMozosLoading(true)
    try {
      const params: any = { baja: false, page: 1, size: 50 }
      if (q && q.trim()) params.q = q.trim()
      const res = await mozoService.list(params)
      setMozos(res.items ?? [])
    } catch (e) {
      console.error("Error cargando mozos:", e)
      setMozos([])
    } finally {
      setMozosLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (mozoOpen) loadMozos(mozoQuery)
    }, 300)
    return () => clearTimeout(t)
  }, [mozoQuery, mozoOpen, loadMozos])

  useEffect(() => {
    if (mozoOpen) loadMozos("")
  }, [mozoOpen, loadMozos])

  // --- Reservas combobox ---
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [reservasLoading, setReservasLoading] = useState(false)
  const [reservaOpen, setReservaOpen] = useState(false)
  const [reservaQuery, setReservaQuery] = useState("")

  const reservaLabel = (r: Reserva) =>
    `#${r.id} · ${r.fecha} ${r.horario} - Mesa ${r.id_mesa} (${r.cantidad_personas} pers.)`

  const loadReservas = useCallback(async (q?: string) => {
    setReservasLoading(true)
    try {
      const params: any = { baja: false, page: 1, size: 50 }
      if (q && q.trim()) params.q = q.trim()
      const res = await reservasService.list(params)
      setReservas(res.items ?? [])
    } catch (e) {
      console.error("Error cargando reservas:", e)
      setReservas([])
    } finally {
      setReservasLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (reservaOpen) loadReservas(reservaQuery)
    }, 300)
    return () => clearTimeout(t)
  }, [reservaQuery, reservaOpen, loadReservas])

  useEffect(() => {
    if (reservaOpen) loadReservas("")
  }, [reservaOpen, loadReservas])

  // --- Productos combobox ---
  const [productos, setProductos] = useState<Producto[]>([])
  const [productosLoading, setProductosLoading] = useState(false)
  const [productoOpen, setProductoOpen] = useState(false)
  const [productoQuery, setProductoQuery] = useState("")

  const selectedIds = new Set(
    formData.detalles_comanda?.map((d) => d.id_producto) ?? [],
  )

  const productoLabel = (p: Producto) =>
    `#${p.id} · ${p.nombre} — $${p.precio}${p.cm3 ? ` · ${p.cm3}cm³` : ""}`

  const loadProductos = useCallback(async (q?: string) => {
    setProductosLoading(true)
    try {
      const params: any = { activo: true, page: 1, size: 50 }
      if (q && q.trim()) params.q = q.trim()
      const res = await productoService.list(params)
      setProductos(res.items ?? [])
    } catch (e) {
      console.error("Error cargando productos:", e)
      setProductos([])
    } finally {
      setProductosLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (productoOpen) loadProductos(productoQuery)
    }, 300)
    return () => clearTimeout(t)
  }, [productoQuery, productoOpen, loadProductos])

  useEffect(() => {
    if (productoOpen) loadProductos("")
  }, [productoOpen, loadProductos])

  const addOrIncProducto = (prodId: number, prodPrecio: number) => {
    setFormData((fd) => {
      const detalles_comanda = [...(fd.detalles_comanda ?? [])]
      const idx = detalles_comanda.findIndex((d) => d.id_producto === prodId)
      if (idx >= 0) {
        detalles_comanda[idx] = {
          ...detalles_comanda[idx],
          cantidad: (detalles_comanda[idx].cantidad ?? 0) + 1,
        }
      } else {
        detalles_comanda.push({
          id: 0,
          id_producto: prodId,
          cantidad: 1,
          precio_unitario: prodPrecio,
        })
      }
      return { ...fd, detalles_comanda }
    })
  }

  // Abrir diálogo (nueva o facturar existente)
  const handleOpenDialog = async (comanda?: Comanda) => {
    setTouched({})
    setIsDialogOpen(true)
    setSelectedComanda(null)
    setMedioPago(null) // reset medio de pago

    // Estado inicial limpio
    setFormData({
      fecha: "",
      id_mesa: 0,
      id_mozo: 0,
      id_reserva: 0,
      estado: "pendiente",
      detalles_comanda: [],
    })

if (comanda) {
  setSelectedComanda(comanda)
  setLoading(true)
  try {
    const fullComanda = await comandasService.getById(comanda.id)

    // setear datos de la comanda
    setFormData({
      fecha: fullComanda.fecha,
      id_mesa: fullComanda.id_mesa,
      id_mozo: fullComanda.id_mozo,
      id_reserva: fullComanda.id_reserva,
      estado: fullComanda.estado,
      detalles_comanda: fullComanda.detalles_comanda ?? [],
    })

    // 👇 NUEVO: si la comanda tiene reserva, la cargamos por id
    if (fullComanda.id_reserva && fullComanda.id_reserva > 0) {
      try {
        const res = await reservasService.list({
          id: fullComanda.id_reserva,
          page: 1,
          size: 1,
        })
        setReservas(res.items ?? [])
      } catch (err) {
        console.error("Error cargando reserva asociada:", err)
        // opcional: mostrar un toast, pero no rompemos el flujo
      }
    }
  } catch (e) {
    console.error("Error cargando detalles de comanda:", e)
    toast.error("No se pudieron cargar los detalles para edición.", {
      description: extractApiErrorMessage(e),
    })
    setIsDialogOpen(false)
  } finally {
    setLoading(false)
  }
}

  }

  const handleSave = async () => {
    setTouched({
      fecha: true,
      id_mesa: true,
      id_mozo: true,
      detalles: true,
    })

    if (!validateForm()) {
      toast.error("Revisá los errores del formulario")
      return
    }

    // Al facturar una comanda existente, el medio de pago es obligatorio
    if (selectedComanda && !medioPago) {
      toast.error("Elegí un medio de pago para facturar")
      return
    }

    const payload = {
      fecha: formData.fecha,
      id_mesa: formData.id_mesa,
      id_mozo: formData.id_mozo,
      id_reserva: formData.id_reserva || 0,
      estado: formData.estado,
      detalles_comanda:
        formData.detalles_comanda?.map((d) => ({
          id: d.id,
          id_producto: d.id_producto,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
        })) ?? [],
    }

    try {
      setSaving(true)
      if (selectedComanda) {
        const updated = await comandasService.update(selectedComanda.id, payload)

        // Crear la factura con el medio de pago elegido
        await facturacionService.create({
          id_comanda: updated.id,
          medio_pago: medioPago!, // validado arriba
        })

        setComandas((prev) =>
          prev.map((c) => (c.id === selectedComanda.id ? updated : c)),
        )
        toast.success("Comanda facturada", {
          description: `#${updated?.id ?? selectedComanda.id}`,
        })
      } else {
        const created = await comandasService.create(payload)
        await loadPage(1, size)
        toast.success("Comanda creada", {
          description: `#${created?.id ?? "?"}`,
        })
      }
      setIsDialogOpen(false)
    } catch (e) {
      toast.error("No se pudo guardar", {
        description: extractApiErrorMessage(e),
      })
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!comandaToDelete) return
    try {
      await comandasService.remove(comandaToDelete)
      setComandas((prev) => prev.filter((c) => c.id !== comandaToDelete))
      setIsDeleteDialogOpen(false)
      setComandaToDelete(null)
      toast.success("Comanda eliminada")
    } catch (e) {
      console.error("Error eliminando comanda:", e)
      toast.error("No se pudo eliminar", {
        description: extractApiErrorMessage(e),
      })
    }
  }

  const openDeleteDialog = (id: number) => {
    setComandaToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  // Cargar lista inicial + dependencias mínimas
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await comandasService.list({
          page: 1,
          size: PAGE_SIZE,
          ...filters,
        })
        if (!mounted) return
        setComandas(data.items)
        setTotal(data.total ?? 0)
        setPage(data.page ?? 1)
        setPages(data.pages)
        setSize(data.size ?? PAGE_SIZE)
        await loadMozos()
        await loadMesas()
      } catch (e) {
        console.error("Error cargando comandas:", e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // reserva actualmente seleccionada (para mostrar seña)
  const selectedReserva = reservas.find((r) => r.id === formData.id_reserva)
  const senia = selectedReserva?.menu_reserva?.monto_seña ?? 0

  // total de la comanda (productos)
  const totalComanda = (formData.detalles_comanda ?? []).reduce(
    (acc, d) => acc + (d.cantidad ?? 0) * (d.precio_unitario ?? 0),
    0,
  )

  // restante a cobrar (puedes clamp a 0 si querés evitar negativos)
  const restante = Math.max(totalComanda - senia, 0)


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Comandas</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? "Cargando..." : "Administra las comandas de tu restaurante"}
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) setMedioPago(null) // reset al cerrar
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Comanda
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-hidden rounded-2xl border p-4 sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {selectedComanda ? "Facturar Comanda" : "Nueva Comanda"}
              </DialogTitle>
              <DialogDescription>
                {selectedComanda
                  ? "Modifica los datos de la comanda si es necesario y elegí el método de pago"
                  : "Completa los datos de la nueva comanda"}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6">

{/* Mozo */}
              <div className="grid gap-1.5">
                <Label htmlFor="id_mozo">Mozo</Label>
                <Popover open={mozoOpen} onOpenChange={setMozoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant={showError("id_mozo") ? "destructive" : "outline"}
                      role="combobox"
                      className="w-full justify-between"
                      onBlur={() => markTouched("id_mozo")}
                      aria-invalid={showError("id_mozo")}
                    >
                      {(() => {
                        const selected = mozos.find(
                          (m) => m.id === formData.id_mozo,
                        )
                        return selected
                          ? mozoLabel(selected)
                          : "Seleccioná un mozo…"
                      })()}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Buscar mozo…"
                        value={mozoQuery}
                        onValueChange={setMozoQuery}
                      />
                      <CommandList>
                        {mozosLoading ? (
                          <div className="p-3 text-sm text-muted-foreground">
                            Cargando…
                          </div>
                        ) : (
                          <>
                            <CommandEmpty>
                              No se encontraron mozos
                            </CommandEmpty>
                            <CommandGroup heading="Mozos">
                              {mozos.map((m) => {
                                const selected = formData.id_mozo === m.id
                                return (
                                  <CommandItem
                                    key={m.id}
                                    value={String(m.id)}
                                    onSelect={() => {
                                      setFormData((fd) => ({
                                        ...fd,
                                        id_mozo: m.id,
                                      }))
                                      setTouched((t) => ({
                                        ...t,
                                        id_mozo: true,
                                      }))
                                      setMozoOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        selected
                                          ? "opacity-100"
                                          : "opacity-0"
                                      }`}
                                    />
                                    {mozoLabel(m)}
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
                {showError("id_mozo") && (
                  <p className="text-sm text-red-600">{formErrors.id_mozo}</p>
                )}
              </div>

              {/* Reserva (primero) */}
              <div className="grid gap-1.5">
                <Label htmlFor="id_reserva">Reserva (opcional)</Label>
                <Popover open={reservaOpen} onOpenChange={setReservaOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selectedReserva ? reservaLabel(selectedReserva) : "Sin reserva"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Buscar reserva…"
                        value={reservaQuery}
                        onValueChange={setReservaQuery}
                      />
                      <CommandList>
                        {reservasLoading ? (
                          <div className="p-3 text-sm text-muted-foreground">
                            Cargando…
                          </div>
                        ) : (
                          <>
                            <CommandEmpty>No se encontraron reservas</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="0"
                                onSelect={() => {
                                  setFormData((fd) => ({
                                    ...fd,
                                    id_reserva: 0,
                                  }))
                                  setReservaOpen(false)
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    formData.id_reserva === 0
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                Sin reserva
                              </CommandItem>
                            </CommandGroup>
                            <CommandGroup heading="Reservas">
                              {reservas.map((r) => {
                                const selected = formData.id_reserva === r.id
                                return (
                                  <CommandItem
                                    key={r.id}
                                    value={String(r.id)}
                                    onSelect={() => {
                                      setFormData((fd) => {
                                        // fusionar productos actuales con los del menú de reserva
                                        const actuales = [...(fd.detalles_comanda ?? [])]
                                        const detallesMenu = r.menu_reserva?.detalles_menu ?? []

                                        const fusionados = [...actuales]

                                        for (const dm of detallesMenu) {
                                          const idx = fusionados.findIndex(
                                            (det) => det.id_producto === dm.id_producto,
                                          )
                                          if (idx >= 0) {
                                            fusionados[idx] = {
                                              ...fusionados[idx],
                                              cantidad:
                                                (fusionados[idx].cantidad ?? 0) +
                                                dm.cantidad,
                                              precio_unitario: dm.precio,
                                            }
                                          } else {
                                            fusionados.push({
                                              id: 0,
                                              id_producto: dm.id_producto,
                                              cantidad: dm.cantidad,
                                              precio_unitario: dm.precio,
                                            })
                                          }
                                        }

                                        return {
                                          ...fd,
                                          id_reserva: r.id,
                                          fecha: r.fecha, // setear fecha desde la reserva
                                          id_mesa: r.id_mesa, // setear mesa desde la reserva
                                          detalles_comanda: fusionados,
                                        }
                                      })
                                      setReservaOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        selected ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {reservaLabel(r)}
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

                {senia > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Seña asociada a la reserva: ${senia}
                  </p>
                )}
              </div>

              {/* Fecha */}
              <div className="grid gap-1.5">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha: e.target.value })
                  }
                  onBlur={() => markTouched("fecha")}
                  aria-invalid={!!(touched.fecha && formErrors.fecha)}
                  className={
                    touched.fecha && formErrors.fecha ? errorClass : undefined
                  }
                />
                {touched.fecha && formErrors.fecha && (
                  <p className="text-sm text-red-600">{formErrors.fecha}</p>
                )}
              </div>

              {/* Mesa */}
              <div className="grid gap-1.5">
                <Label htmlFor="id_mesa">Mesa</Label>
                <Popover open={mesaOpen} onOpenChange={setMesaOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant={showError("id_mesa") ? "destructive" : "outline"}
                      role="combobox"
                      className="w-full justify-between"
                      onBlur={() => markTouched("id_mesa")}
                      aria-invalid={showError("id_mesa")}
                    >
                      {(() => {
                        const selected = mesas.find(
                          (m) => m.id === formData.id_mesa,
                        )
                        return selected
                          ? mesaLabel(selected)
                          : "Seleccioná una mesa…"
                      })()}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Buscar mesa…"
                        value={mesaQuery}
                        onValueChange={setMesaQuery}
                      />
                      <CommandList>
                        {mesasLoading ? (
                          <div className="p-3 text-sm text-muted-foreground">
                            Cargando…
                          </div>
                        ) : (
                          <>
                            <CommandEmpty>
                              No se encontraron mesas
                            </CommandEmpty>
                            <CommandGroup heading="Mesas">
                              {mesas.map((m) => {
                                const selected = formData.id_mesa === m.id
                                return (
                                  <CommandItem
                                    key={m.id}
                                    value={String(m.id)}
                                    onSelect={() => {
                                      setFormData((fd) => ({
                                        ...fd,
                                        id_mesa: m.id,
                                      }))
                                      setTouched((t) => ({
                                        ...t,
                                        id_mesa: true,
                                      }))
                                      setMesaOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        selected
                                          ? "opacity-100"
                                          : "opacity-0"
                                      }`}
                                    />
                                    {mesaLabel(m)}
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
                {showError("id_mesa") && (
                  <p className="text-sm text-red-600">{formErrors.id_mesa}</p>
                )}
              </div>


              {/* Productos */}
              <div className="grid gap-1.5">
                <Label>Productos de la comanda</Label>
                <Popover open={productoOpen} onOpenChange={setProductoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      aria-expanded={productoOpen}
                    >
                      Agregar productos…
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Buscar por nombre, tipo…"
                        value={productoQuery}
                        onValueChange={setProductoQuery}
                      />
                      <CommandList>
                        {productosLoading ? (
                          <div className="p-3 text-sm text-muted-foreground">
                            Cargando…
                          </div>
                        ) : (
                          <>
                            <CommandEmpty className="p-3">
                              No se encontraron productos
                            </CommandEmpty>
                            <CommandGroup heading="Resultados">
                              {productos
                                .filter((p) => !selectedIds.has(p.id))
                                .map((p) => (
                                  <CommandItem
                                    key={p.id}
                                    value={String(p.id)}
                                    onSelect={() => {
                                      addOrIncProducto(p.id, p.precio)
                                      setProductoOpen(false)
                                    }}
                                  >
                                    {productoLabel(p)}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Lista de productos seleccionados */}
                {formData.detalles_comanda?.length ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-center">Cant.</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.detalles_comanda.map((d) => {
                          const prod = productos.find(
                            (pp) => pp.id === d.id_producto,
                          )
                          const label = prod
                            ? productoLabel(prod)
                            : `#${d.id_producto}`
                          return (
                            <TableRow key={d.id_producto}>
                              <TableCell>{label}</TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  min={0}
                                  value={d.cantidad ?? 0}
                                  className="w-20 text-center"
                                  onChange={(e) => {
                                    const qty = Math.max(
                                      0,
                                      Number(e.target.value || 0),
                                    )
                                    setFormData((fd) => {
                                      const copy = (
                                        fd.detalles_comanda ?? []
                                      ).map((x) =>
                                        x.id_producto === d.id_producto
                                          ? { ...x, cantidad: qty }
                                          : x,
                                      )
                                      return {
                                        ...fd,
                                        detalles_comanda: copy,
                                      }
                                    })
                                  }}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setFormData((fd) => ({
                                      ...fd,
                                      detalles_comanda:
                                        (fd.detalles_comanda ?? []).filter(
                                          (x) =>
                                            x.id_producto !== d.id_producto,
                                        ),
                                    }))
                                  }}
                                >
                                  Quitar
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Aún no agregaste productos.
                  </p>
                )}
                {touched.detalles && formErrors.detalles && (
                  <p className="text-sm text-red-600">{formErrors.detalles}</p>
                )}
              </div>

              {/* Método de pago (solo cuando se factura una comanda existente) */}
              {selectedComanda && (
                <div className="grid gap-1.5">
                  <Label htmlFor="medio_pago">Método de pago</Label>
                  <Select
                    value={medioPago ?? undefined}
                    onValueChange={(v) => setMedioPago(v as MedioPago)}
                  >
                    <SelectTrigger id="medio_pago" className="w-full">
                      <SelectValue placeholder="Seleccioná un medio de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Medios disponibles</SelectLabel>
                        {MEDIOS_PAGO.map((mp) => (
                          <SelectItem key={mp} value={mp}>
                            {mp}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {!medioPago && (
                    <p className="text-sm text-muted-foreground">
                      Elegí un medio de pago para emitir la factura.
                    </p>
                  )}
                </div>
              )}
            </div>

              {/* Resumen de montos: total, seña, restante */}
  {(totalComanda > 0 || senia > 0) && (
    <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm space-y-1.5">
      <div className="flex items-center justify-between">
        <span>Total productos</span>
        <span className="font-semibold">
          ${totalComanda.toFixed(2)}
        </span>
      </div>

      {senia > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span>Seña</span>
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              -${senia.toFixed(2)}
            </span>
          </div>
          <div className="mt-1 border-t pt-1 flex items-center justify-between">
            <span>Restante a cobrar</span>
            <span className="font-semibold">
              ${restante.toFixed(2)}
            </span>
          </div>
        </>
      )}
    </div>
  )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  saving || !isFormValid || (selectedComanda && !medioPago)
                }
              >
                {selectedComanda ? "Generar facturación" : "Crear Comanda"}
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
                setFilters((f) => ({
                  ...f,
                  id: e.target.value ? Number(e.target.value) : undefined,
                }))
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
                setFilters((f) => ({
                  ...f,
                  id__neq: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
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
              <TableHead>Fecha</TableHead>
              <TableHead>Mesa</TableHead>
              <TableHead>Mozo</TableHead>
              <TableHead>Reserva</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comandas.map((c) => {
              const mozo = mozos.find((m) => m.id === c.id_mozo)
              const mesa = mesas.find((m) => m.id === c.id_mesa)

              const mozoDisplay = mozo
                ? `${mozo.nombre} ${mozo.apellido}`
                : `#${c.id_mozo}`
              const mesaDisplay = mesa
                ? `${mesa.tipo} (${mesa.numero})`
                : `#${c.id_mesa}`

              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.id}</TableCell>
                  <TableCell>{c.fecha}</TableCell>
                  <TableCell>{mesaDisplay}</TableCell>
                  <TableCell>{mozoDisplay}</TableCell>
                  <TableCell>{c.id_reserva || "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${estadoBadge(
                        c.estado,
                      )}`}
                    >
                      {c.estado}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {c.estado == "pendiente" && (
                        <Button
                          size="sm"
                          className="capitalize"
                          onClick={() => handleOpenDialog(c)}
                        >
                          <BadgeDollarSign className="mr-1 h-4 w-4" /> Facturar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {!loading && comandas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  No hay comandas cargadas.
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
            return `Mostrando ${start}—${end} de ${total ?? 0}`
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
          const totalPages =
            pages ?? Math.max(1, Math.ceil((total ?? 0) / (size || 1)))

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
                    className={
                      page <= 1 || loading
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                    onClick={() =>
                      page > 1 && !loading && loadPage(page - 1)
                    }
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
                        onClick={() =>
                          p !== page && !loading && loadPage(p)
                        }
                        className={
                          loading ? "pointer-events-none opacity-50" : ""
                        }
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}

                <PaginationItem>
                  <PaginationNext
                    aria-disabled={page >= totalPages || loading}
                    className={
                      page >= totalPages || loading
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                    onClick={() =>
                      page < totalPages && !loading && loadPage(page + 1)
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )
        })()}
      </div>

      {/* Alert Dialog para eliminar */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La comanda será eliminada
              permanentemente.
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
