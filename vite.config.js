import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const localCacheDir = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'NearBuy', '.vite-cache')
  : '.vite-cache'

// https://vite.dev/config/
export default defineConfig({
  cacheDir: localCacheDir,
  build: {
    emptyOutDir: true,
  },
  plugins: [react(),tailwindcss(),],
})
