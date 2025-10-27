import { ElMessage } from 'element-plus'

export function createAdminUI(data, api, t) {
  // 保存任务配置
  const handleSaveTaskConfig = async () => {
    const success = await api.saveTaskConfig()
    if (success) {
      // 保存成功后可以执行其他操作，比如刷新数据
      console.log(t('admin.saveConfigSuccess'))
    }
  }

  // 重置任务配置
  const handleResetTaskConfig = () => {
    data.resetTaskConfig()
    ElMessage.info(t('admin.resetToDefault'))
  }

  // 验证任务配置
  const validateTaskConfig = () => {
    const { stationTask, trajectoryTask, storageTask, timeoutTask, dataRetentionConfig } = data.taskConfig
    
    // 验证基站任务配置
    if (stationTask.enabled && stationTask.intervalMs < 1000) {
      ElMessage.warning(t('admin.stationIntervalWarning'))
      return false
    }
    
    // 验证轨迹任务配置
    if (trajectoryTask.enabled) {
      if (trajectoryTask.sendIntervalMs < 100) {
        ElMessage.warning(t('admin.trajectorySendIntervalWarning'))
        return false
      }
      if (trajectoryTask.pauseMs < 5000) {
        ElMessage.warning(t('admin.trajectoryPauseWarning'))
        return false
      }
    }
    
    // 验证存储任务配置
    if (storageTask.enabled && storageTask.intervalMs < 1000) {
      ElMessage.warning(t('admin.storageIntervalWarning'))
      return false
    }
    
    // 验证超时管理配置
    if (timeoutTask.enabled && timeoutTask.timeoutMs < 1000) {
      ElMessage.warning(t('admin.timeoutIntervalWarning'))
      return false
    }
    
    // 验证数据保留配置
    if (dataRetentionConfig) {
      if (dataRetentionConfig.trajectoryRetentionDays < 1 || dataRetentionConfig.trajectoryRetentionDays > 365) {
        ElMessage.warning(t('admin.retentionDaysWarning'))
        return false
      }
      if (dataRetentionConfig.diskCleanupEnabled) {
        if (dataRetentionConfig.diskSpaceThreshold < 5 || dataRetentionConfig.diskSpaceThreshold > 50) {
          ElMessage.warning(t('admin.diskThresholdWarning'))
          return false
        }
      }
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

