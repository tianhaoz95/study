import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function recentTopics(max = 6): string[] {
  try {
    const src = readFileSync(
      resolve(__dirname, '../blog/src/pages/index.astro'), 'utf-8'
    )
    // Extract tag text values from the latestPosts tags array
    const matches = [...src.matchAll(/\{\s*text:\s*'([^']+)'/g)].map(m => m[1])
    // Deduplicate preserving first-seen order; first post = most recent
    const seen = new Set<string>()
    for (const t of matches) { seen.add(t) }
    return [...seen].slice(0, max)
  } catch {
    return []
  }
}

export default defineConfig({
  define: {
    __RECENT_TOPICS__: JSON.stringify(recentTopics()),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
