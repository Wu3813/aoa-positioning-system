<template>
  <el-container class="layout">
    <!-- 侧边栏 -->
    <el-aside class="sidebar" :class="{ 'sidebar-collapsed': isCollapsed }">
      <div class="logo">
        <h3 v-show="!isCollapsed">{{ $t('system.titleShort') }}</h3>
        <h3 v-show="isCollapsed" class="logo-collapsed">AOA</h3>
      </div>
      
      <el-menu
        :default-active="route.path"
        class="menu"
        router
        background-color="#fff"
        text-color="#333"
        active-text-color="#409EFF"
        :collapse="isCollapsed"
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
          <el-tooltip 
            :content="isCollapsed ? t('common.expandSidebar') : t('common.collapseSidebar')" 
            placement="bottom"
            ref="sidebarTooltip"
          >
            <el-button 
              @click="handleSidebarToggle"
              size="small"
              circle
              class="sidebar-toggle-btn"
            >
              <el-icon :size="18">
                <Expand v-if="isCollapsed" />
                <Fold v-else />
              </el-icon>
            </el-button>
          </el-tooltip>
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
import { Monitor, User, Location, Odometer, Connection, PriceTag, DataAnalysis, Place, Setting, Bell, Expand, Fold } from '@element-plus/icons-vue'
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
const isCollapsed = ref(false)
const sidebarTooltip = ref(null)

// 初始化用户信息
onMounted(() => {
  // 设置根节点 lang，便于基于语言进行全局样式控制
  try {
    document.documentElement.setAttribute('lang', currentLocale.value)
  } catch (e) {
    // 忽略环境不支持的情况
  }
  
  // 从本地存储恢复侧边栏状态
  const savedCollapsed = localStorage.getItem('sidebarCollapsed')
  if (savedCollapsed !== null) {
    isCollapsed.value = JSON.parse(savedCollapsed)
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

// 切换侧边栏
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed.value))
  
  // 触发自定义事件，通知其他组件侧边栏状态变化
  window.dispatchEvent(new CustomEvent('sidebarToggle', {
    detail: { collapsed: isCollapsed.value }
  }))
}

// 处理侧边栏切换，同时隐藏tooltip
const handleSidebarToggle = () => {
  toggleSidebar()
  // 强制隐藏tooltip
  if (sidebarTooltip.value) {
    sidebarTooltip.value.hide()
  }
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
  transition: width 0.3s ease;
}

.sidebar-collapsed {
  width: 64px !important;
  min-width: 64px;
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

.logo-collapsed {
  font-size: 12px;
  text-align: center;
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
  display: flex;
  align-items: center;
}

.sidebar-toggle-btn {
  flex-shrink: 0;
  border: 1px solid #dcdfe6;
  background-color: #fff;
  transition: all 0.3s ease;
}

.sidebar-toggle-btn:hover {
  border-color: #409EFF;
  color: #409EFF;
  background-color: #f0f9ff;
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