import { defineConfig } from 'vite'
import path from 'path'

import react from '@vitejs/plugin-react'

export default defineConfig({
  root: __dirname,
  envDir: path.resolve(__dirname, '..'),

  plugins: [react()],

  server: {
    host: '127.0.0.1',
    allowedHosts: ['immobile-evasion-chef.ngrok-free.dev'],
  },

  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true,
  },
})
