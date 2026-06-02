import { defineConfig } from 'vite'
import path from 'path'

import react from '@vitejs/plugin-react'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  root: __dirname,

  plugins: [
    figmaAssetResolver(),
    react(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: '127.0.0.1',
    allowedHosts: ['immobile-evasion-chef.ngrok-free.dev'],
  },

  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true,
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],
})
