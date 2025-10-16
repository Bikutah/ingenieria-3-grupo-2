import { Home, User,Menu, Users, Table, Newspaper,ScrollText, Layers, NotebookTabs, ClipboardList } from "lucide-react"
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
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Gestiones items.
const itemsGestiones = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Menu",
    url: "#",
    icon: Menu,
  },
  {
    title: "Clientes",
    url: "#",
    icon: Users,
  },
  {
    title: "Mozos",
    url: "mozos",
    icon: User,
  },
  {
    title: "Mesas",
    url: "#",
    icon: Table,
  },
]

// Funciones items.
const itemsFunciones = [
  {
    title: "Crear Reserva",
    url: "#",
    icon: NotebookTabs,
  },
  {
    title: "Crear Comanda",
    url: "#",
    icon: ClipboardList,
  },
  {
    title: "Crear Factura",
    url: "#",
    icon: Newspaper,
  },
  {
    title: "Crear PreTicket",
    url: "#",
    icon: ScrollText,
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
  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-purple-800 text-sidebar-primary-foreground">
                  <span className="text-xl font-bold">B</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Boru</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">El peor restaurante</span>
                </div>
              </a>
            </SidebarMenuButton>
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
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
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
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
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
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
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
                    <AvatarImage src="/abstract-geometric-shapes.png" alt="Usuario" />
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
  )
}
