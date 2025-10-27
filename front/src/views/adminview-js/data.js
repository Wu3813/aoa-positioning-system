import { ref, reactive } from 'vue'

export function createAdminData() {
  // 响应式数据
  const saving = ref(false)
  
  // 任务配置数据
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
    },
    timeoutTask: {
      enabled: true,
      timeoutMs: 30000
    },
    displayConfig: {
      tagIconSize: 10
    },
    dataRetentionConfig: {
      trajectoryRetentionDays: 30,
      diskCleanupEnabled: true,
      diskSpaceThreshold: 20
    }
  })

  // 重置任务配置到默认值
  const resetTaskConfig = () => {
    Object.assign(taskConfig, {
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
      },
      timeoutTask: {
        enabled: true,
        timeoutMs: 30000
      },
      displayConfig: {
        tagIconSize: 10
      },
      dataRetentionConfig: {
        trajectoryRetentionDays: 30,
        diskCleanupEnabled: true,
        diskSpaceThreshold: 20
      }
    })
  }

  // 更新任务配置
  const updateTaskConfig = (newConfig) => {
    Object.assign(taskConfig, newConfig)
  }

  return {
    saving,
    taskConfig,
    resetTaskConfig,
    updateTaskConfig
  }
}
