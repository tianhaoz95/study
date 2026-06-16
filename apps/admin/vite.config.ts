import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 4325, host: true, allowedHosts: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics']
        }
      }
    }
  },
})
