import { defineStore } from 'pinia'
import { ref, computed, watch, nextTick } from 'vue'
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
  
  // 数据处理优化相关变量
  const dataBuffer = ref([]) // 存储接收到的数据
  const processingData = ref(false) // 标记是否正在处理数据
  const BUFFER_SIZE = 200 // 缓冲区大小，每批处理200条数据，减少单次处理量
  const PROCESSING_INTERVAL = 32 // 32ms (约30fps)，降低处理频率以减轻CPU负担
  let processingTimer = null // 处理定时器
  
  // 缓存映射，提高查找性能
  const sensorMap = ref(new Map()) // MAC -> sensor对象的映射
  
  // 超时处理相关
  const SENSOR_TIMEOUT = 10000 // 10秒没有新数据则认为传感器离线
  const sensorTimeouts = ref({}) // 存储每个传感器的超时定时器
  
  // 轨迹控制相关
  const limitTraceEnabled = ref(true) // 默认启用轨迹限制
  const traceLimit = ref(50) // 默认轨迹点数减少到50
  
  // 围栏列表
  const geofenceList = ref([])
  
  // 围栏多边形点的预计算缓存
  const geofenceCache = ref(new Map()) // geofenceId -> 预处理后的数据
  
  // 坐标转换性能优化 - 预计算和缓存
  const coordinateCache = ref(new Map()) // 坐标转换缓存
  const CACHE_SIZE = 2000 // 缓存大小限制减小到2000，减少内存占用
  
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
  
  // 生成颜色
  const generateColors = (count) => {
    const colors = []
    // 使用黄金比例分割法生成均匀分布的色相值
    const goldenRatioConjugate = 0.618033988749895
    let h = Math.random() // 随机起始色相
    
    // 生成色相均匀分布的颜色
    for (let i = 0; i < count; i++) {
      h = (h + goldenRatioConjugate) % 1
      
      // 简化饱和度和亮度计算，减少随机数生成
      const s = 0.65
      const l = i % 2 === 0 ? 0.6 : 0.5
      
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
  
  // 减少颜色生成数量，节省内存
  const COLORS = generateColors(150)
  
  // 可见的传感器列表 (用于渲染)
  const visibleSensorsList = computed(() => {
    return sensorList.value.filter(sensor => sensor.visible)
  })
  
  // 自动连接相关的变量和函数
  const autoConnect = ref(false)
  const reconnectInterval = ref(null)
  
  // 标签轮询相关变量
  const tagsPollingInterval = ref(null)
  
  // 内存使用监控
  let memoryMonitorInterval = null
  
  // 在useTrackingStore定义的开始，添加lastUpdateTimestamp变量用于跟踪数据更新
  const lastUpdateTimestamp = ref(Date.now());
  const forceUpdateFlag = ref(0); // 强制触发视图更新的标记
  
  // 连接WebSocket
  function connect() {
    if (stompClient.value?.active) {
      console.log('WebSocket已连接，无需重复连接')
      return
    }
    
    // 启动标签轮询
    startTagsPolling()
  
    stompClient.value = new Client({
      brokerURL: '/ws-path/websocket',
      reconnectDelay: 2000, // 减少重连延迟到2秒
      heartbeatIncoming: 2000, // 减少心跳间隔提高响应速度
      heartbeatOutgoing: 2000,
      onConnect: () => {
        console.log('WebSocket连接成功')
        wsConnected.value = true
        
        // 订阅轨迹数据 - 实现批量处理
        stompClient.value.subscribe('/topic/pathData', message => {
          try {
            const data = JSON.parse(message.body)
            receivedDataCount.value++
            
            // 不再输出详细日志，减少性能开销
            // console.debug('接收轨迹:', data.mac, data.x, data.y)
            
            // 添加到数据缓冲区
            enqueueData(data)
            
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
  
  // 将数据添加到缓冲区并触发处理
  function enqueueData(data) {
    // 快速验证数据格式是否正确
    if (!data || !data.mac || typeof data.x !== 'number' || typeof data.y !== 'number') {
      return
    }

    // 预先验证数据是否适用于当前地图
    if (data.map_id !== mapStore.selectedMap?.mapId) {
      return
    }

    // 预先检查标签是否已经注册
    if (!registeredTags.value.has(data.mac)) {
      return
    }
    
    // 添加到缓冲区
    dataBuffer.value.push(data)
    
    // 如果缓冲区达到阈值或者还没有启动处理，则安排处理任务
    if (!processingTimer) {
      processingTimer = setTimeout(processBatch, PROCESSING_INTERVAL)
    }
  }
  
  // 批量处理数据
  function processBatch() {
    processingTimer = null
    
    if (dataBuffer.value.length === 0) return

    // 获取本次要处理的数据
    const currentBatch = dataBuffer.value.splice(0, BUFFER_SIZE)
    
    // 如果缓冲区中还有数据，安排下一次处理
    if (dataBuffer.value.length > 0) {
      processingTimer = setTimeout(processBatch, PROCESSING_INTERVAL)
    }

    // 使用更高效的处理方式，不依赖requestAnimationFrame减少回调开销
    // 按MAC分组处理，减少对同一传感器的反复操作
    const groupedData = Object.create(null) // 使用Object而非Map减少内存开销
    
    // 将数据按MAC地址分组，使用对象属性访问比Map快
    for (let i = 0; i < currentBatch.length; i++) {
      const data = currentBatch[i]
      if (!groupedData[data.mac]) {
        groupedData[data.mac] = []
      }
      groupedData[data.mac].push(data)
    }
    
    // 释放原始数据引用，帮助GC回收
    currentBatch.length = 0
    
    // 处理每组数据
    for (const mac in groupedData) {
      const dataList = groupedData[mac]
      // 只处理最新的一条数据，提高性能
      const latestData = dataList[dataList.length - 1]
      processTrackingData(latestData)
      
      // 释放数据引用
      dataList.length = 0
    }
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
    
    // 清除数据处理定时器
    if (processingTimer) {
      clearTimeout(processingTimer)
      processingTimer = null
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
    
    // 仅在页面不忙时再写入localStorage
    requestIdleCallback(() => {
      try {
        const storedColors = JSON.parse(localStorage.getItem('sensorColors') || '{}')
        storedColors[mac] = COLORS[colorIndex]
        localStorage.setItem('sensorColors', JSON.stringify(storedColors))
      } catch (e) {
        console.error('无法存储传感器颜色到localStorage:', e)
      }
    })
    
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
    const pixelX = cachedMeterToPixelX(point.x)
    const pixelY = cachedMeterToPixelY(point.y)
    
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
  const handleGeofenceAlert = (sensorMac, geofenceId, point) => {
    // 找到对应的围栏
    const geofence = geofenceList.value.find(g => g.id === geofenceId)
    if (!geofence) return
    
    // 获取标签名称
    const sensor = sensorMap.value.get(sensorMac) || sensorList.value.find(s => s.mac === sensorMac)
    const tagName = sensor?.name || sensorMac
    
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
  
  // 坐标转换缓存函数
  function cachedMeterToPixelX(meterX) {
    const cacheKey = `x:${meterX}`
    if (coordinateCache.value.has(cacheKey)) {
      return coordinateCache.value.get(cacheKey)
    }
    
    const pixelX = mapStore.meterToPixelX(meterX)
    
    // 管理缓存大小
    if (coordinateCache.value.size > CACHE_SIZE) {
      // 如果缓存超过大小限制，清空一半缓存
      const keys = Array.from(coordinateCache.value.keys())
      for (let i = 0; i < keys.length / 2; i++) {
        coordinateCache.value.delete(keys[i])
      }
    }
    
    coordinateCache.value.set(cacheKey, pixelX)
    return pixelX
  }
  
  function cachedMeterToPixelY(meterY) {
    const cacheKey = `y:${meterY}`
    if (coordinateCache.value.has(cacheKey)) {
      return coordinateCache.value.get(cacheKey)
    }
    
    const pixelY = mapStore.meterToPixelY(meterY)
    
    // 管理缓存大小
    if (coordinateCache.value.size > CACHE_SIZE) {
      // 缓存管理已在X函数中处理，这里不重复
      return pixelY
    }
    
    coordinateCache.value.set(cacheKey, pixelY)
    return pixelY
  }
  
  // 清除不在标签表中注册的传感器
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
        // 清理该标签的所有围栏告警
        clearAlertsForTag(sensor.mac)
        // 从映射中移除
        sensorMap.value.delete(sensor.mac)
      }
      return isRegistered
    })
  }
  
  // 根据当前选中地图的mapId过滤传感器
  function filterSensorsByMapId() {
    const currentMapId = mapStore.selectedMap?.mapId;
    
    // 移除不属于当前地图的传感器
    sensorList.value = sensorList.value.filter(sensor => {
      // 如果传感器没有mapId或与当前地图不匹配，则移除
      const shouldKeep = sensor.mapId === currentMapId;
      
      if (!shouldKeep) {
        // 删除不匹配的传感器
        visibleSensors.value.delete(sensor.mac);
        
        // 清除超时定时器
        if (sensorTimeouts.value[sensor.mac]) {
          clearTimeout(sensorTimeouts.value[sensor.mac]);
          delete sensorTimeouts.value[sensor.mac];
        }
        
        // 清理该标签的所有围栏告警
        clearAlertsForTag(sensor.mac);
        
        // 从映射中移除
        sensorMap.value.delete(sensor.mac);
      }
      
      return shouldKeep;
    });
    
    // 重新生成sensorMap
    sensorMap.value.clear();
    for (const sensor of sensorList.value) {
      sensorMap.value.set(sensor.mac, sensor);
    }
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
  
  // 直接处理轨迹数据的函数，优化版
  function processTrackingData(data) {
    // 验证和筛选逻辑已经在enqueueData中完成，这里不再重复
    
    // 使用sensorMap快速查找
    let sensor = sensorMap.value.get(data.mac)
    
    // 清除之前的超时定时器
    if (sensorTimeouts.value[data.mac]) {
      clearTimeout(sensorTimeouts.value[data.mac])
    }
    
    // 设置新的超时定时器
    sensorTimeouts.value[data.mac] = setTimeout(() => {
      // 使用Map直接获取传感器索引，而不是再次遍历数组
      if (sensorMap.value.has(data.mac)) {
        // 标记为待删除
        const sensorToRemove = sensorMap.value.get(data.mac)
        const index = sensorList.value.indexOf(sensorToRemove)
        
        if (index !== -1) {
          // 移除前清理围栏告警
          clearAlertsForTag(data.mac)
          
          // 移除传感器
          sensorList.value.splice(index, 1)
          visibleSensors.value.delete(data.mac)
          sensorMap.value.delete(data.mac)
        }
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
        points: [],
        mapId: data.map_id, // 记录标签来自的地图ID
        lastUpdated: Date.now() // 添加最后更新时间
      }
      sensorList.value.push(sensor)
      sensorMap.value.set(data.mac, sensor)
      visibleSensors.value.add(data.mac)
    } else {
      // 更新标签的mapId
      sensor.mapId = data.map_id
      // 更新最后更新时间
      sensor.lastUpdated = Date.now()
    }
    
    // 创建点对象并添加到传感器轨迹
    const point = {
      x: parseFloat(data.x),
      y: parseFloat(data.y),
      timestamp: data.timestamp
    }
    
    // 如果启用了轨迹限制，在可能超出限制前进行处理
    if (limitTraceEnabled.value && sensor.points.length >= traceLimit.value) {
      // 直接去除多余的旧点
      sensor.points = sensor.points.slice(-traceLimit.value + 1)
    }
    
    // 添加新点
    sensor.points.push(point)
    sensor.lastPoint = point
    
    // 更新最后数据处理时间戳
    lastUpdateTimestamp.value = Date.now();
    
    // 如果传感器可见，检查围栏入侵
    if (sensor.visible && geofenceList.value.length > 0) {
      checkGeofenceIntrusion(sensor.mac, point)
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
  
  // 加载已登记的标签列表
  async function fetchRegisteredTags(mapId) {
    try {
      const response = await axios.get('/api/tags')
      const tags = Array.isArray(response.data) ? response.data : 
                   (response.data && Array.isArray(response.data.content)) ? response.data.content : []
      
      // 不再按地图ID过滤，获取所有登记的标签
      registeredTags.value.clear()
      
      tags.forEach(tag => {
        // 将所有标签都添加到映射中，不根据mapId过滤
        if (tag.macAddress) {
          registeredTags.value.set(tag.macAddress, {
            id: tag.id,
            name: tag.name,
            macAddress: tag.macAddress,
            mapId: tag.mapId
          })
        }
      })
      
      console.log(`已登记标签总数量: ${registeredTags.value.size}`)
    } catch (error) {
      console.error('获取已登记标签列表错误:', error)
      registeredTags.value.clear()
    }
  }
  
  // 启动标签定时轮询
  function startTagsPolling() {
    // 先清除可能存在的定时器
    if (tagsPollingInterval.value) {
      clearInterval(tagsPollingInterval.value)
    }
    
    // 立即执行一次
    fetchRegisteredTags()
    
    // 设置10秒轮询间隔
    tagsPollingInterval.value = setInterval(() => {
      fetchRegisteredTags()
    }, 10000)
    
    console.log('已启动标签信息10秒轮询')
  }
  
  // 停止标签定时轮询
  function stopTagsPolling() {
    if (tagsPollingInterval.value) {
      clearInterval(tagsPollingInterval.value)
      tagsPollingInterval.value = null
      console.log('已停止标签信息轮询')
    }
  }
  
  // 切换地图时的处理
  async function handleMapChange(mapId) {
    try {
      // 立即清空所有轨迹和传感器
      sensorList.value = [];
      visibleSensors.value.clear();
      sensorMap.value.clear();
      
      // 清空坐标转换缓存
      coordinateCache.value.clear();
      
      // 清理所有围栏告警
      Object.keys(activeGeofenceAlerts.value).forEach(alertKey => {
        if (activeGeofenceAlerts.value[alertKey]) {
          activeGeofenceAlerts.value[alertKey].close();
        }
      });
      activeGeofenceAlerts.value = {};
      
      // 清空所有超时定时器
      Object.keys(sensorTimeouts.value).forEach(mac => {
        clearTimeout(sensorTimeouts.value[mac]);
        delete sensorTimeouts.value[mac];
      });
      
      // 加载对应地图的已登记标签和围栏
      await Promise.all([
        fetchRegisteredTags(mapId),
        fetchGeofences(mapId)
      ]);
      
      // 预计算围栏数据
      precomputeGeofenceData();
    } catch (error) {
      console.error('切换地图处理失败:', error);
    }
  }
  
  // 初始化 store
  function init() {
    initSensorColors()
    
    // 添加requestIdleCallback的ployfill
    if (!window.requestIdleCallback) {
      window.requestIdleCallback = (callback) => {
        return setTimeout(() => {
          const start = Date.now()
          callback({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
          })
        }, 1)
      }
      
      window.cancelIdleCallback = (id) => clearTimeout(id)
    }
    
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
      optimizeMemory()
    }, 60000) // 每分钟执行一次
  }
  
  // 内存优化函数
  function optimizeMemory() {
    try {
      // 1. 清理长时间未更新的传感器
      const now = Date.now()
      const oldThreshold = 300000 // 5分钟未更新则清理
      
      const oldSensors = sensorList.value.filter(sensor => 
        !sensor.lastUpdated || (now - sensor.lastUpdated) > oldThreshold)
      
      oldSensors.forEach(sensor => {
        // 只清理非可见传感器的数据点以节省内存
        if (!visibleSensors.value.has(sensor.mac)) {
          // 清空数据点但保留传感器记录
          sensor.points = []
        }
      })
      
      // 2. 对非活跃传感器应用轨迹限制策略
      // 注意：不进行采样压缩，保留全部轨迹点
      if (limitTraceEnabled.value) {
        sensorList.value.forEach(sensor => {
          // 如果是非可见传感器且轨迹限制开启，则只保留轨迹限制数量的点
          if (!visibleSensors.value.has(sensor.mac) && sensor.points && 
              sensor.points.length > traceLimit.value) {
            // 仅保留最新的traceLimit个点
            sensor.points = sensor.points.slice(-traceLimit.value)
          }
        })
      }
      
      // 3. 清理坐标转换缓存
      if (coordinateCache.value.size > CACHE_SIZE * 0.8) {
        coordinateCache.value.clear()
      }
    } catch (e) {
      console.error('内存优化过程中出错:', e)
    }
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
    
    // 清理数据处理定时器
    if (processingTimer) {
      clearTimeout(processingTimer)
      processingTimer = null
    }
    
    // 停止标签轮询
    stopTagsPolling()
    
    // 停止内存监控
    if (memoryMonitorInterval) {
      clearInterval(memoryMonitorInterval)
      memoryMonitorInterval = null
    }
    
    // 断开WebSocket连接
    stopAutoConnect()
    
    // 释放大型数据结构
    sensorList.value = []
    dataBuffer.value = []
    coordinateCache.value.clear()
    sensorMap.value.clear()
    visibleSensors.value.clear()
    geofenceCache.value.clear()
  }
  
  // 监听选中地图的变化
  watch(() => mapStore.selectedMap?.mapId, (newMapId, oldMapId) => {
    if (newMapId && newMapId !== oldMapId) {
      handleMapChange(newMapId);
    }
  })
  
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
  
  // 添加检查是否有数据更新的函数
  function hasDataUpdates() {
    // 1秒内有数据更新则返回true
    return (Date.now() - lastUpdateTimestamp.value < 1000);
  }
  
  // 添加通知更新函数，用于强制视图刷新
  function notifyUpdate() {
    // 简单地增加计数器值，这将触发Vue的响应式系统
    forceUpdateFlag.value += 1;
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
    forceUpdateFlag, // 添加强制更新标记
    
    // 方法
    connect,
    disconnect,
    startAutoConnect,
    stopAutoConnect,
    startTagsPolling,
    stopTagsPolling,
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
    clearAlertsForTag,
    filterSensorsByMapId,
    hasDataUpdates, // 添加检查数据更新的函数
    notifyUpdate // 添加通知更新的函数
  }
}) 