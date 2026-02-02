import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: This ensures assets (js/css) are looked for relative to index.html
  // instead of at the root of the domain, fixing the blank page issue on GitHub Pages.
  base: './',
  assetsInclude: ['**/*.db'], // Ensure .db files are handled correctly
  build: {
    rollupOptions: {
      // Tell Rollup that 'xlsx' and 'marked' are external and should not be bundled.
      // The browser will resolve them using the importmap in index.html.
      external: ['xlsx', 'marked']
    }
  }
})