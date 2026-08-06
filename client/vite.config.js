import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Force all packages to use the same React instance
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  optimizeDeps: {
    // Ensure Clerk and React are pre-bundled together so they share one instance
    include: [
      'react',
      'react-dom',
      '@clerk/clerk-react',
    ],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
              if (res.headersSent) return
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Backend server restarting or unavailable.' }))
            }
          })
        },
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
