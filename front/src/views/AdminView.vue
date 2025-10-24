<template>
  <div class="admin-view-container">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>{{ $t('admin.title') }}</h2>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <div class="admin-content-wrapper">
        <el-scrollbar class="module-scrollbar">
          <!-- 系统任务配置 -->
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <el-icon><Monitor /></el-icon>
                  <span>{{ $t('admin.systemTasks') }}</span>
                </div>
              </div>
            </template>
            
            <div class="card-content">
              <!-- 轨迹存储任务 -->
              <div class="task-section">
                <div class="task-header">
                  <span class="task-title">{{ $t('admin.trajectoryStorageTask') }}</span>
                  <el-switch 
                    v-model="taskConfig.storageTask.enabled"
                    :active-text="$t('admin.enabled')" 
                    :inactive-text="$t('admin.disabled')" />
                </div>
                <el-form label-position="left" label-width="100px">
                  <el-form-item :label="$t('admin.storageInterval')">
                    <el-input-number 
                      v-model="taskConfig.storageTask.intervalMs"
                      :min="1000"
                      :max="30000"
                      :step="1000"
                      controls-position="right"
                      style="width: 200px" />
                    <span style="margin-left: 8px; color: #909399;">{{ $t('admin.milliseconds') }}</span>
                  </el-form-item>
                </el-form>
                <el-alert
                  :title="$t('admin.storageTaskWarning')"
                  type="warning"
                  show-icon
                  :closable="false"
                />
              </div>

              <!-- 基站刷新任务 -->
              <div class="task-section">
                <div class="task-header">
                  <span class="task-title">{{ $t('admin.stationRefreshTask') }}</span>
                  <el-switch 
                    v-model="taskConfig.stationTask.enabled"
                    :active-text="$t('admin.enabled')" 
                    :inactive-text="$t('admin.disabled')" />
                </div>
                <el-form label-position="left" label-width="100px">
                  <el-form-item :label="$t('admin.refreshInterval')">
                    <el-input-number 
                      v-model="taskConfig.stationTask.intervalMs"
                      :min="1000"
                      :max="3600000"
                      :step="1000"
                      controls-position="right"
                      style="width: 200px" />
                    <span style="margin-left: 8px; color: #909399;">{{ $t('admin.milliseconds') }}</span>
                  </el-form-item>
                </el-form>
              </div>
              
              <!-- 轨迹发送任务 -->
              <div class="task-section">
                <div class="task-header">
                  <span class="task-title">{{ $t('admin.trajectorySendTask') }}</span>
                  <el-switch 
                    v-model="taskConfig.trajectoryTask.enabled"
                    :active-text="$t('admin.enabled')" 
                    :inactive-text="$t('admin.disabled')" />
                </div>
                <el-form label-position="left" label-width="100px">
                  <el-form-item :label="$t('admin.sendInterval')">
                    <el-input-number 
                      v-model="taskConfig.trajectoryTask.sendIntervalMs"
                      :min="100"
                      :max="5000"
                      :step="100"
                      controls-position="right"
                      style="width: 200px" />
                    <span style="margin-left: 8px; color: #909399;">{{ $t('admin.milliseconds') }}</span>
                  </el-form-item>
                  <el-form-item :label="$t('admin.pauseTime')">
                    <el-input-number 
                      v-model="taskConfig.trajectoryTask.pauseMs"
                      :min="5000"
                      :max="300000"
                      :step="1000"
                      controls-position="right"
                      style="width: 200px" />
                    <span style="margin-left: 8px; color: #909399;">{{ $t('admin.milliseconds') }}</span>
                  </el-form-item>
                </el-form>
              </div>
            </div>
          </el-card>

          <!-- 超时管理 -->
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <el-icon><Clock /></el-icon>
                  <span>{{ $t('admin.timeoutManagement') }}</span>
                </div>
                <el-switch 
                  v-model="taskConfig.timeoutTask.enabled"
                  :active-text="$t('admin.enabled')" 
                  :inactive-text="$t('admin.disabled')" />
              </div>
            </template>
            
            <div class="card-content">
              <el-form label-position="left" label-width="100px">
                <el-form-item :label="$t('admin.timeoutInterval')">
                  <el-input-number 
                    v-model="taskConfig.timeoutTask.timeoutMs"
                    :min="1000"
                    :max="300000"
                    :step="1000"
                    controls-position="right"
                    style="width: 200px" />
                  <span style="margin-left: 8px; color: #909399;">{{ $t('admin.milliseconds') }}</span>
                </el-form-item>
              </el-form>
              <el-alert
                :title="$t('admin.timeoutTaskWarning')"
                type="warning"
                show-icon
                :closable="false"
              />
            </div>
          </el-card>

          <!-- 显示配置 -->
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <el-icon><View /></el-icon>
                  <span>{{ $t('admin.displayConfig') }}</span>
                </div>
              </div>
            </template>
            
            <div class="card-content">
              <el-form label-position="left" label-width="120px">
                <el-form-item :label="$t('admin.tagIconSize')">
                  <el-input-number 
                    v-model="taskConfig.displayConfig.tagIconSize"
                    :min="5"
                    :max="30"
                    :step="1"
                    controls-position="right"
                    style="width: 200px" />
                  <span style="margin-left: 8px; color: #909399;">{{ $t('admin.pixels') }}</span>
                </el-form-item>
              </el-form>
              <el-alert
                :title="$t('admin.displayConfigWarning')"
                type="info"
                show-icon
                :closable="false"
              />
            </div>
          </el-card>

          <div class="actions">
            <el-button type="primary" @click="handleSaveWithValidation" :loading="saving">{{ $t('admin.saveConfig') }}</el-button>
            <el-button @click="handleResetTaskConfig">{{ $t('admin.resetConfig') }}</el-button>
          </div>
        </el-scrollbar>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Monitor, Position, Clock, View } from '@element-plus/icons-vue'
import { useAdminView } from './adminview-js'

// 获取国际化函数
const { t } = useI18n()

// 使用管理页面逻辑
const {
  saving,
  taskConfig,
  onMountedHandler,
  handleSaveWithValidation,
  handleResetTaskConfig
} = useAdminView(t)

// 生命周期钩子
onMounted(() => {
  onMountedHandler()
})
</script>

<style scoped>
@import '../assets/styles/admin-view.css';
</style> 