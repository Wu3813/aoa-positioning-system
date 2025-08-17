import axios from 'axios'
import { ElMessage } from 'element-plus'

export function createAdminAPI(data) {
  // 加载任务配置
  const loadTaskConfig = async () => {
    try {
      const response = await axios.get('/api/admin/tasks/config')
      data.updateTaskConfig(response.data)
    } catch (error) {
      ElMessage.error('加载任务配置失败')
      console.error('加载任务配置失败:', error)
      // 加载失败时使用默认配置
      data.resetTaskConfig()
    }
  }

  // 保存任务配置
  const saveTaskConfig = async () => {
    data.saving.value = true
    try {
      await axios.post('/api/admin/tasks/config', data.taskConfig)
      ElMessage.success('任务配置保存成功')
      return true
    } catch (error) {
      ElMessage.error('保存任务配置失败')
      console.error('保存任务配置失败:', error)
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
