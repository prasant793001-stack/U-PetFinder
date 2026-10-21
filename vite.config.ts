import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp}'],
      },
      manifest: {
        name: 'U-PetFinder - UAE Lost & Found Pets',
        short_name: 'U-PetFinder',
        description: 'Reconnecting lost pets with their families across the UAE',
        theme_color: '#FF9F1C',
        background_color: '#F5F0E6',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  base: '/upetfinder/',
  server: {
    port: 5173,
    open: true
  }
});
