<template>
  <el-container class="layout">
    <!-- 侧边栏 -->
    <el-aside class="sidebar">
      <div class="logo">
        <h3>{{ $t('system.titleShort') }}</h3>
      </div>
      
      <el-menu
        :default-active="route.path"
        class="menu"
        router
        background-color="#fff"
        text-color="#333"
        active-text-color="#409EFF"
        :collapse="false"
      >
        <el-menu-item index="/home">
          <el-icon><Monitor /></el-icon>
          <span>{{ $t('menu.realtime') }}</span>
        </el-menu-item>
        
        <el-menu-item index="/home/history">
          <el-icon><DataAnalysis /></el-icon>
          <span>{{ $t('menu.history') }}</span>
        </el-menu-item>

        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/maps">
          <el-icon><Location /></el-icon>
          <span>{{ $t('menu.maps') }}</span>
        </el-menu-item>

        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/geofence">
          <el-icon><Place /></el-icon>
          <span>{{ $t('menu.geofence') }}</span>
        </el-menu-item>
        
        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/stations">
          <el-icon><Odometer /></el-icon>
          <span>{{ $t('menu.stations') }}</span>
        </el-menu-item>
        
        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/engines">
          <el-icon><Connection /></el-icon>
          <span>{{ $t('menu.engines') }}</span>
        </el-menu-item>
        
        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/tags">
          <el-icon><PriceTag /></el-icon>
          <span>{{ $t('menu.tags') }}</span>
        </el-menu-item>
        
        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/users">
          <el-icon><User /></el-icon>
          <span>{{ $t('menu.users') }}</span>
        </el-menu-item>
        
        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/alarms">
          <el-icon><Bell /></el-icon>
          <span>{{ $t('menu.alarms') }}</span>
        </el-menu-item>
        
        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/admin">
          <el-icon><Setting /></el-icon>
          <span>{{ $t('menu.admin') }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <!-- 主内容区 -->
    <el-container class="main">
      <!-- 顶部栏 -->
      <el-header class="header">
        <div class="header-left">
          <!-- 左侧区域，可以放置其他内容 -->
        </div>
        
        <div class="header-right">
          <div class="language-switcher">
            <el-select v-model="currentLocale" @change="changeLocale" size="small" style="width: 100px;">
              <el-option label="简体中文" value="zh-CN" />
              <el-option label="繁體中文" value="zh-TW" />
              <el-option label="English" value="en-US" />
            </el-select>
          </div>
          
          <div class="user-info">
            <span class="username">{{ userInfo.username }}</span>
            <el-tag size="small" :type="userInfo.role === 'admin' ? 'danger' : 'info'">
              {{ userInfo.role === 'admin' ? $t('common.admin') : $t('common.user') }}
            </el-tag>
            <el-button type="danger" size="small" @click="handleLogout">
              {{ $t('common.logout') }}
            </el-button>
          </div>
        </div>
      </el-header>
      
      <!-- 页面内容 -->
      <el-main class="content">
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Monitor, User, Location, Odometer, Connection, PriceTag, DataAnalysis, Place, Setting, Bell } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { createGeofenceTranslationFunction } from '@/utils/geofenceTranslations'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const userInfo = ref({
  username: '',
  role: ''
})
const currentLocale = ref(locale.value)

// 初始化用户信息
onMounted(() => {
  // 设置根节点 lang，便于基于语言进行全局样式控制
  try {
    document.documentElement.setAttribute('lang', currentLocale.value)
  } catch (e) {
    // 忽略环境不支持的情况
  }
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      userInfo.value = JSON.parse(userStr)
    } catch (e) {
      console.error('解析用户信息失败:', e)
      handleLogout()
    }
  } else {
    router.push('/login')
  }
})

// 语言切换
const changeLocale = async (newLocale) => {
  locale.value = newLocale
  localStorage.setItem('locale', newLocale)
  try {
    document.documentElement.setAttribute('lang', newLocale)
  } catch (e) {
    // 忽略环境不支持的情况
  }
  
  // 更新围栏管理器的翻译函数，避免页面重载导致通知消失
  const { useTrackingStore } = await import('@/stores/trackingStore')
  const trackingStore = useTrackingStore()
  
  const translationFunction = createGeofenceTranslationFunction(locale.value)
  trackingStore.setGeofenceTranslation(translationFunction)
}

// 登出
const handleLogout = () => {
  ElMessageBox.confirm(t('user.logoutConfirm'), t('user.tip'), {
    confirmButtonText: t('common.confirm'),
    cancelButtonText: t('common.cancel'),
    type: 'warning'
  }).then(() => {
    localStorage.removeItem('user')
    router.push('/login')
  })
}
</script>

<style scoped>
.layout {
  height: 100vh;
}

.sidebar {
  background: #fff;
  min-width: 140px;
  width: auto;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: left;
  padding: 0 20px;
}

.logo h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.menu {
  border-right: none;
  width: 100%;
}

.menu .el-menu-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.main {
  background: #f5f5f5;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left {
  /* 左侧区域样式 */
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 14px;
  color: #333;
}

.language-switcher {
  display: flex;
  align-items: center;
}

.content {
  padding: 5px;
  background: #f5f5f5;
}
</style>