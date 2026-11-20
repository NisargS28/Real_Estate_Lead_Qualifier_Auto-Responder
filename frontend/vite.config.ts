import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The browser only ever talks to /api on its own origin; Vite proxies it to the backend in dev,
// so no backend URL or key is compiled into the bundle.
export default defineConfig({
  plugins: [react()],
  // Vercel Services route browser /api calls on the same domain. Runtime
  // service bindings cannot be compiled into this static browser bundle.
  ...(process.env.VERCEL === '1' ? { define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') } } : {}),
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: false },
    },
  },
  preview: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: false },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
