import type React from "react"
import { Outlet } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"

export const Layout: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="boru-theme">
      <div className="flex h-screen bg-gray-50 dark:bg-neutral-950">
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex flex-1 items-center justify-between">
                <DynamicBreadcrumb />
                <ThemeToggle />
              </div> 
            </div>
            <div className="mt-6">
              {/* Aquí se renderizan las rutas hijas */}
              <Outlet />
            </div>
          </main>
        </SidebarProvider>
      </div>
    </ThemeProvider>
  )
}
