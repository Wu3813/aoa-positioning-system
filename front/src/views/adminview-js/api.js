import axios from 'axios'
import { ElMessage } from 'element-plus'

export function createAdminAPI(data, t) {
  // 加载任务配置
  const loadTaskConfig = async () => {
    try {
      const response = await axios.get('/api/admin/tasks/config')
      data.updateTaskConfig(response.data)
      
      // 同时保存到localStorage，供前端其他组件使用
      try {
        localStorage.setItem('taskConfig', JSON.stringify(response.data))
      } catch (e) {
        console.error('保存配置到localStorage失败:', e)
      }
    } catch (error) {
      ElMessage.error(t('admin.loadConfigFailed'))
      console.error(t('admin.loadConfigFailed'), error)
      // 加载失败时使用默认配置
      data.resetTaskConfig()
    }
  }

  // 保存任务配置
  const saveTaskConfig = async () => {
    data.saving.value = true
    try {
      await axios.post('/api/admin/tasks/config', data.taskConfig)
      
      // 同时保存到localStorage，供前端其他组件使用
      try {
        localStorage.setItem('taskConfig', JSON.stringify(data.taskConfig))
        
        // 如果配置中包含显示配置，触发标签图标大小更新
        if (data.taskConfig.displayConfig && data.taskConfig.displayConfig.tagIconSize) {
          // 触发自定义事件，通知其他组件配置已更新
          window.dispatchEvent(new CustomEvent('taskConfigUpdated', {
            detail: { displayConfig: data.taskConfig.displayConfig }
          }))
        }
      } catch (e) {
        console.error('保存配置到localStorage失败:', e)
      }
      
      ElMessage.success(t('admin.saveConfigSuccess'))
      return true
    } catch (error) {
      ElMessage.error(t('admin.saveConfigFailed'))
      console.error(t('admin.saveConfigFailed'), error)
      return false
    } finally {
      data.saving.value = false
    }
  }

  return {
    loadTaskConfig,
    saveTaskConfig
  }
}
