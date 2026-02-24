import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Create an absolute path to your style.css
const stylePath = fileURLToPath(new URL('./src/style.css', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Inject the absolute path instead of the alias
        additionalData: `@reference "${stylePath}";\n`
      }
    }
  }
})