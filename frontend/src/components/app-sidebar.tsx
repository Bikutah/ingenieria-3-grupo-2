import {
  Home,
  LayoutTemplate,
  UserPen,
  Users,
  Table,
  Newspaper,
  ScrollText,
  Layers,
  NotebookTabs,
  ClipboardList,
  SquareSquare,
  Ham,
  Utensils,
} from "lucide-react"
import { Link } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

// Gestiones items.
const itemsGestiones = [
  {
    title: "Inicio",
    url: "/",
    icon: Home,
  },
  {
    title: "Clientes",
    url: "clientes",
    icon: Users,
  },
  {
    title: "Mozos",
    url: "mozos",
    icon: UserPen,
  },
  {
    title: "Mesas",
    url: "mesas",
    icon: Table,
  },
  {
    title: "Sectores",
    url: "sectores",
    icon: SquareSquare,
  },
  {
    title: "Productos",
    url: "productos",
    icon: Ham,
  },
  {
    title: "Cartas",
    url: "cartas",
    icon: LayoutTemplate,
  },
]

// Funciones items.
const itemsFunciones = [
  {
    title: "Reservas",
    url: "reservas",
    icon: NotebookTabs,
  },
  {
    title: "Comandas",
    url: "comandas",
    icon: ClipboardList,
  },
  {
    title: "Facturas",
    url: "#",
    icon: Newspaper,
  },
]

// Reportes items.
const itemsReportes = [
  {
    title: "Reportes",
    url: "#",
    icon: Layers,
  },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <TooltipProvider>
      <Sidebar variant="floating" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              {isCollapsed ? (
                // --- Versión colapsada ---
                <div className="flex items-center justify-center py-2">
                  <div className="flex aspect-square size-13 items-center justify-center rounded-lg  overflow-hidden">
                    <img
                      src="/images/bondiola_icon.webp"
                      alt="BondiolitaLaMasRica"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                // --- Versión expandida ---
                <SidebarMenuButton size="lg" asChild>
                  <a href="/">
                    <div className="flex aspect-square size-13 items-center justify-center rounded-lg overflow-hidden">
                      <img
                        src="/images/bondiola_icon.webp"
                        alt="BondiolitaLaMasRica"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">Boru</span>
                      <span className="truncate text-xs text-sidebar-foreground/70">
                        El peor restaurante
                      </span>
                    </div>
                  </a>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Gestiones</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {itemsGestiones.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <Link to={item.url}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <SidebarMenuButton asChild>
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Funciones</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {itemsFunciones.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <Link to={item.url}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <SidebarMenuButton asChild>
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Reportes</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {itemsReportes.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <Link to={item.url}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <SidebarMenuButton asChild>
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src="/images/avatar360.webp" alt="Usuario" />
                      <AvatarFallback className="rounded-lg">A7</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">Architin777</span>
                      <span className="truncate text-xs text-sidebar-foreground/70">archi@gmail.com</span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  )
}
