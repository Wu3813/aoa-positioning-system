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
import { User, Lock } from '@element-plus/icons-vue'
import { useLoginView } from './loginview-js'

// 使用登录页面逻辑
const {
  loginFormRef,
  loading,
  currentLocale,
  loginForm,
  loginRules,
  changeLocale,
  handleLogin,
  onMountedHandler
} = useLoginView()

// 生命周期
onMountedHandler()
</script>

<style scoped>
@import '@/assets/styles/login-view.css';
</style>