import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      includeAssets: ['favicon.png', 'icon-32.png', 'icon-192.png', 'icon-512.png', 'logo.png'],
      manifest: {
        name: 'PPAM Costa - Predicación Pública',
        short_name: 'PPAM Costa',
        description: 'Sistema de gestión de turnos para predicación pública',
        theme_color: '#1E3A5F',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon-32.png?v=3',
            sizes: '32x32',
            type: 'image/png',
          },
          {
            src: '/icon-192.png?v=3',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png?v=3',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512.png?v=3',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
