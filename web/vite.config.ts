import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Apache (XAMPP). 127.0.0.1, not "localhost": it listens on IPv4 only.
const BACKEND = 'http://127.0.0.1:8080'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Registered explicitly in main.tsx; an injected inline script would break the CSP.
      injectRegister: false,
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png}'],
        // The build lands in Laravel's public/: skip uploads and unused font subsets.
        globIgnores: ['storage/**', '**/*{cyrillic,greek,vietnamese}*'],
      },
      manifest: {
        name: 'BaseMind',
        short_name: 'BaseMind',
        description: 'Osobiste centrum dowodzenia',
        lang: 'pl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#6366f1',
        background_color: '#09090b',
        icons: [
          // Not "/icons": Apache's default config aliases that path to its own directory.
          { src: '/app-icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/app-icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/app-icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    // Host stays localhost:5173, so Sanctum treats dev requests as first-party.
    // "/s" needs a regex: a plain prefix would also swallow e.g. /settings.
    proxy: {
      '/api': BACKEND,
      '/sanctum': BACKEND,
      '^/s/': BACKEND,
    },
  },
  build: {
    outDir: '../api/public',
    // Never empty it: it holds index.php and .htaccess. See scripts/clean-build.mjs.
    emptyOutDir: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
