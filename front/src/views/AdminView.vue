<template>
  <div class="admin-view-container">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>后台管理</h2>
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
            <el-button type="primary" @click="handleSaveWithValidation" :loading="saving">保存配置</el-button>
            <el-button @click="handleResetTaskConfig">重置配置</el-button>
          </div>
        </el-scrollbar>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { Monitor, Position } from '@element-plus/icons-vue'
import { useAdminView } from './adminview-js'

// 使用管理页面逻辑
const {
  saving,
  taskConfig,
  onMountedHandler,
  handleSaveWithValidation,
  handleResetTaskConfig
} = useAdminView()

// 生命周期钩子
onMounted(() => {
  onMountedHandler()
})
</script>

<style scoped>
@import '../assets/styles/admin-view.css';
</style> 