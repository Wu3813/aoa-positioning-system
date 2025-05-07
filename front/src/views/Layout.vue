<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="aside">
      <div class="logo">
        <h3>{{ isCollapse ? 'AoA' : 'AoA定位MVP系统' }}</h3>
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
          <span>实时轨迹</span>
        </el-menu-item>
        
        <!-- 只有管理员可以看到地图管理 -->
        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/maps">
          <el-icon><Location /></el-icon>
          <span>地图管理</span>
        </el-menu-item>
        
        <!-- 添加基站管理菜单项 -->
        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/stations">
          <el-icon><Odometer /></el-icon>
          <span>基站管理</span>
        </el-menu-item>
        
        <!-- 添加引擎管理菜单项 -->
        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/engines">
          <el-icon><Connection /></el-icon>
          <span>引擎管理</span>
        </el-menu-item>
        
        <!-- 添加标签管理菜单项 -->
        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/tags">
          <el-icon><PriceTag /></el-icon>
          <span>标签管理</span>
        </el-menu-item>
        
        <!-- 只有管理员可以看到用户管理 -->
        <el-menu-item v-if="userInfo.role === 'admin'" index="/home/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
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
import { Monitor, User, Location, Fold, Expand, CaretBottom, Odometer, Connection, PriceTag } from '@element-plus/icons-vue'
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
  /* border-bottom: 1px solid var(--border-color); */ /* 移除底部边框 */
  /* box-shadow: var(--box-shadow); */ /* 移除阴影 */
}

.aside {
  height: 100vh;
  transition: width 0.3s;
  overflow: hidden;
  background-color: #fff;
  position: fixed;
  left: 0;
  top: 0;
  /* border-right: 1px solid rgba(0, 0, 0, 0.05); */ /* 移除右侧边框 */
}

.header {
  position: fixed;
  top: 0;
  right: 0;
  left: 220px;
  z-index: 100;
  background: #fff;
  /* border-bottom: 1px solid rgba(0, 0, 0, 0.05); */ /* 移除底部边框 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  /* box-shadow: var(--box-shadow); */ /* 移除阴影 */
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
  position: fixed; /* 固定在页面顶部 */
  top: 0;          /* 距离顶部 0px */
  right: 0;        /* 距离右侧 0px */
  left: 220px;     /* 初始状态下距离左侧 220px */
  z-index: 100;    /* 确保在其他内容之上 */
  background: #fff; /* 设置背景色为白色 */
  display: flex;   /* 使用 flex 布局排列内部元素 */
  justify-content: space-between; /* 让左右两部分分开 */
  align-items: center; /* 垂直居中对齐内部元素 */
  padding: 0 20px; /* 左右内边距 */
  height: 61px;    /* 控制框体的高度 */
  transition: left 0.3s; /* 使左边距变化时有动画效果 */
}

.main {
  padding: 5px; 
  background: var(--background-color);
  margin-top: 60px;  
  min-height: calc(100vh - 60px);
  overflow-y: auto;
}

/* 处理侧边栏折叠时的布局调整 */
.layout-container:has(.aside.is-collapse) {
  .main-container {
    margin-left: 64px;
  }
  
  .header {
    left: 64px; /* 侧边栏折叠时，距离左侧变为 64px */
  }
}
</style>