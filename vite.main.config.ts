import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist/main',
    lib: {
      entry: {
        main: resolve(__dirname, 'src/main/main.ts'),
        preload: resolve(__dirname, 'src/main/preload.ts'),
      },
      formats: ['cjs'],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        'electron',
        'path',
        'fs',
        'fs/promises',
        'os',
        'url',
        'crypto',
        'events',
        'stream',
        'util',
        'buffer',
        'assert',
        'child_process',
        'net',
        'tls',
        'http',
        'https',
        'zlib',
        'worker_threads',
        'module',
        'v8',
        'vm',
        '@xenova/transformers',
        'tesseract.js',
        'ollama',
        'pdf-parse',
        'mammoth',
        'lowdb',
        'lowdb/node',
      ],
      output: {
        entryFileNames: '[name].js',
      },
    },
    minify: false,
    sourcemap: true,
    target: 'node18',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@main': resolve(__dirname, 'src/main'),
    },
  },
})
