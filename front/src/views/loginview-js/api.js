import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

export function createLoginAPI(data) {
  const { t } = useI18n()

  // 登录接口
  const login = async (loginData) => {
    try {
      const response = await axios.post('/api/users/login', loginData)
      ElMessage.success(t('login.loginSuccess'))
      // 保存用户信息到 localStorage
      localStorage.setItem('user', JSON.stringify(response.data))
      return { success: true, data: response.data }
    } catch (error) {
      if (error.response?.status === 401) {
        ElMessage.error(t('login.invalidCredentials'))
      } else {
        ElMessage.error(t('login.loginFailed'))
      }
      return { success: false, error }
    }
  }

  return {
    login
  }
}
