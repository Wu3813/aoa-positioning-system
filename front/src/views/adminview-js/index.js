import { onMounted } from 'vue'
import { createAdminData } from './data'
import { createAdminAPI } from './api'
import { createAdminUI } from './ui'

export function useAdminView() {
  // 创建数据管理
  const data = createAdminData()
  
  // 创建API操作
  const api = createAdminAPI(data)
  
  // 创建UI交互
  const ui = createAdminUI(data, api)

  // 生命周期处理
  const onMountedHandler = async () => {
    // 加载任务配置
    await api.loadTaskConfig()
  }

  return {
    // 响应式数据
    saving: data.saving,
    taskConfig: data.taskConfig,
    
    // API方法
    loadTaskConfig: api.loadTaskConfig,
    saveTaskConfig: api.saveTaskConfig,
    
    // UI方法
    handleSaveTaskConfig: ui.handleSaveTaskConfig,
    handleResetTaskConfig: ui.handleResetTaskConfig,
    handleSaveWithValidation: ui.handleSaveWithValidation,
    
    // 生命周期
    onMountedHandler
  }
}
