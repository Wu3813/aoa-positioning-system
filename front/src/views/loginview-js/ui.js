import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

export function createLoginUI(data, api) {
  const { locale } = useI18n()
  const router = useRouter()

  // 语言切换处理
  const changeLocale = (newLocale) => {
    locale.value = newLocale
    localStorage.setItem('locale', newLocale)
    // 重新加载页面以应用新的语言设置
    window.location.reload()
  }

  // 登录处理
  const handleLogin = async () => {
    if (!data.loginFormRef.value) return
    
    try {
      await data.loginFormRef.value.validate()
      data.loading.value = true
      
      const result = await api.login(data.loginForm)
      
      if (result.success) {
        // 登录成功，跳转到首页
        router.push('/home')
      }
    } catch (error) {
      console.error('登录验证失败:', error)
    } finally {
      data.loading.value = false
    }
  }

  return {
    changeLocale,
    handleLogin
  }
}
