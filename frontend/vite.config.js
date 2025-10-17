import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
    viteCompression({ algorithm: 'gzip', ext: '.gz' }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0',
  },
})
