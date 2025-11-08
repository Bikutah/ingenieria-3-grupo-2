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
import { useNavigate, Link } from "react-router-dom"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import { Checkbox } from "@/components/ui/checkbox"

import { Plus, Pencil, Trash2 } from "lucide-react"

import type { Reserva as DomainReserva } from "@/services/reservas/types/Reserva"
import type { ReservasListParams } from "@/services/reservas/types/Reserva"
import type { MenuReserva } from "@/services/reservas/types/MenuReserva"
import { reservasService } from "@/services/reservas/api/ReservasService"

// Clientes
import { clienteService } from "@/services/cliente/api/ClienteService"
import type { Cliente } from "@/services/cliente/types/Cliente"

// Sectores
import { sectoresService } from "@/services/sectores/api/SectoresService"
import type { Sectores } from "@/services/sectores/types/Sectores"

// Mesas
import { mesasService } from "@/services/mesas/api/MesasService"
import type { Mesas } from "@/services/mesas/types/Mesas"

import { toast } from "sonner"
import { extractApiErrorMessage } from "@/lib/api-error"
import { Check, ChevronsUpDown } from "lucide-react";

import { productoService } from "@/services/producto/api/ProductoService"
import type { Producto } from "@/services/producto/types/Producto"


// Alias para no chocar nombres
type Reserva = DomainReserva
const PAGE_SIZE = 50;

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<number | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null)
  const [reservaToDelete, setReservaToDelete] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uiSelections, setUiSelections] = useState<{ sectorId?: number }>({});
  const [mesas, setMesas] = useState<Mesas[]>([]);
  const [mesasLoading, setMesasLoading] = useState(false);


  // El formulario ahora usa el schema nuevo
  // NUEVO: flag controlado por checkbox
  const [hasMenu, setHasMenu] = useState(false)

  // Reemplazá tu formData inicial por este
  const [formData, setFormData] = useState<Omit<Reserva, "id">>({
    fecha: "",
    horario: "",
    cantidad_personas: "",
    id_mesa: 0,
    id_cliente: 0,
    baja: false,
    menu_reserva: null,
  })

  const DEFAULT_FILTERS: Omit<ReservasListParams, "page" | "size"> = {
    q: "",
    order_by: ["-id"],
  }

  const [filters, setFilters] = useState<Omit<ReservasListParams, "page" | "size">>(DEFAULT_FILTERS)

  // --- Validación ---
  const isISODate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
  const isHour24 = (v: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v)
  const isInt = (v: string) => /^\d+$/.test(v)

  type FormErrors = {
    fecha?: string;
    horario?: string;
    cantidad_personas?: string;
    id_sector?: string;    // virtual para la UI
    id_mesa?: string;
    id_cliente?: string;
    menu_reserva?: string;
  };

  type Touched = Partial<Record<keyof FormErrors, boolean>>;

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [touched, setTouched] = useState<Touched>({});

  const markTouched = (key: keyof Touched) =>
    setTouched((t) => ({ ...t, [key]: true }));

  const errorClass = "border-red-500 focus-visible:ring-red-500";

  // Validación general
  const validateForm = (data = formData, ui = uiSelections): boolean => {
    const errors: FormErrors = {};

    if (!data.fecha) errors.fecha = "La fecha es obligatoria";
    else if (!isISODate(data.fecha)) errors.fecha = "Usá formato AAAA-MM-DD";

    if (!data.horario) errors.horario = "El horario es obligatorio";
    else if (!isHour24(data.horario)) errors.horario = "Formato HH:mm (24h)";

    if (!data.cantidad_personas) errors.cantidad_personas = "Obligatorio";
    else if (!isInt(data.cantidad_personas)) errors.cantidad_personas = "Debe ser un entero";
    else if (Number(data.cantidad_personas) < 1) errors.cantidad_personas = "Debe ser ≥ 1";

    if (!data.id_mesa || data.id_mesa <= 0) errors.id_mesa = "Elegí una mesa";

    if (!data.id_cliente || data.id_cliente <= 0) errors.id_cliente = "Cliente inválido";

    // Validaciones del menú, solo si hasMenu está activo
    if (hasMenu) {
      if (!data.menu_reserva) {
        errors.menu_reserva = "Falta el menú"
      } else {
        const detalles = data.menu_reserva.detalles_menu ?? []
        const tieneAlgo = detalles.some(d => (d.cantidad ?? 0) > 0)
        if (!tieneAlgo) {
          errors.menu_reserva = "Agregá al menos un producto con cantidad > 0"
        }
        const senia = data.menu_reserva.monto_seña ?? 0
        if (senia < 0) {
          errors.menu_reserva = "La seña no puede ser negativa"
        }
        // Si querés validar duro el 30% para 6+ personas, avisame y te paso el cálculo del total.
        // (Necesita sumar precio*cantidad en UI; por ahora lo dejamos como sugerencia visual).
      }
    }


    setFormErrors(errors);
    const ok = Object.keys(errors).length === 0;
    setIsFormValid(ok);
    return ok;
  };

  // Revalidar onChange
  useEffect(() => {
    validateForm(formData, uiSelections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, uiSelections]);

  // Cargar lista inicial
  // función reutilizable para cargar una página
  const loadPage = useCallback(
    async (p: number, s = size) => {
      setLoading(true);
      try {
        const { items, total, page, pages, size } = await reservasService.list({ page: p, size: s, ...filters });
        setReservas(items);
        setTotal(total ?? 0);
        setPage(page ?? p);
        setPages(pages);
        setSize(size ?? s);
      } catch (e) {
        console.error("Error cargando reservas:", e);
      } finally {
        setLoading(false);
      }
    },
    [size, filters]
  );

  // --- Clientes combobox state ---
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clientesLoading, setClientesLoading] = useState(false)
  const [clienteOpen, setClienteOpen] = useState(false)
  const [clienteQuery, setClienteQuery] = useState("")

  const clienteLabel = (c: Cliente) => {
    const base = `#${c.id} · ${c.nombre}`
    const extra = [c.dni, c.telefono].filter(Boolean).join(" · ")
    return extra ? `${base} – ${extra}` : base
  }

  const loadClientes = useCallback(
    async (q?: string) => {
      setClientesLoading(true)
      try {
        const params: any = { page: 1, size: 50 }
        if (q && q.trim()) params.q = q.trim()
        const res = await clienteService.list(params)
        setClientes(res.items ?? [])
      } catch (e) {
        console.error("Error cargando clientes:", e)
        setClientes([])
      } finally {
        setClientesLoading(false)
      }
    },
    []
  )

  // Debounce simple para clienteQuery
  useEffect(() => {
    const t = setTimeout(() => {
      if (clienteOpen) loadClientes(clienteQuery)
    }, 300)
    return () => clearTimeout(t)
  }, [clienteQuery, clienteOpen, loadClientes])

  // Abrir el popover inicial → cargo lista
  useEffect(() => {
    if (clienteOpen) loadClientes("")
  }, [clienteOpen, loadClientes])

  // --- Productos combobox state ---
  const [productos, setProductos] = useState<Producto[]>([])
  const [productosLoading, setProductosLoading] = useState(false)
  const [productoOpen, setProductoOpen] = useState(false)
  const [productoQuery, setProductoQuery] = useState("")
  const selectedIds = new Set(
    formData.menu_reserva?.detalles_menu?.map(d => d.id_producto) ?? []
  )

  // Etiqueta bonita
  const productoLabel = (p: Producto) =>
    `#${p.id} · ${p.nombre} — $${p.precio}${p.cm3 ? ` · ${p.cm3}cm³` : ""}`

  // Loader con filtro activo + búsqueda
  const loadProductos = useCallback(
    async (q?: string) => {
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
    },
    []
  )

  // Debounce de query solo si el popover está abierto
  useEffect(() => {
    const t = setTimeout(() => {
      if (productoOpen) loadProductos(productoQuery)
    }, 300)
    return () => clearTimeout(t)
  }, [productoQuery, productoOpen, loadProductos])

  // Primer fetch al abrir
  useEffect(() => {
    if (productoOpen) loadProductos("")
  }, [productoOpen, loadProductos])

  // --- Helpers para detalles del menú ---
  // Garantiza que menu_reserva exista
  const ensureMenu = () => {
    setFormData(fd => ({
      ...fd,
      menu_reserva: fd.menu_reserva ?? { monto_seña: 0, detalles_menu: [] },
    }))
  }

  // Suma +1 al producto (o lo crea con 1)
  const addOrIncProducto = (prodId: number, prodPrecio: number) => {
    setFormData(fd => {
      const current = fd.menu_reserva ?? { monto_seña: 0, detalles_menu: [] }
      const detalles = [...current.detalles_menu]
      const idx = detalles.findIndex(d => d.id_producto === prodId)
      if (idx >= 0) {
        detalles[idx] = { ...detalles[idx], cantidad: (detalles[idx].cantidad ?? 0) + 1 }
      } else {
        detalles.push({ id_producto: prodId, cantidad: 1, precio: prodPrecio })
      }
      return {
        ...fd,
        menu_reserva: { ...current, detalles_menu: detalles },
      }
    })
  }


  // --- Sectores combobox state ---
  const [sectores, setSectores] = useState<Sectores[]>([])
  const [sectoresLoading, setSectoresLoading] = useState(false)
  const [sectorOpen, setSectorOpen] = useState(false)
  const [sectorQuery, setSectorQuery] = useState("")
  const showError = (key: keyof FormErrors | "id_sector") =>
    Boolean(touched[key as keyof Touched] && formErrors[key as keyof FormErrors]);

  const sectorLabel = (s: Sectores) => `#${s.id} - ${s.numero} · ${s.nombre}`

  const loadSectores = useCallback(
    async (q?: string) => {
      setSectoresLoading(true)
      try {
        const params: any = { baja: false, page: 1, size: 50 }
        if (q && q.trim()) params.q = q.trim()
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
  const [mesaOpen, setMesaOpen] = useState(false)

  const capacidadRequerida = isInt(formData.cantidad_personas)
    ? Number(formData.cantidad_personas)
    : 0

  useEffect(() => {
    const t = setTimeout(() => {
      if (sectorOpen) loadSectores(sectorQuery)
    }, 300)
    return () => clearTimeout(t)
  }, [sectorQuery, sectorOpen, loadSectores])

  // Cargar sectores al abrir el diálogo
  const loadMesasBySector = useCallback(
    async (sectorId?: number, minCap?: number) => {
      setMesasLoading(true)
      try {
        const params: any = { baja: false, page: 1, size: 50 }
        if (sectorId) params.id_sector = sectorId
        if (minCap && minCap > 0) params.cantidad__gte = minCap
        const res = await mesasService.list(params)
        setMesas(res.items ?? [])
      } catch (e) {
        console.error("Error cargando mesas por sector:", e)
        setMesas([])
      } finally {
        setMesasLoading(false)
      }
    },
    []
  )


  useEffect(() => {
    if (!isDialogOpen) return
    // Re-fetch con el sector actual (o todos) y la nueva capacidad
    loadMesasBySector(uiSelections.sectorId, capacidadRequerida)
  }, [capacidadRequerida, uiSelections.sectorId, isDialogOpen, loadMesasBySector])

  useEffect(() => {
    if (!formData.id_mesa) return
    const sel = mesas.find(m => m.id === formData.id_mesa)
    if (!sel) {
      setFormData(fd => ({ ...fd, id_mesa: 0 }))
      toast.message("Seleccioná otra mesa", {
        description: "La mesa seleccionada ya no cumple con los filtros."
      })
    }
  }, [mesas, formData.id_mesa])


  // Validación reactiva (mantener, pero la UI está gated por touched/submitted)
  useEffect(() => {
    validateForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData])


  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await reservasService.list({ page: 1, size: PAGE_SIZE, ...filters });
        if (!mounted) return;
        setReservas(data.items);
        setTotal(data.total ?? 0);
        setPage(data.page ?? 1);
        setPages(data.pages);
        setSize(data.size ?? PAGE_SIZE);
      } catch (e) {
        console.error("Error cargando reservas:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // solo al montar: no pongas filters para no recargar en cada cambio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDialog = (reserva?: Reserva) => {
    if (reserva) {
      setSelectedReserva(reserva)
      setFormData({
        fecha: reserva.fecha,
        horario: reserva.horario,
        cantidad_personas: reserva.cantidad_personas,
        id_mesa: reserva.id_mesa,
        id_cliente: reserva.id_cliente,
        baja: reserva.baja,
        menu_reserva: reserva.menu_reserva ?? null,
      })
      setHasMenu(Boolean(reserva.menu_reserva))
    } else {
      setSelectedReserva(null)
      setFormData({
        fecha: "",
        horario: "",
        cantidad_personas: "",
        id_mesa: 0,
        id_cliente: 0,
        baja: false,
        menu_reserva: null,
      })
      setHasMenu(false)
    }
    setIsDialogOpen(true)
    loadMesasBySector(uiSelections.sectorId, capacidadRequerida)
  }


  const handleSave = async () => {
    setTouched({
      fecha: true, horario: true, cantidad_personas: true,
      id_sector: true, id_mesa: true, id_cliente: true,
    });

    if (!validateForm()) {
      toast.error("Revisá los errores del formulario");
      return;
    }

    const payload: Omit<Reserva, "id"> = {
      ...formData,
      // ⬇️ Cambiá a Number(...) si tu backend lo quiere numérico
      cantidad_personas: String(formData.cantidad_personas),
      menu_reserva: hasMenu
        ? (formData.menu_reserva
          ? {
            monto_seña: Number(formData.menu_reserva.monto_seña || 0),
            detalles_menu: (formData.menu_reserva?.detalles_menu || [])
              .filter(d => (d.cantidad ?? 0) > 0)
              .map(d => ({ id_producto: d.id_producto, cantidad: d.cantidad, precio: d.precio })),

          }
          : { monto_seña: 0, detalles_menu: [] })
        : null,
    };

    try {
      setSaving(true);
      if (selectedReserva) {
        const updated = await reservasService.update(selectedReserva.id, payload);
        setReservas(prev => prev.map(r => (r.id === selectedReserva.id ? updated : r)));
        toast.success("Reserva actualizada", { description: `#${updated?.id ?? selectedReserva.id}` });
      } else {
        const created = await reservasService.create(payload);
        await loadPage(1, size);
        toast.success("Reserva creada", { description: `#${created?.id ?? "?"}` });
      }
      setIsDialogOpen(false);
    } catch (e) {
      toast.error("No se pudo guardar", { description: extractApiErrorMessage(e) });
      console.error(e);
    } finally {
      setSaving(false);
    }
  };



  const handleDelete = async () => {
    if (!reservaToDelete) return
    try {
      await reservasService.remove(reservaToDelete)
      setReservas(prev => prev.filter(r => r.id !== reservaToDelete))
      setIsDeleteDialogOpen(false)
      setReservaToDelete(null)
      toast.success("Reserva eliminada")
    } catch (e) {
      console.error("Error eliminando reserva:", e)
      toast.error("No se pudo eliminar", { description: extractApiErrorMessage(e) })
    }
  }

  const openDeleteDialog = (id: number) => {
    setReservaToDelete(id)
    setIsDeleteDialogOpen(true)
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Reservas</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? "Cargando..." : "Administra el personal de tu restaurante"}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} >
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Reserva
            </Button>
          </DialogTrigger>
            <DialogContent
    className="overflow-hidden rounded-2xl border p-4 sm:max-w-[600px]" // <- el borde vive acá
  >
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>{selectedReserva ? "Modificar Reserva" : "Nuevo Reserva"}</DialogTitle>
              <DialogDescription>
                {selectedReserva ? "Modifica los datos del reserva" : "Completa los datos del nueva reserva"}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6">

              {/* Fecha */}
              <div className="grid gap-1.5">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  onBlur={() => markTouched("fecha")}
                  aria-invalid={!!(touched.fecha && formErrors.fecha)}
                  aria-describedby={touched.fecha && formErrors.fecha ? "fecha-error" : undefined}
                  className={touched.fecha && formErrors.fecha ? errorClass : undefined}
                />
                {touched.fecha && formErrors.fecha && (
                  <p id="fecha-error" className="text-sm text-red-600">{formErrors.fecha}</p>
                )}
              </div>

              {/* Horario */}
              <div className="grid gap-1.5">
                <Label htmlFor="horario">Horario</Label>
                <Input
                  id="horario"
                  value={formData.horario}
                  onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                  onBlur={() => markTouched("horario")}
                  aria-invalid={!!(touched.horario && formErrors.horario)}
                  aria-describedby={touched.horario && formErrors.horario ? "horario-error" : undefined}
                  className={touched.horario && formErrors.horario ? errorClass : undefined}
                />
                {touched.horario && formErrors.horario && (
                  <p id="horario-error" className="text-sm text-red-600">{formErrors.horario}</p>
                )}
              </div>

              {/* Cantidad de personas */}
              <div className="grid gap-1.5">
                <Label htmlFor="cantidad_personas">Cantidad de personas</Label>
                <Input
                  id="cantidad_personas"
                  type="number"
                  min={1}
                  value={formData.cantidad_personas}
                  onChange={(e) => setFormData({ ...formData, cantidad_personas: e.target.value })}
                  onBlur={() => markTouched("cantidad_personas")}
                  aria-invalid={!!(touched.cantidad_personas && formErrors.cantidad_personas)}
                  aria-describedby={touched.cantidad_personas && formErrors.cantidad_personas ? "cantidad_personas-error" : undefined}
                  className={touched.cantidad_personas && formErrors.cantidad_personas ? errorClass : undefined}
                />
                {touched.cantidad_personas && formErrors.cantidad_personas && (
                  <p id="cantidad_personas-error" className="text-sm text-red-600">{formErrors.cantidad_personas}</p>
                )}
              </div>

              {/* Sector (combobox UI) */}
              <div className="grid gap-2">
                <Label>Sector (activo)</Label>
                <Popover open={sectorOpen} onOpenChange={setSectorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant={showError("id_sector") ? "destructive" : "outline"}
                      role="combobox"
                      aria-expanded={sectorOpen}
                      aria-invalid={showError("id_sector")}
                      className="w-full justify-between"
                      onBlur={() => markTouched("id_sector")}
                    >
                      {(() => {
                        const selected = sectores.find((s) => s.id === uiSelections.sectorId);
                        return selected ? sectorLabel(selected) : "Todos los sectores";
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
                            {/* Opción "Todos los sectores" */}
                            <CommandGroup>
                              <CommandItem
                                value="ALL"
                                onSelect={() => {
                                  setUiSelections((prev) => ({ ...prev, sectorId: undefined })) // sin filtro
                                  setTouched((t) => ({ ...t, id_sector: true }))
                                  setSectorOpen(false)
                                  setFormData((fd) => ({ ...fd, id_mesa: 0 })) // reseteo de mesa
                                  loadMesasBySector(undefined, capacidadRequerida) // cargar TODAS las mesas
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${uiSelections.sectorId == null ? "opacity-100" : "opacity-0"}`} />
                                Todos los sectores
                              </CommandItem>
                            </CommandGroup>

                            <CommandGroup heading="Resultados">
                              {sectores.map((s) => {
                                const selected = uiSelections.sectorId === s.id;
                                return (
                                  <CommandItem
                                    key={s.id}
                                    value={String(s.id)}
                                    onSelect={() => {
                                      const id = Number(s.id)
                                      setUiSelections((prev) => ({ ...prev, sectorId: id }))
                                      setTouched((t) => ({ ...t, id_sector: true }))
                                      setSectorOpen(false)
                                      // Reset de mesa y recarga filtrada por sector
                                      setFormData((fd) => ({ ...fd, id_mesa: 0 }))
                                      loadMesasBySector(id, capacidadRequerida)
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                    {sectorLabel(s)}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Error visual opcional */}
                {showError("id_sector") && (
                  <p className="text-xs text-destructive">{formErrors.id_sector}</p>
                )}

                {uiSelections.sectorId && (
                  <p className="text-xs text-muted-foreground">
                    Sector seleccionado: {uiSelections.sectorId}
                  </p>
                )}
              </div>


              {/* Mesa (dependiente del sector) */}
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
                        const selected = mesas.find((m) => m.id === formData.id_mesa);
                        return selected ? `${selected.numero} (#${selected.id}) - sillas ${selected.cantidad} ` : "Seleccioná una mesa…";
                      })()}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar mesa…" />
                      <CommandList>

                        {!mesasLoading && mesas.length === 0 && (
                          <div className="p-3 text-sm text-muted-foreground">
                            No hay mesas con ≥ {capacidadRequerida || 0} sillas
                            {uiSelections.sectorId ? " en el sector seleccionado." : " en todos los sectores."}
                          </div>
                        )}

                        {mesasLoading ? (
                          <div className="p-3 text-sm text-muted-foreground">Cargando…</div>
                        ) : (
                          <>

                            <CommandGroup heading="Mesas">
                              {mesas.map((m) => {
                                const selected = formData.id_mesa === m.id;
                                return (
                                  <CommandItem
                                    key={m.id}
                                    value={String(m.id)}
                                    onSelect={() => {
                                      setFormData((fd) => ({ ...fd, id_mesa: m.id }));
                                      setTouched((t) => ({ ...t, id_mesa: true }));
                                      setMesaOpen(false)
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                    {`${m.numero} (#${m.id}) - sillas ${m.cantidad} `}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {showError("id_mesa") && (
                  <p id="id_mesa-error" className="text-sm text-red-600">
                    {String(formErrors.id_mesa)}
                  </p>
                )}
              </div>

              {/* Cliente (Command + Popover + Crear) */}
              <div className="grid gap-1.5">
                <Label htmlFor="id_cliente">Cliente</Label>
                <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant={showError("id_cliente") ? "destructive" : "outline"}
                      role="combobox"
                      className="w-full justify-between"
                      onBlur={() => markTouched("id_cliente")}
                      aria-invalid={showError("id_cliente")}
                      aria-expanded={clienteOpen}
                    >
                      {(() => {
                        const selected = clientes.find((c) => c.id === formData.id_cliente)
                        return selected ? clienteLabel(selected) : "Buscá y seleccioná un cliente…"
                      })()}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Nombre, DNI o teléfono…"
                        value={clienteQuery}
                        onValueChange={setClienteQuery}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !clientesLoading && clientes.length === 0) {
                            e.preventDefault()
                            // Prefill opcional por querystring:
                            navigate(`/clientes/`)
                          }
                        }}
                      />
                      <CommandList>
                        {clientesLoading ? (
                          <div className="p-3 text-sm text-muted-foreground">Cargando…</div>
                        ) : (
                          <>
                            <CommandEmpty className="p-3">
                              <div className="flex flex-col gap-2">
                                <span>No se encontraron clientes</span>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => navigate(`/clientes/`)}
                                  className="w-fit"
                                >
                                  Crear cliente
                                </Button>
                              </div>
                            </CommandEmpty>

                            <CommandGroup heading="Resultados">
                              {clientes.map((c) => {

                                const selected = formData.id_cliente === c.id
                                return (
                                  <CommandItem
                                    key={c.id}
                                    value={String(c.id)}
                                    onSelect={() => {
                                      setFormData((fd) => ({ ...fd, id_cliente: c.id }))
                                      setTouched((t) => ({ ...t, id_cliente: true }))
                                      setClienteOpen(false)
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                    {clienteLabel(c)}
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

                {showError("id_cliente") && (
                  <p id="id_cliente-error" className="text-sm text-red-600">
                    {formErrors.id_cliente}
                  </p>
                )}
              </div>


              {/* --- MENÚ RESERVA: Toggle --- */}
              <div className="flex flex-col gap-6">
                <Label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
                  <Checkbox
                    id="toggle-menu"
                    checked={hasMenu}
                    onCheckedChange={(v) => {
                      const enabled = Boolean(v)
                      setHasMenu(enabled)
                      setFormData(fd => ({
                        ...fd,
                        menu_reserva: enabled
                          ? (fd.menu_reserva ?? { monto_seña: 0, detalles_menu: [] })
                          : null
                      }))
                    }}
                    className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
                  />
                  <div className="grid gap-1.5 font-normal">
                    <p className="text-sm leading-none font-medium">La reserva tiene menú</p>
                    <p className="text-muted-foreground text-sm">
                      Recordá que si son 6+ personas se sugiere una seña del 30%.
                    </p>
                  </div>
                </Label>
              </div>

              {hasMenu && (



                <div className="grid gap-1.5">



                  <Label>Productos del menú</Label>
                  <Popover open={productoOpen} onOpenChange={setProductoOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                        aria-expanded={productoOpen}
                        onClick={() => ensureMenu()}
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
                            <div className="p-3 text-sm text-muted-foreground">Cargando…</div>
                          ) : (
                            <>
                              <CommandEmpty className="p-3">
                                No se encontraron productos
                              </CommandEmpty>

                              <CommandGroup heading="Resultados">
                                {productos.filter(p => !selectedIds.has(p.id)).map((p) => (
                                  <CommandItem
                                    key={p.id}
                                    value={String(p.id)}
                                    onSelect={() => {
                                      ensureMenu()
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

                  {/* Lista compacta de seleccionados (cantidad editable) */}
                  {formData.menu_reserva?.detalles_menu?.length ? (
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
                          {formData.menu_reserva.detalles_menu.map((d) => {
                            const prod = productos.find(pp => pp.id === d.id_producto)
                            // si no está en "productos" porque cambió la búsqueda, solo mostramos el id
                            const label = prod ? productoLabel(prod) : `#${d.id_producto}`
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
                                      const qty = Math.max(0, Number(e.target.value || 0))
                                      setFormData(fd => {
                                        if (!fd.menu_reserva) return fd
                                        const copy = fd.menu_reserva.detalles_menu.map(x =>
                                          x.id_producto === d.id_producto ? { ...x, cantidad: qty } : x
                                        )
                                        return { ...fd, menu_reserva: { ...fd.menu_reserva, detalles_menu: copy } }
                                      })
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setFormData(fd => {
                                        if (!fd.menu_reserva) return fd
                                        return {
                                          ...fd,
                                          menu_reserva: {
                                            ...fd.menu_reserva,
                                            detalles_menu: fd.menu_reserva.detalles_menu.filter(x => x.id_producto !== d.id_producto)
                                          }
                                        }
                                      })
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
                    <p className="text-xs text-muted-foreground">Aún no agregaste productos.</p>
                  )}
                </div>

              )


              }

              {hasMenu && (

                <div className="grid gap-1.5">
                  <Label htmlFor="senia">Seña</Label>
                  <Input
                    id="senia"
                    type="number"
                    min={0}
                    value={formData.menu_reserva?.monto_seña ?? 0}
                    onChange={(e) => {
                      const val = Number(e.target.value || 0)
                      setFormData(fd => ({
                        ...fd,
                        menu_reserva: {
                          ...(fd.menu_reserva ?? { monto_seña: 0, detalles_menu: [] }),
                          monto_seña: val
                        }
                      }))
                    }}
                    onBlur={() => markTouched("menu_reserva")}
                    aria-invalid={!!(touched.menu_reserva && formErrors.menu_reserva)}
                    aria-describedby={touched.menu_reserva && formErrors.menu_reserva ? "menu-error" : undefined}
                    className={touched.menu_reserva && formErrors.menu_reserva ? errorClass : undefined}
                  />
                  {touched.menu_reserva && formErrors.menu_reserva && (
                    <p id="menu-error" className="text-sm text-red-600">{formErrors.menu_reserva}</p>
                  )}
                  {/* Sugerencia opcional si querés mostrar el 30% sin validar duro */}
                  {Number(formData.cantidad_personas) >= 6 && (
                    <p className="text-xs text-muted-foreground">
                      Sugerido: al menos 30% del total del menú.
                    </p>
                  )}
                </div>)


              }


            </div>


            <DialogFooter className="sticky bottom-0 z-10 bg-background p-6 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !isFormValid}>
                {selectedReserva ? "Guardar Cambios" : "Crear Reserva"}
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
              <TableHead>Fecha</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Personas</TableHead>
              <TableHead>ID Cliente</TableHead>
              <TableHead>Mesa</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservas.map((reserva) => (
              <TableRow key={reserva.id}>
                <TableCell className="font-medium">{reserva.id}</TableCell>
                <TableCell>{reserva.fecha}</TableCell>
                <TableCell>{reserva.horario}</TableCell>
                <TableCell>{reserva.cantidad_personas}</TableCell>
                <TableCell>{reserva.id_cliente}</TableCell>
                <TableCell>{reserva.id_mesa}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${reserva.baja
                      ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      }`}
                  >
                    {reserva.baja ? "Cancelada" : "Activa"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(reserva)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(reserva.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && reservas.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No hay reservas cargadas.
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
              Esta acción no se puede deshacer. La reserva será eliminada permanentemente.
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
