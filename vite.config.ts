import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const appBase = mode === 'github-pages' ? '/qb-learn/' : '/'

  return {
    base: appBase,
    plugins: [
      react(),
      VitePWA({
        base: appBase,
        scope: appBase,
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: [
          'favicon.ico',
          'favicon.svg',
          'apple-touch-icon-180x180.png',
        ],
        manifest: {
          id: appBase,
          name: 'QB Learn',
          short_name: 'QB Learn',
          description: 'Học flashcard, luyện tập và kiểm tra từ bộ đề Quizlet PDF.',
          start_url: appBase,
          scope: appBase,
          display: 'standalone',
          background_color: '#f7f8fc',
          theme_color: '#6d3df5',
          lang: 'vi',
          categories: ['education', 'productivity'],
          icons: [
            {
              src: 'pwa-64x64.png',
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 3_000_000,
        },
      }),
    ],
  }
})
