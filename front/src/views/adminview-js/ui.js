import { ElMessage } from 'element-plus'

export function createAdminUI(data, api) {
  // 保存任务配置
  const handleSaveTaskConfig = async () => {
    const success = await api.saveTaskConfig()
    if (success) {
      // 保存成功后可以执行其他操作，比如刷新数据
      console.log('任务配置保存成功')
    }
  }

  // 重置任务配置
  const handleResetTaskConfig = () => {
    data.resetTaskConfig()
    ElMessage.info('已重置为默认配置')
  }

  // 验证任务配置
  const validateTaskConfig = () => {
    const { stationTask, trajectoryTask, storageTask } = data.taskConfig
    
    // 验证基站任务配置
    if (stationTask.enabled && stationTask.intervalMs < 1000) {
      ElMessage.warning('基站刷新间隔不能少于1000毫秒')
      return false
    }
    
    // 验证轨迹任务配置
    if (trajectoryTask.enabled) {
      if (trajectoryTask.sendIntervalMs < 100) {
        ElMessage.warning('轨迹发送间隔不能少于100毫秒')
        return false
      }
      if (trajectoryTask.pauseMs < 5000) {
        ElMessage.warning('轨迹暂停时间不能少于5000毫秒')
        return false
      }
    }
    
    // 验证存储任务配置
    if (storageTask.enabled && storageTask.intervalMs < 1000) {
      ElMessage.warning('轨迹存储间隔不能少于1000毫秒')
      return false
    }
    
    return true
  }

  // 保存前验证
  const handleSaveWithValidation = async () => {
    if (!validateTaskConfig()) {
      return
    }
    
    await handleSaveTaskConfig()
  }

  return {
    handleSaveTaskConfig,
    handleResetTaskConfig,
    handleSaveWithValidation,
    validateTaskConfig
  }
}
