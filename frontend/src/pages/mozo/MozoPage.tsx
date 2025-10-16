"use client"

import { useState } from "react"
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

type Mozo = {
  id: number
  nombre: string
  apellido: string
  telefono: string
  email: string
  estado: "Activo" | "Inactivo"
}

const initialMozos: Mozo[] = [
  { id: 1, nombre: "Juan", apellido: "Pérez", telefono: "555-0101", email: "juan@boru.com", estado: "Activo" },
  { id: 2, nombre: "María", apellido: "González", telefono: "555-0102", email: "maria@boru.com", estado: "Activo" },
  { id: 3, nombre: "Carlos", apellido: "Rodríguez", telefono: "555-0103", email: "carlos@boru.com", estado: "Activo" },
]

export default function MozosPage() {
  const [mozos, setMozos] = useState<Mozo[]>(initialMozos)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMozo, setSelectedMozo] = useState<Mozo | null>(null)
  const [mozoToDelete, setMozoToDelete] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
  })

  const handleOpenDialog = (mozo?: Mozo) => {
    if (mozo) {
      setSelectedMozo(mozo)
      setFormData({
        nombre: mozo.nombre,
        apellido: mozo.apellido,
        telefono: mozo.telefono,
        email: mozo.email,
      })
    } else {
      setSelectedMozo(null)
      setFormData({ nombre: "", apellido: "", telefono: "", email: "" })
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (selectedMozo) {
      // Modificar mozo existente
      setMozos(mozos.map((m) => (m.id === selectedMozo.id ? { ...m, ...formData } : m)))
    } else {
      // Crear nuevo mozo
      const newMozo: Mozo = {
        id: Math.max(...mozos.map((m) => m.id)) + 1,
        ...formData,
        estado: "Activo",
      }
      setMozos([...mozos, newMozo])
    }
    setIsDialogOpen(false)
  }

  const handleDelete = () => {
    if (mozoToDelete) {
      setMozos(mozos.filter((m) => m.id !== mozoToDelete))
      setIsDeleteDialogOpen(false)
      setMozoToDelete(null)
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
          <p className="mt-2 text-muted-foreground">Administra el personal de tu restaurante</p>
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
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>{selectedMozo ? "Guardar Cambios" : "Crear Mozo"}</Button>
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
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
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
                <TableCell>{mozo.telefono}</TableCell>
                <TableCell>{mozo.email}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      mozo.estado === "Activo"
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    {mozo.estado}
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
