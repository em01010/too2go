import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // Una sola copia de React en el monorepo (Expo fija la versión de react en apps/mobile).
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
  },
});
