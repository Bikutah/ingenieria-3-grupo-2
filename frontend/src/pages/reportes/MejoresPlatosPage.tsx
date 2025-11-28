"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function MejoresPlatos() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [loading, setLoading] = useState(false)
  const [topPlatos, setTopPlatos] = useState([])

  async function fetchTopPlatos() {
    if (!from || !to) return
    setLoading(true)

    try {
      // aca iria fetch

      // ------- MOCK para ver funcionando sin backend -------
      const mock = [
        { nombre: "Pizza Muzza", cantidad: 120 },
        { nombre: "Hamburguesa Completa", cantidad: 95 },
        { nombre: "Ravioles", cantidad: 80 },
        { nombre: "Empanadas", cantidad: 75 },
        { nombre: "Milanesa con Fritas", cantidad: 71 },
        { nombre: "Ensalada César", cantidad: 66 },
        { nombre: "Pizza Napolitana", cantidad: 60 },
        { nombre: "Lomo al Champignon", cantidad: 55 },
        { nombre: "Tacos", cantidad: 50 },
        { nombre: "Sushi (10 piezas)", cantidad: 45 },
      ]
      setTimeout(() => setTopPlatos(mock), 600)
      // -------------------------------------------------------

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Mejores Platos</h1>

      {/* Selector de Fechas */}
      <div className="flex items-end gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium">Desde</label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium">Hasta</label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>

        <Button className="h-10" onClick={fetchTopPlatos}>
          Consultar
        </Button>
      </div>

      {/* Lista Top 10 */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Top 10 platos más vendidos</h2>

        {loading && <p>Cargando...</p>}

        {!loading && topPlatos.length === 0 && (
          <p className="text-gray-500">Seleccioná un rango de fechas y presioná “Consultar”.</p>
        )}

        <ol className="space-y-2">
          {topPlatos.map((p, i) => (
            <li
              key={i}
              className="flex justify-between bg-white p-3 rounded-lg shadow"
            >
              <span className="font-medium">
                {i + 1}. {p.nombre}
              </span>
              <span className="text-gray-700">{p.cantidad} ventas</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
