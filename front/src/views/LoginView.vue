<template>
  <div class="login-container">
    <div class="login-content">
      <div class="login-left">
        <img src="@/assets/login-bg.jpg" alt="登录背景" class="login-image" />
      </div>
      <div class="login-right">
        <el-card class="login-box">
          <div class="login-header">
            <h2>AOA 监控系统</h2>
            <p>欢迎登录</p>
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
                placeholder="请输入用户名"
                :prefix-icon="User"
              />
            </el-form-item>
            
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                :prefix-icon="Lock"
                show-password
              />
            </el-form-item>
            
            <el-form-item>
              <el-button
                type="primary"
                :loading="loading"
                class="login-button"
                @click="handleLogin"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { User, Lock } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

// 添加表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    await loginFormRef.value.validate()
    loading.value = true
    
    const response = await axios.post('/api/users/login', loginForm)
    
    ElMessage.success('登录成功')
    // 可以保存用户信息到 localStorage 或 vuex
    localStorage.setItem('user', JSON.stringify(response.data))
    router.push('/home')
  } catch (error) {
    if (error.response?.status === 401) {
      ElMessage.error('用户名或密码错误')
    } else {
      ElMessage.error('登录失败，请稍后重试')
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
  justify-content: center;
  align-items: center;
  background: #fff;
  padding: 40px;
  min-width: 400px;  /* 设置最小宽度 */
}

.login-box {
  width: 320px;
  box-shadow: none;
  background: transparent;
  border: none;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-header h2 {
  font-size: 28px;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.login-header p {
  color: var(--text-secondary);
  font-size: 16px;
}
</style>