import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `vite build --mode preview` produces a single self-contained HTML at
// preview/index.html for hosting via raw.githack.com (no-signin click link).
export default defineConfig(({ mode }) => ({
  plugins: mode === 'preview' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'preview'
    ? {
        outDir: 'preview',
        emptyOutDir: true,
        assetsInlineLimit: 100000000,
        cssCodeSplit: false,
        rollupOptions: { inlineDynamicImports: true },
      }
    : {},
}))
