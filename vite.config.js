import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/concreta/',
  server: {
    allowedHosts: ['localhost', 'umbrel.local'],
  },
  plugins: [react()],
})
