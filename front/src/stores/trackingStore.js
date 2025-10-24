import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useMapStore } from './map'

// 导入拆分的模块
import { createCoordinateCache, setupIdleCallback, COLORS } from './trackingUtils'
import { createGeofenceManager } from './trackingGeofence'
import { createSensorManager } from './trackingSensor'
import { createWebSocketManager } from './trackingWebSocket'

export const useTrackingStore = defineStore('tracking', () => {
  // MapStore引用
  const mapStore = useMapStore()
  
  // 设置requestIdleCallback的polyfill
  setupIdleCallback()
  
  // 创建坐标转换缓存
  const coordinateUtils = createCoordinateCache(mapStore)
  
  // 创建围栏管理器 - 暂时不传入翻译函数，在组件中处理
  const geofenceManager = createGeofenceManager(mapStore, coordinateUtils, null)
  
  // 创建传感器管理器
  const sensorManager = createSensorManager(mapStore, { COLORS }, geofenceManager)
  
  // 创建WebSocket管理器
  const wsManager = createWebSocketManager(mapStore, sensorManager, geofenceManager)
  
  // 内存监控
  let memoryMonitorInterval = null
  
  // 标签图标大小配置
  const tagIconSize = ref(10)
  
  // 标签图标透明度配置 (40-100)
  const tagIconOpacity = ref(100)
  
  // 初始化 store
  function init() {
    sensorManager.initSensorColors()
    sensorManager.initTraceSettings()
    sensorManager.loadSensorVisibility()
    
    // 加载标签图标大小配置
    loadTagIconSizeConfig()
    
    // 加载标签图标透明度配置
    loadTagIconOpacityConfig()
    
    // 设置配置监听器
    setupConfigListener()
    
    // 开启内存监控，定期清理可能的内存泄漏
    startMemoryMonitor()
  }
  
  // 加载标签图标大小配置
  function loadTagIconSizeConfig() {
    try {
      const taskConfig = localStorage.getItem('taskConfig')
      if (taskConfig) {
        const config = JSON.parse(taskConfig)
        if (config.displayConfig && config.displayConfig.tagIconSize) {
          tagIconSize.value = config.displayConfig.tagIconSize
        }
      }
    } catch (e) {
      console.error('加载标签图标大小配置失败:', e)
    }
  }
  
  // 加载标签图标透明度配置
  function loadTagIconOpacityConfig() {
    try {
      const taskConfig = localStorage.getItem('taskConfig')
      if (taskConfig) {
        const config = JSON.parse(taskConfig)
        if (config.displayConfig && config.displayConfig.tagIconOpacity) {
          tagIconOpacity.value = config.displayConfig.tagIconOpacity
        }
      }
    } catch (e) {
      console.error('加载标签图标透明度配置失败:', e)
    }
  }
  
  // 更新标签图标大小
  function updateTagIconSize(size) {
    tagIconSize.value = size
  }
  
  // 更新标签图标透明度
  function updateTagIconOpacity(opacity) {
    tagIconOpacity.value = opacity
  }
  
  // 监听配置更新事件
  function setupConfigListener() {
    window.addEventListener('taskConfigUpdated', (event) => {
      const { displayConfig } = event.detail
      if (displayConfig && displayConfig.tagIconSize) {
        updateTagIconSize(displayConfig.tagIconSize)
      }
      if (displayConfig && displayConfig.tagIconOpacity) {
        updateTagIconOpacity(displayConfig.tagIconOpacity)
      }
    })
  }
  
  // 内存监控和优化函数
  function startMemoryMonitor() {
    // 先清除可能存在的定时器
    if (memoryMonitorInterval) {
      clearInterval(memoryMonitorInterval)
    }
    
    memoryMonitorInterval = setInterval(() => {
      // 执行内存优化操作
      sensorManager.optimizeMemory()
    }, 60000) // 每分钟执行一次
  }
  
  // 监听选中地图的变化
  watch(() => mapStore.selectedMap?.mapId, async (newMapId, oldMapId) => {
    if (newMapId && newMapId !== oldMapId) {
      // 清空坐标转换缓存
      coordinateUtils.clearCache()
      
      // 清理所有围栏告警
      geofenceManager.clearAllAlerts()
      
      // 清理WebSocket数据缓冲区，防止旧地图数据残留
      wsManager.clearDataBuffer()
      
      // 处理传感器数据
      await sensorManager.handleMapChange(newMapId)
      
      // 加载围栏数据
      await geofenceManager.fetchGeofences(newMapId)
    }
  })
  
  // 清理资源
  function cleanup() {
    // 停止内存监控
    if (memoryMonitorInterval) {
      clearInterval(memoryMonitorInterval)
      memoryMonitorInterval = null
    }
    
    // 移除配置监听器
    window.removeEventListener('taskConfigUpdated', setupConfigListener)
    
    // 清理各模块资源
    wsManager.cleanup()
    sensorManager.cleanup()
    geofenceManager.clearAllAlerts()
    coordinateUtils.clearCache()
  }
  
  return {
    // 从WebSocket管理器导出
    wsConnected: wsManager.wsConnected,
    receivedDataCount: wsManager.receivedDataCount,
    connect: wsManager.connect,
    disconnect: wsManager.disconnect,
    startAutoConnect: wsManager.startAutoConnect,
    stopAutoConnect: wsManager.stopAutoConnect,
    clearDataBuffer: wsManager.clearDataBuffer,
    stompClient: wsManager.stompClient, // 导出stompClient供组件使用
    
    // 从传感器管理器导出
    sensorList: sensorManager.sensorList,
    visibleSensors: sensorManager.visibleSensors,
    visibleSensorsList: sensorManager.visibleSensorsList,
    limitTraceEnabled: sensorManager.limitTraceEnabled,
    traceLimit: sensorManager.traceLimit,
    forceUpdateFlag: sensorManager.forceUpdateFlag,
    getSensorColor: sensorManager.getSensorColor,
    changeSensorColor: sensorManager.changeSensorColor,
    clearAllTraces: sensorManager.clearAllTraces,
    toggleVisibility: sensorManager.toggleVisibility,
    toggleAllVisible: sensorManager.toggleAllVisible,
    filterSensorsByMapId: sensorManager.filterSensorsByMapId,
    hasDataUpdates: sensorManager.hasDataUpdates,
    notifyUpdate: sensorManager.notifyUpdate,
    
    // 从围栏管理器导出
    geofenceList: geofenceManager.geofenceList,
    isPointInPolygon: geofenceManager.isPointInPolygon,
    fetchGeofences: geofenceManager.fetchGeofences,
    setGeofenceTranslation: (translationFunction) => {
      geofenceManager.setTranslationFunction(translationFunction)
      geofenceManager.updateExistingNotificationsLanguage()
    },
    
    // 标签图标大小配置
    tagIconSize,
    updateTagIconSize,
    
    // 标签图标透明度配置
    tagIconOpacity,
    updateTagIconOpacity,
    
    // 初始化和清理
    init,
    cleanup
  }
}) 