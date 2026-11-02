import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

/**
 * Tailwind's Vite plugin regenerates CSS when a file it already scanned changes, but a file
 * created while the dev server runs isn't on that list, so its classes stay missing until the
 * stylesheet is touched. This reloads the stylesheets when a source file is added.
 */
function tailwindRescanOnAdd(): Plugin {
  return {
    name: 'tailwind-rescan-on-add',
    apply: 'serve',
    configureServer(server) {
      server.watcher.on('add', (file) => {
        if (!/\.(tsx?|jsx?|mdx|html)$/.test(file) || file.includes('node_modules')) return
        for (const [cssFile, modules] of server.moduleGraph.fileToModulesMap) {
          if (!cssFile.endsWith('.css')) continue
          for (const mod of modules) void server.reloadModule(mod)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tailwindRescanOnAdd(),
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
