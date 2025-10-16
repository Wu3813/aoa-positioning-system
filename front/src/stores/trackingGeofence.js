import { ref } from 'vue'
import axios from 'axios'
import { ElNotification } from 'element-plus'

export function createGeofenceManager(mapStore, coordinateUtils, t) {
  // 围栏列表
  const geofenceList = ref([])
  
  // 围栏多边形点的预计算缓存 - 保留用于显示围栏
  const geofenceCache = ref(new Map()) // geofenceId -> 预处理后的数据
  
  // 活跃的围栏告警
  const activeGeofenceAlerts = ref({}) // 格式: {mac+geofenceId: notificationInstance}
  
  // 翻译函数引用
  let translationFunction = t
  
  // 点在多边形内部检测（射线法）- 优化版 - 仅保留用于前端可能的可视化需求
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
  
  // 预计算围栏边界和包围盒 - 保留用于围栏显示
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
  
  // 处理后端发来的告警通知
  const handleWebSocketAlarmNotification = (notification) => {
    if (notification.type === 'geofenceAlarm') {
      // 创建新的告警通知
      const alarmTag = notification.alarmTag
      const geofenceId = notification.geofenceId
      const alertKey = `${alarmTag}-${geofenceId}`
      
      // 避免重复通知
      if (activeGeofenceAlerts.value[alertKey]) {
        activeGeofenceAlerts.value[alertKey].close()
      }
      
      // 创建通知
      const uiNotification = ElNotification({
        title: translationFunction ? translationFunction('geofenceAlarm.title') : 'Geofence Alarm',
        message: translationFunction ? translationFunction('geofenceAlarm.message', { 
          tagId: notification.alarmTag, 
          geofenceName: notification.geofenceName || 'Unknown' 
        }) : `Tag ${notification.alarmTag} left geofence ${notification.geofenceName || 'Unknown'}`,
        type: 'warning',
        duration: 0, // 不自动关闭
        position: 'bottom-right',
        showClose: true, // 启用手动关闭
        closeOnClick: false, // 点击通知内容不关闭
        closeOnPressEscape: true // 按ESC键可以关闭
      })
      
      // 保存通知引用以便后续关闭
      activeGeofenceAlerts.value[alertKey] = uiNotification
      
    } else if (notification.type === 'geofenceAlarmClose') {
      // 关闭指定的告警通知
      const alarmId = notification.alarmId
      
      // 查找并关闭对应的通知
      Object.keys(activeGeofenceAlerts.value).forEach(key => {
        // 遍历所有活跃通知，找到匹配的告警ID
        // 这里简化处理，实际应该有更精确的匹配
        const notification = activeGeofenceAlerts.value[key]
        if (notification) {
          notification.close()
        }
      })
    }
  }
  
  // 注册WebSocket消息监听 - 需要在WebSocket连接建立后调用
  function registerAlarmNotificationListener(stompClient) {
    if (stompClient) {
      stompClient.subscribe('/topic/alarmNotification', (message) => {
        try {
          const notification = JSON.parse(message.body)
          handleWebSocketAlarmNotification(notification)
        } catch (error) {
          console.error(translationFunction ? translationFunction('geofenceAlarm.handleNotificationFailed') : 'Failed to handle notification', error)
        }
      })
      console.log(translationFunction ? translationFunction('geofenceAlarm.registerListenerSuccess') : 'Alarm notification listener registered successfully')
    }
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
        console.log(translationFunction ? translationFunction('geofenceAlarm.loadGeofencesSuccess', { 
          mapId: mapId, 
          count: geofenceList.value.length 
        }) : `Loaded ${geofenceList.value.length} geofences for map ${mapId}`)
        
        // 预计算围栏数据
        precomputeGeofenceData()
      } else {
        console.warn(translationFunction ? translationFunction('geofenceAlarm.fetchListFailed') : 'Failed to fetch geofence list', response.data.message)
        geofenceList.value = []
      }
    } catch (error) {
      console.error(translationFunction ? translationFunction('geofenceAlarm.fetchListError') : 'Error fetching geofence list', error)
      geofenceList.value = []
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
  
  // 设置翻译函数
  function setTranslationFunction(t) {
    translationFunction = t
  }
  
  // 更新所有现有通知的语言
  function updateExistingNotificationsLanguage() {
    // 遍历所有活跃的通知，重新创建它们以更新语言
    Object.keys(activeGeofenceAlerts.value).forEach(alertKey => {
      const notification = activeGeofenceAlerts.value[alertKey]
      if (notification) {
        // 关闭旧通知
        notification.close()
        
        // 从alertKey中提取信息 (格式: mac-geofenceId)
        const [alarmTag, geofenceId] = alertKey.split('-')
        
        // 查找对应的围栏信息
        const geofence = geofenceList.value.find(g => g.id == geofenceId)
        const geofenceName = geofence ? geofence.name : 'Unknown'
        
        // 创建新的通知（使用新的翻译函数）
        const newNotification = ElNotification({
          title: translationFunction ? translationFunction('geofenceAlarm.title') : 'Geofence Alarm',
          message: translationFunction ? translationFunction('geofenceAlarm.message', { 
            tagId: alarmTag, 
            geofenceName: geofenceName
          }) : `Tag ${alarmTag} left geofence ${geofenceName}`,
          type: 'warning',
          duration: 0, // 不自动关闭
          position: 'bottom-right',
          showClose: true, // 启用手动关闭
          closeOnClick: false, // 点击通知内容不关闭
          closeOnPressEscape: true // 按ESC键可以关闭
        })
        
        // 更新通知引用
        activeGeofenceAlerts.value[alertKey] = newNotification
      }
    })
  }
  
  return {
    geofenceList,
    geofenceCache,
    activeGeofenceAlerts,
    isPointInPolygon,
    fetchGeofences,
    precomputeGeofenceData,
    clearAlertsForTag,
    clearAllAlerts,
    registerAlarmNotificationListener,
    handleWebSocketAlarmNotification,
    setTranslationFunction,
    updateExistingNotificationsLanguage
  }
} 