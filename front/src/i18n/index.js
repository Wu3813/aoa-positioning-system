import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import zhTW from './locales/zh-TW'
import enUS from './locales/en-US'

const i18n = createI18n({
  legacy: false, // 使用Composition API模式
  locale: localStorage.getItem('locale') || 'zh-CN', // 默认语言
  fallbackLocale: 'zh-CN', // 回退语言
  messages: {
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    'en-US': enUS
  }
})

export default i18n
