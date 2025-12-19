import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Manter console.log para debug
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'phaser': ['phaser'],
        },
      },
    },
    sourcemap: false, // Desabilitar em produção para menor tamanho
    chunkSizeWarningLimit: 1000,
  },
});

