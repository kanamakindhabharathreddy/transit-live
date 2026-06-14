import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/bmtc-api': {
        target: 'https://bmtcmobileapi.karnataka.gov.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bmtc-api/, ''),
        secure: false, // In case of cert issues
      }
    }
  }
})
