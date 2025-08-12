<template>
  <div class="login-container">
    <div class="login-content">
      <div class="login-left">
        <img src="@/assets/login-bg.jpg" alt="登录背景" class="login-image" />
      </div>
      <div class="login-right">
        <!-- 语言切换器 -->
        <div class="language-switcher">
          <el-select 
            v-model="currentLocale" 
            @change="changeLocale" 
            size="small" 
            style="width: 100px;"
          >
            <el-option label="简体中文" value="zh-CN" />
            <el-option label="繁體中文" value="zh-TW" />
            <el-option label="English" value="en-US" />
          </el-select>
        </div>
        
        <div class="login-content-wrapper">
          <div class="login-header">
            <h2>{{ $t('login.title') }}</h2>
            <p>{{ $t('login.welcome') }}</p>
          </div>
          
          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            class="login-form"
          >
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                :placeholder="$t('login.usernamePlaceholder')"
                :prefix-icon="User"
                size="large"
              />
            </el-form-item>
            
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                :placeholder="$t('login.passwordPlaceholder')"
                :prefix-icon="Lock"
                show-password
                size="large"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button
                type="primary"
                :loading="loading"
                class="login-button"
                @click="handleLogin"
                size="large"
              >
                {{ $t('login.loginButton') }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { User, Lock } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const { t, locale } = useI18n()
const loginFormRef = ref(null)
const loading = ref(false)
const currentLocale = ref(locale.value)

const loginForm = reactive({
  username: '',
  password: ''
})

// 添加表单验证规则
const loginRules = {
  username: [
    { required: true, message: t('login.usernamePlaceholder'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('login.passwordPlaceholder'), trigger: 'blur' }
  ]
}

// 语言切换函数
const changeLocale = (newLocale) => {
  locale.value = newLocale
  localStorage.setItem('locale', newLocale)
  // 重新加载页面以应用新的语言设置
  window.location.reload()
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    await loginFormRef.value.validate()
    loading.value = true
    
    const response = await axios.post('/api/users/login', loginForm)
    
    ElMessage.success(t('login.loginSuccess'))
    // 可以保存用户信息到 localStorage 或 vuex
    localStorage.setItem('user', JSON.stringify(response.data))
    router.push('/home')
  } catch (error) {
    if (error.response?.status === 401) {
      ElMessage.error(t('login.invalidCredentials'))
    } else {
      ElMessage.error(t('login.loginFailed'))
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  background: var(--primary-gradient);
}

.login-content {
  display: flex;
  width: 100%;
  height: 100%;
}

.login-left {
  flex: 2;
  position: relative;
  overflow: hidden;
  background: #f0f2f5;  /* 添加背景色，防止图片加载前的空白 */
}

.login-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;  /* 图片居中显示 */
}

.login-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  position: relative;
  min-width: 500px;
  width: auto;
}

.language-switcher {
  position: absolute;
  top: 30px;
  right: 40px;
  z-index: 10;
}

.login-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 80px;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.login-header {
  text-align: center;
  margin-bottom: 50px;
  width: 100%;
}

.login-header h2 {
  font-size: 32px;
  color: var(--text-primary);
  margin-bottom: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.login-header p {
  color: var(--text-secondary);
  font-size: 18px;
  line-height: 1.5;
  white-space: nowrap;
}

.login-form {
  width: 100%;
  max-width: 400px;
  min-width: 350px;
}

.login-form .el-form-item {
  margin-bottom: 25px;
}

.login-form .el-input {
  --el-input-height: 50px;
  width: 100%;
}

.login-form .el-form-item {
  width: 100%;
}

.login-button {
  width: 100%;
  height: 50px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
}
</style>