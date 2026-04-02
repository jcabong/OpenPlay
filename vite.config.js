import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name:             'OpenPlay',
        short_name:       'OpenPlay',
        description:      'Social racket sports app',
        theme_color:      '#0a0a0a',
        background_color: '#0a0a0a',
        display:          'standalone',
        orientation:      'portrait',
        start_url:        '/',
        scope:            '/',
        lang:             'en',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
