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
  
  // 创建围栏管理器
  const geofenceManager = createGeofenceManager(mapStore, coordinateUtils)
  
  // 创建传感器管理器
  const sensorManager = createSensorManager(mapStore, { COLORS }, geofenceManager)
  
  // 创建WebSocket管理器
  const wsManager = createWebSocketManager(mapStore, sensorManager)
  
  // 内存监控
  let memoryMonitorInterval = null
  
  // 初始化 store
  function init() {
    sensorManager.initSensorColors()
    
    // 开启内存监控，定期清理可能的内存泄漏
    startMemoryMonitor()
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
    
    // 从传感器管理器导出
    sensorList: sensorManager.sensorList,
    visibleSensors: sensorManager.visibleSensors,
    visibleSensorsList: sensorManager.visibleSensorsList,
    limitTraceEnabled: sensorManager.limitTraceEnabled,
    traceLimit: sensorManager.traceLimit,
    forceUpdateFlag: sensorManager.forceUpdateFlag,
    getSensorColor: sensorManager.getSensorColor,
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
    
    // 初始化和清理
    init,
    cleanup
  }
}) 