import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages sirve el sitio en https://<usuario>.github.io/baby-shower/
  base: '/baby-shower/',
  plugins: [react(), tailwindcss()],
})
