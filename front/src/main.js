import './assets/styles/variables.css'
import './assets/main.css'

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import { createPinia } from 'pinia'

// 设置基础URL
// 在生产环境中使用相对路径，让Nginx处理代理
axios.defaults.baseURL = ''

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus)
app.use(router)
app.mount('#app')
