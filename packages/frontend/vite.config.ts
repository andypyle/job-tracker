import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@jobtracker/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  optimizeDeps: {
    // Animated icons are dynamic imports, which Vite only finds at runtime. Pre-bundling them
    // avoids a dependency re-optimization (and full reload) the first time an icon appears.
    include: ['react-useanimations', 'react-useanimations/lib/*'],
  },
  server: {
    port: 5173,
  },
})
