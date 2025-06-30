<template>
  <div class="admin-view-container">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>系统管理</h2>
        <!-- 导航菜单 - 替换原来的卡片 -->
        <div class="admin-nav">
          <el-menu mode="horizontal" :router="false" @select="handleMenuSelect">
            <el-menu-item index="task">
              <el-icon><List /></el-icon>
              <span>任务管理</span>
            </el-menu-item>
            <el-menu-item index="database">
              <el-icon><Coin /></el-icon>
              <span>数据库管理</span>
            </el-menu-item>
          </el-menu>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <div class="admin-content-wrapper">
        <!-- 任务管理界面 -->
        <div v-if="activeModule === 'task'" class="content-module">
          <el-scrollbar class="module-scrollbar">
            <el-card class="config-card">
              <template #header>
                <div class="card-header">
                  <span>任务管理</span>
                  <el-button type="primary" @click="saveTaskConfig" :loading="saving">保存配置</el-button>
                </div>
              </template>
              
              <!-- 基站刷新任务 -->
              <el-row :gutter="20">
                <el-col :xs="24" :sm="24" :md="12">
                  <el-card class="task-card" shadow="hover">
                    <template #header>
                      <div class="task-header">
                        <el-icon><Monitor /></el-icon>
                        <span>基站刷新任务</span>
                      </div>
                    </template>
                    
                    <el-form label-width="120px">
                      <el-form-item label="启用状态:">
                        <el-switch 
                          v-model="taskConfig.stationTask.enabled"
                          active-text="启用" 
                          inactive-text="禁用" />
                      </el-form-item>
                      <el-form-item label="刷新间隔:">
                        <el-input-number 
                          v-model="taskConfig.stationTask.intervalMs"
                          :min="1000"
                          :max="3600000"
                          :step="1000"
                          controls-position="right"
                          style="width: 200px" />
                        <span style="margin-left: 8px; color: #909399;">毫秒</span>
                      </el-form-item>
                    </el-form>
                  </el-card>
                </el-col>
                
                <!-- 轨迹发送任务 -->
                <el-col :xs="24" :sm="24" :md="12">
                  <el-card class="task-card" shadow="hover">
                    <template #header>
                      <div class="task-header">
                        <el-icon><Position /></el-icon>
                        <span>轨迹发送任务</span>
                      </div>
                    </template>
                    
                    <el-form label-width="120px">
                      <el-form-item label="启用状态:">
                        <el-switch 
                          v-model="taskConfig.trajectoryTask.enabled"
                          active-text="启用" 
                          inactive-text="禁用" />
                      </el-form-item>
                      <el-form-item label="发送间隔:">
                        <el-input-number 
                          v-model="taskConfig.trajectoryTask.sendIntervalMs"
                          :min="100"
                          :max="5000"
                          :step="100"
                          controls-position="right"
                          style="width: 200px" />
                        <span style="margin-left: 8px; color: #909399;">毫秒</span>
                      </el-form-item>
                      <el-form-item label="暂停时间:">
                        <el-input-number 
                          v-model="taskConfig.trajectoryTask.pauseMs"
                          :min="5000"
                          :max="300000"
                          :step="1000"
                          controls-position="right"
                          style="width: 200px" />
                        <span style="margin-left: 8px; color: #909399;">毫秒</span>
                      </el-form-item>
                    </el-form>
                  </el-card>
                </el-col>
              </el-row>
              
              <div class="actions">
                <el-button type="primary" @click="saveTaskConfig" :loading="saving">保存配置</el-button>
              </div>
            </el-card>
          </el-scrollbar>
        </div>
        
        <!-- 数据库管理界面 -->
        <div v-if="activeModule === 'database'" class="content-module">
          <el-scrollbar class="module-scrollbar">
            <el-card class="config-card">
              <template #header>
                <div class="card-header">
                  <span>数据库管理</span>
                  <el-button type="primary" @click="saveTaskConfig" :loading="saving">保存配置</el-button>
                </div>
              </template>
              
              <!-- 轨迹存储任务 -->
              <el-card class="task-card" shadow="hover">
                <template #header>
                  <div class="task-header">
                    <el-icon><Monitor /></el-icon>
                    <span>轨迹存储任务</span>
                    <el-tag type="success" size="small" style="margin-left: 10px;">始终开启</el-tag>
                  </div>
                </template>
                
                <el-form label-width="120px">
                  <el-form-item label="存储间隔:">
                    <el-input-number 
                      v-model="taskConfig.storageTask.intervalMs"
                      :min="1000"
                      :max="30000"
                      :step="1000"
                      controls-position="right"
                      style="width: 200px" />
                    <span style="margin-left: 8px; color: #909399;">毫秒</span>
                  </el-form-item>
                  <el-alert
                    title="注意：此任务负责将实时轨迹数据存储到数据库中，不可禁用。"
                    type="info"
                    show-icon
                    :closable="false"
                  />
                </el-form>
              </el-card>
              
              <div class="actions">
                <el-button type="primary" @click="saveTaskConfig" :loading="saving">保存配置</el-button>
              </div>
            </el-card>
          </el-scrollbar>
        </div>
        
        <!-- 默认空状态 -->
        <el-empty v-if="!activeModule" description="请选择上方功能进行操作..." />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { List, Coin, Monitor, Position } from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const activeModule = ref('') // 当前激活的模块：'task' 或 'database'
const saving = ref(false)
const taskConfig = reactive({
  stationTask: {
    enabled: true,
    intervalMs: 60000
  },
  trajectoryTask: {
    enabled: false,
    sendIntervalMs: 300,
    pauseMs: 20000
  },
  storageTask: {
    intervalMs: 5000
  }
})

// 加载任务配置
const loadTaskConfig = async () => {
  try {
    const response = await axios.get('/api/admin/tasks/config')
    Object.assign(taskConfig, response.data)
  } catch (error) {
    ElMessage.error('加载任务配置失败')
    console.error('加载任务配置失败:', error)
  }
}

// 保存任务配置
const saveTaskConfig = async () => {
  saving.value = true
  try {
    await axios.post('/api/admin/tasks/config', taskConfig)
    ElMessage.success('任务配置保存成功')
  } catch (error) {
    ElMessage.error('保存任务配置失败')
    console.error('保存任务配置失败:', error)
  } finally {
    saving.value = false
  }
}

// 处理菜单选择
const handleMenuSelect = (key) => {
  activeModule.value = key
  loadTaskConfig()
}

// 任务管理
const handleTaskManagement = () => {
  activeModule.value = 'task'
  loadTaskConfig()
}

// 数据库管理
const handleDatabaseManagement = () => {
  activeModule.value = 'database'
  loadTaskConfig()
}
</script>

<style scoped>
.admin-view-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.control-panel {
  padding: 0 20px;
  margin: 20px 0;
  display: flex;
  flex-shrink: 0;
}

.control-wrapper {
  border-radius: 8px;
  padding: 24px;
  background-color: #fff;
  flex: 1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.control-wrapper h2 {
  text-align: center;
  color: var(--el-text-color-primary);
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: 500;
}

.main-content {
  flex: 1;
  display: flex;
  padding: 0 20px;
  overflow: hidden;
  margin-bottom: 20px;
}

.admin-content-wrapper {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 导航菜单样式 */
.admin-nav {
  margin-top: 20px;
}

.admin-nav :deep(.el-menu) {
  display: flex;
  justify-content: center;
  border-bottom: none;
}

.admin-nav :deep(.el-menu-item) {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: auto;
  padding: 16px 24px;
  border-bottom: none;
}

.admin-nav :deep(.el-menu-item .el-icon) {
  margin-right: 0;
  margin-bottom: 8px;
  font-size: 24px;
}

/* 内容模块 */
.content-module {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.module-scrollbar {
  height: 100%;
}

.config-card {
  min-height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 500;
}

.task-card {
  margin-bottom: 20px;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
}

.task-header .el-icon {
  color: var(--el-color-primary);
}

.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-light);
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .control-panel, .main-content {
    padding: 0 10px;
  }
  
  .control-wrapper, .admin-content-wrapper {
    padding: 16px;
  }
  
  .task-header {
    flex-wrap: wrap;
  }
}
</style> 