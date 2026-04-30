import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          state: ['@reduxjs/toolkit', 'react-redux', 'zustand', '@tanstack/react-query']
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        // In Docker the backend is at backend:8000; locally it's localhost:8000
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
