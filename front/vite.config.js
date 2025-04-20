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
  // --- 添加 server 配置 ---
  server: {
    proxy: {
      // 将所有 /api 开头的请求代理到后端服务器
      '/api': {
        target: 'http://localhost:8080', // 你的后端 API 地址
        changeOrigin: true, // 必须设置为 true，表示需要虚拟主机站点
        // 如果后端 API 路径本身不包含 /api 前缀，则需要重写路径
        // 例如，如果后端接口是 /maps/{id}/image 而不是 /api/maps/{id}/image
        // rewrite: (path) => path.replace(/^\/api/, '') 
      }
    }
  }
  // --- 结束添加 ---
})
