import React from "react"
import { useLocation, Link } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// Mapeo de rutas a nombres legibles
const routeNames: Record<string, string> = {
  "": "Inicio",
  mozos: "Mozos",
  clientes: "Clientes",
  mesas: "Mesas",
  sectores: "Sectores",
  productos: "Productos",
}

export function DynamicBreadcrumb() {
  const location = useLocation()

  // Dividir la ruta en segmentos
  const pathSegments = location.pathname.split("/").filter(Boolean)

  // Si estamos en la página principal, mostrar solo "Inicio"
  if (pathSegments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Inicio</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Enlace a Inicio */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">Inicio</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Generar breadcrumbs para cada segmento */}
        {pathSegments.map((segment, index) => {
          const path = `/${pathSegments.slice(0, index + 1).join("/")}`
          const isLast = index === pathSegments.length - 1
          const name = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

          return (
            <React.Fragment key={path}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={path}>{name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
