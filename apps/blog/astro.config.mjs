import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://heji-study-blog.web.app',
  build: {
    assets: '_assets',
  },
});
