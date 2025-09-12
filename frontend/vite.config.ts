import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Disable React Fast Refresh to avoid Edge cache glitches on /@react-refresh
  plugins: [react({ fastRefresh: false })],
  server: {
    // Use a fixed port and bind to all interfaces so Windows/WSL browsers
    // can reach the dev server. Switching to 3002 to fully bypass any
    // persistent browser cache entries lingering for previous ports during dev.
    port: 3002,
    strictPort: true,
    host: true,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
