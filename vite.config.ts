import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: This ensures assets (js/css) are looked for relative to index.html
  // instead of at the root of the domain, fixing the blank page issue on GitHub Pages.
  base: './',
  build: {
    rollupOptions: {
      // Tell Rollup that 'xlsx' is external and should not be bundled.
      // The browser will resolve it using the importmap in index.html.
      external: ['xlsx']
    }
  }
})