import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://heji-study-blog.web.app',
  server: { host: true },
  vite: { server: { allowedHosts: true } },
  build: {
    assets: '_assets',
  },
});
