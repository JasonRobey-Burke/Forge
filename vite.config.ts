import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@/': path.resolve(__dirname, 'src/client') + '/',
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Disable buffering for SSE (Server-Sent Events) on /api/events
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.url?.startsWith('/api/events')) {
              proxyReq.setHeader('Accept', 'text/event-stream');
            }
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            if (req.url?.startsWith('/api/events')) {
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['x-accel-buffering'] = 'no';
            }
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist/client',
  },
});
