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
// 开发环境中，设置为本地开发服务器地址
axios.defaults.baseURL = 'http://localhost:8080'

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus)
app.use(router)
app.mount('#app')
