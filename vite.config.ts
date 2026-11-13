import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// GitHub Pages no conoce las rutas de la SPA: servir index.html también como 404.html
// hace que recargar /baby-shower/regalos cargue la app en lugar de un 404.
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    async closeBundle() {
      const outDir = resolve(import.meta.dirname, 'dist')
      await copyFile(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

export default defineConfig({
  // GitHub Pages sirve el sitio en https://charliecobo.github.io/baby-shower/
  base: '/baby-shower/',
  plugins: [react(), tailwindcss(), spaFallback()],
})
