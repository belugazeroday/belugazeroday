import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/overlay'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist/overlay'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        overlay: resolve(__dirname, 'src/overlay/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@overlay': resolve(__dirname, 'src/overlay'),
    },
  },
  server: {
    port: 5174,
  },
})
