<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="aside">
      <div class="logo">
        <h2>{{ isCollapse ? 'AOA' : 'AOA监控系统' }}</h2>
      </div>
      <el-menu
        :default-active="route.path"
        class="el-menu-vertical"
        :collapse="isCollapse"
        router
        background-color="#fff"
        text-color="var(--text-primary)"
        active-text-color="var(--primary-color)"
      >
        <el-menu-item index="/home">
          <el-icon><Monitor /></el-icon>
          <span>轨迹监控</span>
        </el-menu-item>
        <!-- 只有管理员可以看到用户管理 -->
        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <!-- 只有管理员可以看到地图管理 -->
        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/maps">
          <el-icon><Location /></el-icon>
          <span>地图管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container class="main-container">
      <el-header class="header">
        <div class="header-left">
          <el-icon class="toggle-icon" @click="toggleSidebar">
            <component :is="isCollapse ? 'Expand' : 'Fold'" />
          </el-icon>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              {{ userInfo.username }} 
              <el-tag size="small" :type="userInfo.role === 'admin' ? 'danger' : 'info'" style="margin: 0 8px;">
                {{ userInfo.role === 'admin' ? '管理员' : '普通用户' }}
              </el-tag>
              <el-icon><CaretBottom /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main">
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Monitor, User, Location, Fold, Expand, CaretBottom } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const isCollapse = ref(false)
const userInfo = ref({
  username: '',
  role: ''
})

// 初始化用户信息
onMounted(() => {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      userInfo.value = JSON.parse(userStr)
    } catch (e) {
      console.error('解析用户信息失败:', e)
      handleLogout()
    }
  } else {
    // 未登录，跳转到登录页
    router.push('/login')
  }
})

const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}

const handleLogout = () => {
  ElMessageBox.confirm('确认退出登录？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 清除用户信息
    localStorage.removeItem('user')
    router.push('/login')
  })
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  width: 100vw;
  position: fixed;
  top: 0;
  left: 0;
  overflow: hidden;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: var(--text-primary);
  font-size: 18px;
  white-space: nowrap;
  overflow: hidden;
  background-color: #fff;
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--box-shadow);
}

.aside {
  height: 100vh;
  transition: width 0.3s;
  overflow: hidden;
  background-color: #fff;
  position: fixed;
  left: 0;
  top: 0;
  border-right: 1px solid rgba(0, 0, 0, 0.05);  /* 更柔和的分割线 */
}

.header {
  position: fixed;
  top: 0;
  right: 0;
  left: 220px;
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);  /* 更柔和的分割线 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);  /* 更柔和的阴影 */
  transition: left 0.3s;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;  /* 增大字体 */
  color: var(--text-primary);
  cursor: pointer;
  padding: 0 4px;
}

:deep(.el-icon) {
  font-size: 18px;  /* 图标也相应增大 */
  margin-top: 1px;
}

:deep(.el-menu) {
  border-right: none;
  margin-top: 1px;  /* 与顶部边框对齐 */
}

:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
  color: var(--text-primary) !important;
}

:deep(.el-menu-item:hover),
:deep(.el-menu-item.is-active) {
  background-color: var(--background-color) !important;
  color: var(--primary-color) !important;
}

/* 修改菜单背景色 */
.el-menu-vertical {
  background-color: #fff !important;
}

:deep(.el-menu--collapse) {
  width: 64px;
}

.toggle-icon {
  font-size: 20px;
  cursor: pointer;
  color: var(--primary-color);
}

.main-container {
  min-height: 100vh;
  margin-left: 220px;
  transition: margin-left 0.3s;
}

.header {
  position: fixed;
  top: 0;
  right: 0;
  left: 220px;
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  transition: left 0.3s;
}

.main {
  padding: 20px;
  background: var(--background-color);
  margin-top: 60px;  /* 为顶部导航栏留出空间 */
  min-height: calc(100vh - 60px);
  overflow-y: auto;
}

/* 处理侧边栏折叠时的布局调整 */
.layout-container:has(.aside.is-collapse) {
  .main-container {
    margin-left: 64px;
  }
  
  .header {
    left: 64px;
  }
}
</style>