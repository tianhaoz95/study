import { defineConfig } from 'vite'
import { readdirSync } from 'fs'
import { resolve } from 'path'

function countPosts(): number {
  try {
    const postsDir = resolve(__dirname, '../blog/src/pages/posts')
    return readdirSync(postsDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('_')).length
  } catch {
    return 0
  }
}

export default defineConfig({
  server: { port: 4322, host: true, allowedHosts: true },
  define: {
    __POST_COUNT__: countPosts(),
  },
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
