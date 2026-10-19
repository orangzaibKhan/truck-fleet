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
        name: 'Fleet Monitor (Prototype)',
        short_name: 'Fleet Monitor',
        description: 'Simulated dump-truck fleet monitoring prototype',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
  },
  // Dependency pre-bundling cache moved off D:\Claude - directory renames inside
  // this project's node_modules keep failing with EPERM (something in this
  // environment locks newly-written files/dirs here; same symptom hit rm/mv too).
  cacheDir: path.join(os.tmpdir(), 'vite-cache-fleet-monitor-frontend'),
});
