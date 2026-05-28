import { defineConfig } from 'vite'
import { readdirSync } from 'fs'
import { resolve } from 'path'

function countPosts(): number {
  try {
    const postsDir = resolve(__dirname, '../blog/src/pages/posts')
    return readdirSync(postsDir, { withFileTypes: true })
      .filter(e => e.isDirectory()).length
  } catch {
    return 0
  }
}

export default defineConfig({
  define: {
    __POST_COUNT__: countPosts(),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
