import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path' // 确保引入 path (如果 resolve.alias 使用 __dirname)

export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      // '@': fileURLToPath(new URL('./src', import.meta.url)) // Vite 推荐的方式
      '@': path.resolve(__dirname, './src') // 或者使用 path 和 __dirname
    },
  },
  // --- 开发服务器配置 ---
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      // API请求代理
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // WebSocket代理
      '/ws-path': {
        target: 'ws://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
      // 上传文件代理
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
