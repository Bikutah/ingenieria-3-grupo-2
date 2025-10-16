"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

// Alias para no chocar nombres
type Mozo = DomainMozo

export default function MozosPage() {
  const [mozos, setMozos] = useState<Mozo[]>([])
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

  // Cargar lista inicial
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const { items } = await mozoService.list({ page: 1, size: 50 })
        if (mounted) setMozos(items)
      } catch (e) {
        console.error("Error cargando mozos:", e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

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
      } else {
        const created = await mozoService.create(formData)
        setMozos(prev => [...prev, created])
      }
      setIsDialogOpen(false)
    } catch (e) {
      console.error("Error guardando mozo:", e)
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
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
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
                {selectedMozo ? "Guardar Cambios" : "Crear Mozo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      mozo.activo
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
