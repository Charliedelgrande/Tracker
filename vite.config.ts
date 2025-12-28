import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192.svg', 'pwa-512.svg'],
      manifest: {
        name: 'TrackOS',
        short_name: 'TrackOS',
        description: 'Personal performance tracker (offline-first, local-only).',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          {
            src: '/pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App-shell caching only; IndexedDB holds user data.
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,svg,png,webp,woff2}'],
      },
      devOptions: {
        // Mobile/offline behavior should be tested via `npm run build && npm run preview`.
        // Keeping SW off in dev avoids `dev-dist` generation + HMR/service-worker cache confusion.
        enabled: false,
      },
    }),
  ],
})


