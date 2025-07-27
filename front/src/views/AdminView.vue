<template>
  <div class="admin-view-container">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>系统管理</h2>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <div class="admin-content-wrapper">
        <el-scrollbar class="module-scrollbar">
          <!-- 轨迹存储任务 -->
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <el-icon><Monitor /></el-icon>
                  <span>轨迹存储任务</span>
                </div>
                <el-switch 
                  v-model="taskConfig.storageTask.enabled"
                  active-text="启用" 
                  inactive-text="禁用" />
              </div>
            </template>
            
            <div class="card-content">
              <el-form label-position="left" label-width="100px">
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
              </el-form>
              <el-alert
                title="注意: 此任务负责将实时轨迹数据存储到数据库中，禁用后系统将不再记录历史轨迹"
                type="warning"
                show-icon
                :closable="false"
              />
            </div>
          </el-card>

          <!-- 基站刷新任务 -->
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <el-icon><Monitor /></el-icon>
                  <span>基站状态自动刷新</span>
                </div>
                <el-switch 
                  v-model="taskConfig.stationTask.enabled"
                  active-text="启用" 
                  inactive-text="禁用" />
              </div>
            </template>
            
            <div class="card-content">
              <el-form label-position="left" label-width="100px">
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
            </div>
          </el-card>
          
          <!-- 轨迹发送任务 -->
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <el-icon><Position /></el-icon>
                  <span>发送演示轨迹</span>
                </div>
                <el-switch 
                  v-model="taskConfig.trajectoryTask.enabled"
                  active-text="启用" 
                  inactive-text="禁用" />
              </div>
            </template>
            
            <div class="card-content">
              <el-form label-position="left" label-width="100px">
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
            </div>
          </el-card>

          <div class="actions">
            <el-button type="primary" @click="saveTaskConfig" :loading="saving">保存配置</el-button>
          </div>
        </el-scrollbar>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Monitor, Position } from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
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
    enabled: true,
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

// 生命周期钩子
onMounted(() => {
  loadTaskConfig()
})
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

.module-scrollbar {
  height: 100%;
}

.config-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
}

.header-left .el-icon {
  color: var(--el-color-primary);
}

.card-content {
  padding: 10px 0;
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
}
</style> 