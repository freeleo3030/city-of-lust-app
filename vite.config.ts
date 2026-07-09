import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/comfy': {
        target: 'https://nhs-pointer-belle-slip.trycloudflare.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/comfy/, ''),
      },
    },
  },
})
