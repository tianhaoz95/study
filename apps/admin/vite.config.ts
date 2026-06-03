import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 4325 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
