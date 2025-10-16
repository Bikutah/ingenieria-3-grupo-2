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
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})