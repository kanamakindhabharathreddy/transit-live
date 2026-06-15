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
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('proxy error', err.message);
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Proxy Error' }));
            }
          });
        }
      },
      '/api/apsrtc': {
        target: 'https://utsappapicached01.apsrtconline.in/uts-vts-api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/apsrtc/, ''),
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('APSRTC proxy error', err.message);
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'APSRTC Proxy Error' }));
            }
          });
        }
      }
    }
  }
})
