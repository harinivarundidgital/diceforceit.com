// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://diceforceit.com',
  integrations: [
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        const excludedPaths = ['/404', '/500', '/502', '/503', '/error'];
        return !excludedPaths.some(excluded => path === excluded || path === `${excluded}/`);
      }
    })
  ],
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@astrojs/compiler', 'astro'],
    },
    server: {
      watch: {
        ignored: ['**/public/home-hero/**', '**/public/lastseen/**']
      }
    }
  },
});


