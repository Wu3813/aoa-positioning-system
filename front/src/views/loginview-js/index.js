import { onMounted } from 'vue'
import { createLoginData } from './data'
import { createLoginAPI } from './api'
import { createLoginUI } from './ui'

export function useLoginView() {
  // 创建数据管理
  const data = createLoginData()
  
  // 创建API操作
  const api = createLoginAPI(data)
  
  // 创建UI交互
  const ui = createLoginUI(data, api)

  // 生命周期处理
  const onMountedHandler = () => {
    // 从localStorage获取保存的语言设置
    const savedLocale = localStorage.getItem('locale')
    if (savedLocale) {
      data.currentLocale.value = savedLocale
    }
  }

  return {
    // 响应式数据
    loginFormRef: data.loginFormRef,
    loading: data.loading,
    currentLocale: data.currentLocale,
    loginForm: data.loginForm,
    loginRules: data.loginRules,
    
    // UI方法
    changeLocale: ui.changeLocale,
    handleLogin: ui.handleLogin,
    
    // 生命周期
    onMountedHandler
  }
}
