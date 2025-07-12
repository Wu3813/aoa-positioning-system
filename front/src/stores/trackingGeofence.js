import { ref } from 'vue'
import axios from 'axios'
import { ElNotification } from 'element-plus'

export function createGeofenceManager(mapStore, coordinateUtils) {
  // 围栏列表
  const geofenceList = ref([])
  
  // 围栏多边形点的预计算缓存
  const geofenceCache = ref(new Map()) // geofenceId -> 预处理后的数据
  
  // 活跃的围栏告警
  const activeGeofenceAlerts = ref({}) // 格式: {mac+geofenceId: notificationInstance}
  
  // 点在多边形内部检测（射线法）- 优化版
  const isPointInPolygon = (point, polygon) => {
    const x = point.x
    const y = point.y
    let inside = false
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x
      const yi = polygon[i].y
      const xj = polygon[j].x
      const yj = polygon[j].y
      
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      if (intersect) inside = !inside
    }
    
    return inside
  }
  
  // 预计算围栏边界和包围盒，用于快速排除
  function precomputeGeofenceData() {
    geofenceCache.value.clear()
    
    geofenceList.value.forEach(geofence => {
      if (!geofence.points || geofence.points.length < 3) return
      
      const points = geofence.points
      
      // 计算边界框
      let minX = Infinity, minY = Infinity
      let maxX = -Infinity, maxY = -Infinity
      
      for (const p of points) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
      
      geofenceCache.value.set(geofence.id, {
        id: geofence.id,
        points: points,
        bounds: { minX, minY, maxX, maxY }
      })
    })
  }
  
  // 优化的围栏检查函数
  const checkGeofenceIntrusion = (sensorMac, point) => {
    // 将传感器的米制坐标转换为图片像素坐标进行比较
    const pixelX = coordinateUtils.cachedMeterToPixelX(point.x)
    const pixelY = coordinateUtils.cachedMeterToPixelY(point.y)
    
    const pixelPoint = { x: pixelX, y: pixelY }
    
    // 使用geofenceCache进行检查
    for (const [geofenceId, geofenceData] of geofenceCache.value.entries()) {
      const alertKey = `${sensorMac}-${geofenceId}`
      const { bounds, points } = geofenceData
      
      // 快速边界框检查
      if (pixelPoint.x < bounds.minX || pixelPoint.x > bounds.maxX || 
          pixelPoint.y < bounds.minY || pixelPoint.y > bounds.maxY) {
        // 点在边界框外，肯定不在多边形内
        if (!activeGeofenceAlerts.value[alertKey]) {
          handleGeofenceAlert(sensorMac, geofenceId, point)
        }
        continue
      }
      
      // 如果通过了边界框检查，再进行精确的多边形检查
      if (!isPointInPolygon(pixelPoint, points)) {
        // 不在围栏内
        if (!activeGeofenceAlerts.value[alertKey]) {
          handleGeofenceAlert(sensorMac, geofenceId, point)
        }
      } else {
        // 在围栏内，关闭已有告警
        if (activeGeofenceAlerts.value[alertKey]) {
          activeGeofenceAlerts.value[alertKey].close()
          delete activeGeofenceAlerts.value[alertKey]
        }
      }
    }
  }
  
  // 封装告警创建逻辑
  const handleGeofenceAlert = (sensorMac, geofenceId, point, sensorName = null) => {
    // 找到对应的围栏
    const geofence = geofenceList.value.find(g => g.id === geofenceId)
    if (!geofence) return
    
    // 使用传入的传感器名称或MAC地址
    const tagName = sensorName || sensorMac
    
    const alertKey = `${sensorMac}-${geofenceId}`
    
    // 创建通知
    const notification = ElNotification({
      title: '围栏告警',
      message: `标签 ${tagName} 位于围栏 ${geofence.name} 外部`,
      type: 'warning',
      duration: 0, // 不自动关闭
      position: 'bottom-right',
      showClose: true,
      onClose: () => {
        // 当手动关闭时清除引用
        delete activeGeofenceAlerts.value[alertKey]
      }
    })
    
    // 保存通知引用以便后续关闭
    activeGeofenceAlerts.value[alertKey] = notification
    
    // 使用Web Workers或requestIdleCallback延迟非关键操作
    requestIdleCallback(() => {
      // 将报警数据发送到后端
      saveAlarmToBackend({
        time: point.timestamp, // 直接传递原始时间戳，由后端处理
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        mapId: mapStore.selectedMap?.mapId,
        mapName: mapStore.selectedMap?.name,
        alarmTag: sensorMac,
        x: point.x,  // 保存米制坐标，与前端显示一致
        y: point.y
      })
    })
  }
  
  // 加载围栏列表
  async function fetchGeofences(mapId) {
    try {
      const params = {
        mapId: mapId,
        enabled: true // 只获取启用的围栏
      }
      
      const response = await axios.get('/api/geofences', { params })
      if (response.data.success) {
        const geofences = response.data.data || []
        // 过滤出有效的围栏点数据
        geofenceList.value = geofences.filter(fence => 
          fence.points && fence.points.length >= 3
        )
        console.log(`加载地图 ${mapId} 的围栏:`, geofenceList.value.length, '个')
        
        // 预计算围栏数据
        precomputeGeofenceData()
      } else {
        console.warn('获取围栏列表失败:', response.data.message)
        geofenceList.value = []
      }
    } catch (error) {
      console.error('获取围栏列表错误:', error)
      geofenceList.value = []
    }
  }
  
  // 将报警数据保存到后端
  async function saveAlarmToBackend(alarmData) {
    try {
      // 确保使用mapId而不是id
      alarmData.mapId = mapStore.selectedMap?.mapId;
      alarmData.mapName = mapStore.selectedMap?.name;
      
      const response = await axios.post('/api/alarms', alarmData)
      if (!response.data.success) {
        console.error('保存报警数据失败:', response.data.message || '未知错误')
      }
    } catch (error) {
      console.error('保存报警数据时出错:', error)
    }
  }
  
  // 清理特定标签的所有围栏告警
  function clearAlertsForTag(macAddress) {
    // 找出并关闭所有与该标签相关的告警
    Object.keys(activeGeofenceAlerts.value).forEach(alertKey => {
      if (alertKey.startsWith(`${macAddress}-`)) {
        // 关闭告警通知
        if (activeGeofenceAlerts.value[alertKey]) {
          activeGeofenceAlerts.value[alertKey].close()
          delete activeGeofenceAlerts.value[alertKey]
        }
      }
    })
  }
  
  // 清理所有围栏告警
  function clearAllAlerts() {
    Object.keys(activeGeofenceAlerts.value).forEach(alertKey => {
      if (activeGeofenceAlerts.value[alertKey]) {
        activeGeofenceAlerts.value[alertKey].close()
      }
    })
    activeGeofenceAlerts.value = {}
  }
  
  return {
    geofenceList,
    geofenceCache,
    activeGeofenceAlerts,
    isPointInPolygon,
    checkGeofenceIntrusion,
    fetchGeofences,
    precomputeGeofenceData,
    clearAlertsForTag,
    clearAllAlerts
  }
} 