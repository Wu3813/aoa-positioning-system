import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'

export function createLoginData() {
  const { t } = useI18n()
  
  // 响应式数据
  const loginFormRef = ref(null)
  const loading = ref(false)
  const currentLocale = ref('zh-CN')

  // 登录表单
  const loginForm = reactive({
    username: '',
    password: ''
  })

  // 表单验证规则
  const loginRules = {
    username: [
      { required: true, message: t('login.usernamePlaceholder'), trigger: 'blur' }
    ],
    password: [
      { required: true, message: t('login.passwordPlaceholder'), trigger: 'blur' }
    ]
  }

  return {
    // 响应式数据
    loginFormRef,
    loading,
    currentLocale,
    loginForm,
    loginRules
  }
}
