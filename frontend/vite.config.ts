import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/mozo-y-cliente': {
        target: 'http://mozo-y-cliente:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/mozo-y-cliente/, ''),
      },
        '/gestion-mesas': {
        target: 'http://gestion-mesas:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gestion-mesas/, ''),
      },
      '/gestion-productos': {
        target: 'http://gestion-productos:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gestion-productos/, ''),
      },
      '/gestion-reservas': {
        target: 'http://gestion-reservas:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gestion-reservas/, ''),
      },
      '/gestion-comanda': {
        target: 'http://gestion-comanda:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gestion-comanda/, ''),
      },
      '/gestion-facturacion': {
        target: 'http://gestion-facturacion:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gestion-facturacion/, ''),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
