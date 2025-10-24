import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import { useTrackingStore } from './stores/trackingStore'
import i18n from './i18n'
import { createGeofenceTranslationFunction } from './utils/geofenceTranslations'
import { Expand, Fold } from '@element-plus/icons-vue'

// 设置基础URL
// 开发环境中，设置为本地开发服务器地址
axios.defaults.baseURL = 'http://localhost:8080'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(ElementPlus, {
  locale: i18n.global.locale.value === 'zh-CN' ? zhCn : en,
})

// 全局注册图标组件
app.component('Expand', Expand)
app.component('Fold', Fold)

// 确保在应用启动时就设置根节点语言，配合 base.css 中的 :lang 选择器统一字体回退
try {
  const savedLocale = localStorage.getItem('locale') || i18n.global.locale.value
  document.documentElement.setAttribute('lang', savedLocale)
} catch (e) {
  // 忽略环境不支持的情况
}

// 初始化轨迹追踪系统
const trackingStore = useTrackingStore()
trackingStore.init()

// 设置翻译函数（在 i18n 初始化后）
const currentLocale = localStorage.getItem('locale') || 'zh-CN'
const translationFunction = createGeofenceTranslationFunction(currentLocale)
trackingStore.setGeofenceTranslation(translationFunction)

trackingStore.startAutoConnect()

// 在页面卸载前清理资源
window.addEventListener('beforeunload', () => {
  trackingStore.cleanup()
})

app.mount('#app')
