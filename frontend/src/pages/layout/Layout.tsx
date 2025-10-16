import React from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export const Layout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-neutral-950">
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <SidebarTrigger />
          <div className="mt-6">
            {/* Aquí se renderizan las rutas hijas */}
            <Outlet />
          </div>
        </main>
      </SidebarProvider>
    </div>
  )
}
