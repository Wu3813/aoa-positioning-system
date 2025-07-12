import './assets/styles/variables.css'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import { useTrackingStore } from './stores/tracking'

// 设置基础URL
// 开发环境中，设置为本地开发服务器地址
axios.defaults.baseURL = 'http://localhost:8080'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})

// 初始化轨迹追踪系统
const trackingStore = useTrackingStore()
trackingStore.init()
trackingStore.startAutoConnect()

// 在页面卸载前清理资源
window.addEventListener('beforeunload', () => {
  trackingStore.cleanup()
})

app.mount('#app')
