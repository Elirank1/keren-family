import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Deploy base: '/' for local dev/test/preview, '/keren-family/slp-ai/' for the
// GitHub Pages subpath. Set DEPLOY_BASE at build time for the live deploy so
// local tooling (and the Playwright suite at localhost:4173) keep using '/'.
const base = process.env.DEPLOY_BASE || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Scope the service worker to this app's base only, so it never controls
      // sibling games on the Keren Family Games site.
      scope: base,
      base,
      includeAssets: ['icons/icon-192.svg', 'icons/icon-512.svg'],
      manifest: {
        name: 'SLP-AI',
        short_name: 'SLP-AI',
        description: 'תרגול דיבור ביתי לליווי משפחתי',
        lang: 'he',
        dir: 'rtl',
        theme_color: '#4f46e5',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        // Hash routing means navigations always hit the precached app shell.
        navigateFallback: `${base}index.html`,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
