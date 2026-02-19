import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — rarely changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Animation — large, rarely changes
          'vendor-motion': ['framer-motion'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Charting (only used by ReviewPage lazy chunk)
          'vendor-recharts': ['recharts'],
        },
      },
    },
  },
})
