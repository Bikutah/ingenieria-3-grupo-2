import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
})