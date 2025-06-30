import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { Client } from '@stomp/stompjs'
import { ElNotification } from 'element-plus'
import { useMapStore } from './map'
import axios from 'axios'

export const useTrackingStore = defineStore('tracking', () => {
  // MapStore引用
  const mapStore = useMapStore()
  
  // WebSocket连接状态和客户端
  const wsConnected = ref(false)
  const stompClient = ref(null)
  const receivedDataCount = ref(0)
  
  // 传感器和轨迹数据
  const sensorList = ref([])
  const visibleSensors = ref(new Set())
  const activeGeofenceAlerts = ref({}) // 格式: {mac+geofenceId: notificationInstance}
  
  // 超时处理相关
  const SENSOR_TIMEOUT = 10000 // 10秒没有新数据则认为传感器离线
  const sensorTimeouts = ref({}) // 存储每个传感器的超时定时器
  
  // 轨迹控制相关
  const limitTraceEnabled = ref(false)
  const traceLimit = ref(100)
  
  // 围栏列表
  const geofenceList = ref([])
  
  // 存储已登记的标签列表 (MAC地址 -> 标签信息的映射)
  const registeredTags = ref(new Map())
  
  // 传感器颜色映射
  const sensorColors = ref({})
  
  // HSL颜色转RGB辅助函数
  const hslToRgb = (h, s, l) => {
    let r, g, b
    
    if (s === 0) {
      r = g = b = l // 灰度
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1/6) return p + (q - p) * 6 * t
        if (t < 1/2) return q
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
        return p
      }
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }
    
    return [r, g, b]
  }
  
  // 生成500种不同颜色
  const generateColors = (count) => {
    const colors = []
    // 使用黄金比例分割法生成均匀分布的色相值
    const goldenRatioConjugate = 0.618033988749895
    let h = Math.random() // 随机起始色相
    
    // 生成色相均匀分布的颜色
    for (let i = 0; i < count; i++) {
      h = (h + goldenRatioConjugate) % 1
      
      // 计算饱和度和亮度变化
      // 使用三组不同的饱和度和亮度值使颜色更加多样化
      const s = 0.6 + Math.random() * 0.2
      const l = i % 3 === 0 ? 0.65 : (i % 3 === 1 ? 0.45 : 0.55)
      
      // 转换HSL为十六进制颜色代码
      const rgb = hslToRgb(h, s, l)
      const hex = '#' + 
        rgb.map(x => {
          const hex = Math.round(x * 255).toString(16)
          return hex.length === 1 ? '0' + hex : hex
        }).join('')
      
      colors.push(hex)
    }
    return colors
  }
  
  // 生成500种不同颜色
  const COLORS = generateColors(550) // 生成550种颜色以确保有足够的备用
  
  // 可见的传感器列表 (用于渲染)
  const visibleSensorsList = computed(() => {
    return sensorList.value.filter(sensor => sensor.visible)
  })
  
  // 自动连接相关的变量和函数
  const autoConnect = ref(false)
  const reconnectInterval = ref(null)
  
  // 连接WebSocket
  function connect() {
    if (stompClient.value?.active) {
      console.log('WebSocket已连接，无需重复连接')
      return
    }
  
    stompClient.value = new Client({
      brokerURL: '/ws-path/websocket',
      reconnectDelay: 2000, // 减少重连延迟到2秒
      heartbeatIncoming: 2000, // 减少心跳间隔提高响应速度
      heartbeatOutgoing: 2000,
      onConnect: () => {
        console.log('WebSocket连接成功')
        wsConnected.value = true
        
        // 订阅轨迹数据 - 直接处理，无缓冲无延迟
        stompClient.value.subscribe('/topic/pathData', message => {
          try {
            const data = JSON.parse(message.body)
            receivedDataCount.value++
            
            // 添加详细日志，输出完整的数据对象
            console.log('接收到轨迹数据完整内容:', JSON.stringify(data))
            
            // 简化日志输出，减少性能开销
            console.debug('接收轨迹:', data.mac, data.x, data.y)
            
            // 直接处理数据，无缓冲机制
            processTrackingData(data)
            
          } catch (error) {
            console.error('处理WebSocket数据时出错:', error)
          }
        })
      },
      onStompError: (frame) => {
        console.error('WebSocket连接错误:', frame)
        wsConnected.value = false
      },
      onWebSocketClose: () => {
        console.log('WebSocket连接已关闭')
        wsConnected.value = false
      }
    })
  
    stompClient.value.activate()
  }
  
  // 断开WebSocket连接
  function disconnect() {
    if (stompClient.value?.active) {
      stompClient.value.deactivate()
    }
    wsConnected.value = false
  }
  
  // 自动重连函数
  function startAutoConnect() {
    if (!autoConnect.value) {
      autoConnect.value = true
      connect()
      
      // 设置定时检查连接状态 - 提高检查频率
      reconnectInterval.value = setInterval(() => {
        if (!stompClient.value?.connected) {
          console.log('检测到连接断开，尝试重新连接...')
          connect()
        }
      }, 2000) // 减少到2秒检查一次，提高响应速度
    }
  }
  
  // 停止自动重连
  function stopAutoConnect() {
    autoConnect.value = false
    if (reconnectInterval.value) {
      clearInterval(reconnectInterval.value)
      reconnectInterval.value = null
    }
    disconnect()
  }
  
  // 获取传感器颜色，确保同一MAC地址始终使用相同颜色
  function getSensorColor(mac) {
    // 如果已经有分配的颜色，直接返回
    if (sensorColors.value[mac]) {
      return sensorColors.value[mac]
    }
    
    // 使用MAC地址作为种子计算固定的颜色索引
    let hashCode = 0
    for (let i = 0; i < mac.length; i++) {
      hashCode = ((hashCode << 5) - hashCode) + mac.charCodeAt(i)
      hashCode = hashCode & hashCode // 转换为32位整数
    }
    
    // 确保为正数
    hashCode = Math.abs(hashCode)
    const colorIndex = hashCode % COLORS.length
    
    // 存储映射关系
    sensorColors.value[mac] = COLORS[colorIndex]
    
    // 将映射关系存储到localStorage以便刷新页面后保持
    try {
      const storedColors = JSON.parse(localStorage.getItem('sensorColors') || '{}')
      storedColors[mac] = COLORS[colorIndex]
      localStorage.setItem('sensorColors', JSON.stringify(storedColors))
    } catch (e) {
      console.error('无法存储传感器颜色到localStorage:', e)
    }
    
    return COLORS[colorIndex]
  }
  
  // 初始化从localStorage加载传感器颜色映射
  function initSensorColors() {
    try {
      const storedColors = JSON.parse(localStorage.getItem('sensorColors') || '{}')
      sensorColors.value = storedColors
    } catch (e) {
      console.error('无法从localStorage加载传感器颜色:', e)
      sensorColors.value = {}
    }
  }
  
  // 清空所有轨迹
  function clearAllTraces() {
    sensorList.value.forEach(sensor => {
      sensor.points = []
      sensor.lastPoint = null
    })
  }
  
  // 点在多边形内部检测（射线法）
  const isPointInPolygon = (point, polygon) => {
    const x = point.x
    const y = point.y
    let inside = false
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x
      const yi = polygon[i].y
      const xj = polygon[j].x
      const yj = polygon[j].y
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    
    return inside
  }
  
  // 检查围栏入侵
  const checkGeofenceIntrusion = (sensorMac, point) => {
    // 将传感器的米制坐标转换为图片像素坐标进行比较
    const pixelPoint = {
      x: mapStore.meterToPixelX(point.x),
      y: mapStore.meterToPixelY(point.y)
    }
    
    geofenceList.value.forEach(geofence => {
      const alertKey = `${sensorMac}-${geofence.id}`
      
      if (!isPointInPolygon(pixelPoint, geofence.points)) {
        // 如果不在围栏内且没有活跃告警，则创建一个告警
        if (!activeGeofenceAlerts.value[alertKey]) {
          // 获取标签名称
          const sensor = sensorList.value.find(s => s.mac === sensorMac)
          const tagName = sensor?.name || sensorMac
          
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
          
          // 将报警数据发送到后端
          saveAlarmToBackend({
            time: point.timestamp, // 直接传递原始时间戳，由后端处理
            geofenceId: geofence.id,
            geofenceName: geofence.name,
            mapId: mapStore.selectedMap?.id,
            mapName: mapStore.selectedMap?.name,
            alarmTag: sensorMac,
            x: point.x,  // 保存米制坐标，与前端显示一致
            y: point.y
          })
        }
      } else {
        // 如果在围栏内且存在活跃告警，则关闭告警
        if (activeGeofenceAlerts.value[alertKey]) {
          activeGeofenceAlerts.value[alertKey].close()
          delete activeGeofenceAlerts.value[alertKey]
        }
      }
    })
  }
  
  // 清空不属于当前地图的传感器
  function clearUnregisteredSensors() {
    sensorList.value = sensorList.value.filter(sensor => {
      const isRegistered = registeredTags.value.has(sensor.mac)
      if (!isRegistered) {
        visibleSensors.value.delete(sensor.mac)
        // 清除超时定时器
        if (sensorTimeouts.value[sensor.mac]) {
          clearTimeout(sensorTimeouts.value[sensor.mac])
          delete sensorTimeouts.value[sensor.mac]
        }
      }
      return isRegistered
    })
  }
  
  // 切换显示状态
  function toggleVisibility(sensor) {
    sensor.visible = !sensor.visible
    
    // 更新可见传感器集合
    if (sensor.visible) {
      visibleSensors.value.add(sensor.mac)
    } else {
      visibleSensors.value.delete(sensor.mac)
    }
  }
  
  // 切换所有传感器显示状态
  function toggleAllVisible(visible) {
    sensorList.value.forEach(sensor => {
      sensor.visible = visible
      if (visible) {
        visibleSensors.value.add(sensor.mac)
      } else {
        visibleSensors.value.delete(sensor.mac)
      }
    })
  }
  
  // 直接处理轨迹数据的函数
  function processTrackingData(data) {
    // 验证数据有效性
    if (!data || !data.mac || typeof data.x !== 'number' || typeof data.y !== 'number') {
      console.warn('收到无效数据:', data)
      return
    }
    
    // 检查标签是否已登记在当前地图中，如果未登记则丢弃数据
    if (!registeredTags.value.has(data.mac)) {
      console.debug(`标签 ${data.mac} 未在当前地图中登记，丢弃数据`)
      return
    }
    
    // 查找或创建传感器
    let sensor = sensorList.value.find(s => s.mac === data.mac)
    
    // 清除之前的超时定时器
    if (sensorTimeouts.value[data.mac]) {
      clearTimeout(sensorTimeouts.value[data.mac])
    }
    
    // 设置新的超时定时器
    sensorTimeouts.value[data.mac] = setTimeout(() => {
      // 超时后移除传感器
      const index = sensorList.value.findIndex(s => s.mac === data.mac)
      if (index !== -1) {
        // 移除传感器前先清理该标签的所有围栏告警
        clearAlertsForTag(data.mac)
        
        // 然后移除传感器
        sensorList.value.splice(index, 1)
        visibleSensors.value.delete(data.mac)
        console.log(`传感器 ${data.mac} 超时，已移除`)
      }
      delete sensorTimeouts.value[data.mac]
    }, SENSOR_TIMEOUT)
    
    // 如果是新传感器，创建并添加
    if (!sensor) {
      const tagInfo = registeredTags.value.get(data.mac)
      sensor = {
        mac: data.mac,
        name: tagInfo?.name || data.mac,
        visible: true,
        showTrace: true,
        color: getSensorColor(data.mac),
        points: []
      }
      sensorList.value.push(sensor)
      visibleSensors.value.add(data.mac)
    }
    
    // 创建点对象并添加到传感器轨迹
    const point = {
      x: parseFloat(data.x),
      y: parseFloat(data.y),
      timestamp: data.timestamp
    }
    
    // 记录时间戳信息
    if (data.timestamp) {
      console.log(`标签 ${data.mac} 数据包含时间戳:`, data.timestamp)
    } else {
      console.warn(`标签 ${data.mac} 数据缺少时间戳`)
    }
    
    sensor.points.push(point)
    sensor.lastPoint = point
    
    // 检查是否进入围栏
    checkGeofenceIntrusion(sensor.mac, point)
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
      } else {
        console.warn('获取围栏列表失败:', response.data.message)
        geofenceList.value = []
      }
    } catch (error) {
      console.error('获取围栏列表错误:', error)
      geofenceList.value = []
    }
  }
  
  // 加载已登记的标签列表
  async function fetchRegisteredTags(mapId) {
    try {
      const response = await axios.get('/api/tags')
      const tags = Array.isArray(response.data) ? response.data : 
                   (response.data && Array.isArray(response.data.content)) ? response.data.content : []
      
      // 只获取指定地图的标签，清空旧的映射
      registeredTags.value.clear()
      
      tags.forEach(tag => {
        // 只添加属于当前地图的标签
        if (tag.mapId === mapId && tag.macAddress) {
          registeredTags.value.set(tag.macAddress, {
            id: tag.id,
            name: tag.name,
            macAddress: tag.macAddress,
            mapId: tag.mapId
          })
        }
      })
      
      console.log(`地图 ${mapId} 已登记标签数量:`, registeredTags.value.size)
    } catch (error) {
      console.error('获取已登记标签列表错误:', error)
      registeredTags.value.clear()
    }
  }
  
  // 切换地图时的处理
  async function handleMapChange(mapId) {
    try {
      // 加载对应地图的已登记标签和围栏
      await Promise.all([
        fetchRegisteredTags(mapId),
        fetchGeofences(mapId)
      ])
      
      // 清除不属于当前地图的传感器
      clearUnregisteredSensors()
    } catch (error) {
      console.error('切换地图处理失败:', error)
    }
  }
  
  // 初始化 store
  function init() {
    initSensorColors()
    // 在这里不自动连接，在需要时才连接
  }
  
  // 清理资源
  function cleanup() {
    // 清理所有超时定时器
    Object.values(sensorTimeouts.value).forEach(timeout => {
      clearTimeout(timeout)
    })
    
    // 清理所有活跃告警通知
    Object.values(activeGeofenceAlerts.value).forEach(notification => {
      notification.close()
    })
    
    // 断开WebSocket连接
    stopAutoConnect()
  }
  
  // 监听选中地图的变化
  watch(() => mapStore.selectedMap?.id, (newMapId, oldMapId) => {
    if (newMapId && newMapId !== oldMapId) {
      handleMapChange(newMapId)
    }
  })
  
  // 将报警数据保存到后端
  async function saveAlarmToBackend(alarmData) {
    try {
      console.log('保存报警数据到后端:', alarmData)
      const response = await axios.post('/api/alarms', alarmData)
      if (response.data.success) {
        console.log('报警数据保存成功:', response.data)
      } else {
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
  
  return {
    // 状态
    wsConnected,
    sensorList,
    visibleSensors,
    visibleSensorsList,
    geofenceList,
    limitTraceEnabled,
    traceLimit,
    receivedDataCount,
    
    // 方法
    connect,
    disconnect,
    startAutoConnect,
    stopAutoConnect,
    getSensorColor,
    clearAllTraces,
    toggleVisibility,
    toggleAllVisible,
    init,
    cleanup,
    fetchGeofences,
    fetchRegisteredTags,
    isPointInPolygon,
    processTrackingData,
    saveAlarmToBackend,
    clearAlertsForTag
  }
}) 