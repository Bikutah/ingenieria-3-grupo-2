"use client"

import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"

export default function ReportesPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center min-h-screen p-2 gap-8">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">Visualiza reportes</h1>
        <div className="grid grid-cols-2 gap-8">
        <Button
          className="h-32 w-64 text-xl"
          onClick={() => navigate("/reportes")}
        >
          Facturación mensual
        </Button>

        <Button
          className="h-32 w-64 text-xl"
          onClick={() => navigate("/reportes")}
        >
          Mejores platos
        </Button>

        <Button
          className="h-32 w-64 text-xl"
          onClick={() => navigate("/reportes")}
        >
          Días más concurridos
        </Button>

        <Button
          className="h-32 w-64 text-xl"
          onClick={() => navigate("/reportes")}
        >
          Mozo del mes
        </Button>
      </div>
    </div>
  )
}
