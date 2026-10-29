import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    include: ['cesium'],
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 8000,
  },
});
