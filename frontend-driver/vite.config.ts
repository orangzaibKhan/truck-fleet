import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import os from 'os';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Fleet Monitor Driver',
        short_name: 'FM Driver',
        description: 'Driver app for Fleet Monitor - shifts, inspections, trips, and more',
        theme_color: '#0B0F14',
        background_color: '#0B0F14',
        display: 'standalone',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 3002,
  },
  cacheDir: path.join(os.tmpdir(), 'vite-cache-fleet-monitor-driver'),
});
