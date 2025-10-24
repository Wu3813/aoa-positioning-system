import { ref, computed, watch } from 'vue'
import axios from 'axios'

export function createSensorManager(mapStore, colorUtils, geofenceManager) {
  // 传感器和轨迹数据
  const sensorList = ref([])
  const visibleSensors = ref(new Set())
  
  // 缓存映射，提高查找性能
  const sensorMap = ref(new Map()) // MAC -> sensor对象的映射
  
  // 超时处理相关 - 使用统一的超时配置
  const DEFAULT_SENSOR_TIMEOUT = 30000 // 默认30秒，与后端保持一致
  const sensorTimeouts = ref({}) // 存储每个传感器的超时定时器
  
  // 获取超时配置的函数
  const getSensorTimeout = () => {
    try {
      // 从localStorage获取超时配置
      const taskConfig = JSON.parse(localStorage.getItem('taskConfig') || '{}')
      if (taskConfig.timeoutTask && taskConfig.timeoutTask.enabled && taskConfig.timeoutTask.timeoutMs) {
        return taskConfig.timeoutTask.timeoutMs
      }
    } catch (e) {
      console.error('获取超时配置失败，使用默认值:', e)
    }
    return DEFAULT_SENSOR_TIMEOUT
  }
  
  // 轨迹控制相关
  const limitTraceEnabled = ref(true) // 默认启用轨迹限制
  const traceLimit = ref(20) // 默认轨迹点数减少到20
  const showTracePoints = ref(true) // 默认显示轨迹点
  const tagIconOpacity = ref(100) // 标签图标透明度，默认100%
  
  // 初始化轨迹控制设置
  function initTraceSettings() {
    try {
      const storedSettings = JSON.parse(sessionStorage.getItem('traceSettings') || '{}')
      limitTraceEnabled.value = storedSettings.limitTraceEnabled !== undefined ? storedSettings.limitTraceEnabled : true
      traceLimit.value = storedSettings.traceLimit || 20
      showTracePoints.value = storedSettings.showTracePoints !== undefined ? storedSettings.showTracePoints : true
      tagIconOpacity.value = storedSettings.tagIconOpacity || 100
    } catch (e) {
      console.error('无法从sessionStorage加载轨迹设置:', e)
      limitTraceEnabled.value = true
      traceLimit.value = 20
      showTracePoints.value = true
      tagIconOpacity.value = 100
    }
  }
  
  // 保存轨迹控制设置
  function saveTraceSettings() {
    try {
      const settings = {
        limitTraceEnabled: limitTraceEnabled.value,
        traceLimit: traceLimit.value,
        showTracePoints: showTracePoints.value,
        tagIconOpacity: tagIconOpacity.value
      }
      sessionStorage.setItem('traceSettings', JSON.stringify(settings))
    } catch (e) {
      console.error('无法保存轨迹设置到sessionStorage:', e)
    }
  }
  
  // 立即应用轨迹限制到现有传感器
  function applyTraceLimitToExistingSensors() {
    console.log(`应用轨迹限制到现有传感器，启用状态: ${limitTraceEnabled.value}，限制数量: ${traceLimit.value}`)
    
    sensorList.value.forEach(sensor => {
      if (limitTraceEnabled.value) {
        // 启用轨迹限制：保留指定数量的轨迹点
        if (sensor.points && sensor.points.length > traceLimit.value) {
          const originalLength = sensor.points.length
          sensor.points = sensor.points.slice(-traceLimit.value)
          console.log(`传感器 ${sensor.mac}: 从 ${originalLength} 个点减少到 ${sensor.points.length} 个点`)
        }
      } else {
        // 关闭轨迹限制：清空所有轨迹
        if (sensor.points && sensor.points.length > 0) {
          console.log(`传感器 ${sensor.mac}: 清空轨迹，原有点数: ${sensor.points.length}`)
          sensor.points = []
        }
      }
    })
    
    // 触发视图更新
    notifyUpdate()
  }
  
  // 监听轨迹设置变化并保存
  watch(limitTraceEnabled, saveTraceSettings)
  watch(traceLimit, saveTraceSettings)
  watch(showTracePoints, saveTraceSettings)
  watch(tagIconOpacity, saveTraceSettings)
  
  // 监听轨迹限制变化，立即处理现有轨迹点
  watch(traceLimit, (newLimit, oldLimit) => {
    if (newLimit !== oldLimit && limitTraceEnabled.value) {
      applyTraceLimitToExistingSensors()
    }
  })
  
  // 监听轨迹限制开关变化
  watch(limitTraceEnabled, (newEnabled, oldEnabled) => {
    if (newEnabled !== oldEnabled && newEnabled) {
      // 当启用轨迹限制时，立即应用限制
      applyTraceLimitToExistingSensors()
    }
  })
  
  // 传感器颜色映射
  const sensorColors = ref({})
  
  // 存储已登记的标签列表 (MAC地址 -> 标签信息的映射)
  const registeredTags = ref(new Map())
  
  // 标签轮询相关变量
  const tagsPollingInterval = ref(null)
  
  // 在useTrackingStore定义的开始，添加lastUpdateTimestamp变量用于跟踪数据更新
  const lastUpdateTimestamp = ref(Date.now())
  const forceUpdateFlag = ref(0) // 强制触发视图更新的标记
  
  // 可见的传感器列表 (用于渲染)
  const visibleSensorsList = computed(() => {
    return sensorList.value.filter(sensor => sensor.visible)
  })
  
  // 获取传感器颜色，确保同一MAC地址始终使用相同颜色
  function getSensorColor(mac) {
    // 将MAC地址转为小写，确保不区分大小写
    const macLower = mac.toLowerCase()
    
    // 如果已经有分配的颜色，直接返回
    if (sensorColors.value[macLower]) {
      return sensorColors.value[macLower]
    }
    
    // 使用MAC地址作为种子计算固定的颜色索引
    let hashCode = 0
    for (let i = 0; i < macLower.length; i++) {
      hashCode = ((hashCode << 5) - hashCode) + macLower.charCodeAt(i)
      hashCode = hashCode & hashCode // 转换为32位整数
    }
    
    // 确保为正数
    hashCode = Math.abs(hashCode)
    const colorIndex = hashCode % colorUtils.COLORS.length
    
    // 存储映射关系
    sensorColors.value[macLower] = colorUtils.COLORS[colorIndex]
    
    // 仅在页面不忙时再写入localStorage
    requestIdleCallback(() => {
      try {
        const storedColors = JSON.parse(localStorage.getItem('sensorColors') || '{}')
        storedColors[macLower] = colorUtils.COLORS[colorIndex]
        localStorage.setItem('sensorColors', JSON.stringify(storedColors))
      } catch (e) {
        console.error('无法存储传感器颜色到localStorage:', e)
      }
    })
    
    return colorUtils.COLORS[colorIndex]
  }
  
  // 初始化从sessionStorage加载传感器颜色映射
  function initSensorColors() {
    try {
      const storedColors = JSON.parse(sessionStorage.getItem('sensorColors') || '{}')
      sensorColors.value = storedColors
    } catch (e) {
      console.error('无法从sessionStorage加载传感器颜色:', e)
      sensorColors.value = {}
    }
  }

  // 手动更改传感器颜色
  function changeSensorColor(mac, newColor) {
    // 验证参数
    if (!mac) {
      console.warn('changeSensorColor: 缺少MAC地址参数', { mac, newColor })
      return
    }
    
    const macLower = mac.toLowerCase()
    
    // 如果颜色为空或null，设置为白色
    if (!newColor || newColor === null || newColor === undefined) {
      newColor = '#FFFFFF'
    }
    
    // 验证颜色格式
    if (!/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
      console.warn('changeSensorColor: 无效的颜色格式', newColor)
      return
    }
    
    // 更新内存中的颜色
    sensorColors.value[macLower] = newColor
    
    // 更新sessionStorage
    try {
      const storedColors = JSON.parse(sessionStorage.getItem('sensorColors') || '{}')
      storedColors[macLower] = newColor
      sessionStorage.setItem('sensorColors', JSON.stringify(storedColors))
    } catch (e) {
      console.error('无法存储传感器颜色到sessionStorage:', e)
    }
    
    // 更新传感器列表中的颜色
    const sensor = sensorMap.value.get(macLower)
    if (sensor) {
      sensor.color = newColor
    }
  }
  
  // 清空所有轨迹
  function clearAllTraces() {
    sensorList.value.forEach(sensor => {
      sensor.points = []
      sensor.lastPoint = null
    })
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
        geofenceManager.clearAlertsForTag(sensor.mac)
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
        geofenceManager.clearAlertsForTag(sensor.mac);
        
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
    
    // 更新可见传感器集合 - 确保使用小写MAC
    const macLower = sensor.mac.toLowerCase()
    if (sensor.visible) {
      visibleSensors.value.add(macLower)
    } else {
      visibleSensors.value.delete(macLower)
    }
    
    // 保存传感器可见性状态
    saveSensorVisibility()
  }
  
  // 切换所有传感器显示状态
  function toggleAllVisible(visible) {
    sensorList.value.forEach(sensor => {
      sensor.visible = visible
      // 确保使用小写MAC
      const macLower = sensor.mac.toLowerCase()
      if (visible) {
        visibleSensors.value.add(macLower)
      } else {
        visibleSensors.value.delete(macLower)
      }
    })
    
    // 保存传感器可见性状态
    saveSensorVisibility()
  }
  
  // 直接处理轨迹数据的函数，优化版
  function processTrackingData(data) {
    // 验证和筛选逻辑已经在enqueueData中完成，这里不再重复
    
    // 将MAC地址转为小写，确保不区分大小写
    const macLower = data.mac.toLowerCase()
    
    // 使用sensorMap快速查找
    let sensor = sensorMap.value.get(macLower)
    
    // 清除之前的超时定时器
    if (sensorTimeouts.value[macLower]) {
      clearTimeout(sensorTimeouts.value[macLower])
    }
    
    // 设置新的超时定时器
    sensorTimeouts.value[macLower] = setTimeout(() => {
      // 使用Map直接获取传感器索引，而不是再次遍历数组
      if (sensorMap.value.has(macLower)) {
        // 标记为待删除
        const sensorToRemove = sensorMap.value.get(macLower)
        const index = sensorList.value.indexOf(sensorToRemove)
        
        if (index !== -1) {
          // 移除前清理围栏告警
          geofenceManager.clearAlertsForTag(macLower)
          
          // 移除传感器
          sensorList.value.splice(index, 1)
          visibleSensors.value.delete(macLower)
          sensorMap.value.delete(macLower)
        }
      }
      delete sensorTimeouts.value[macLower]
    }, getSensorTimeout())
    
    // 如果是新传感器，创建并添加
    if (!sensor) {
      // 使用小写MAC地址查找标签信息
      const tagInfo = Array.from(registeredTags.value.entries()).find(
        ([key, _]) => key.toLowerCase() === macLower
      )?.[1]
      
      // 检查保存的可见性状态
      let savedVisibility = true
      try {
        const storedVisibility = JSON.parse(sessionStorage.getItem('sensorVisibility') || '{}')
        savedVisibility = storedVisibility[macLower] !== undefined ? storedVisibility[macLower] : true
      } catch (e) {
        console.error('无法从sessionStorage读取传感器可见性状态:', e)
        savedVisibility = true
      }
      
      sensor = {
        mac: macLower, // 存储小写MAC地址
        name: tagInfo?.name || data.mac, // 名称保留原始显示
        visible: savedVisibility,
        showTrace: true,
        color: getSensorColor(macLower),
        points: [],
        mapId: data.map_id, // 记录标签来自的地图ID
        lastUpdated: Date.now() // 添加最后更新时间
      }
      sensorList.value.push(sensor)
      sensorMap.value.set(macLower, sensor)
      if (savedVisibility) {
        visibleSensors.value.add(macLower)
      }
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
    
    // 如果启用了轨迹限制，添加新点并限制数量
    if (limitTraceEnabled.value) {
      // 添加新点
      sensor.points.push(point)
      
      // 确保轨迹点数量不超过限制
      if (sensor.points.length > traceLimit.value) {
        sensor.points = sensor.points.slice(-traceLimit.value)
      }
    } else {
      // 如果关闭轨迹限制，不显示任何轨迹
      sensor.points = []
    }
    sensor.lastPoint = point
    
    // 触发位置更新动画（如果存在动画处理器）
    if (window.sensorAnimationHandler) {
      window.sensorAnimationHandler(sensor, point)
    }
    
    // 更新最后数据处理时间戳
    lastUpdateTimestamp.value = Date.now();
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
      
      // 清理所有超时定时器
      Object.keys(sensorTimeouts.value).forEach(mac => {
        clearTimeout(sensorTimeouts.value[mac]);
        delete sensorTimeouts.value[mac];
      });
      
      // 加载对应地图的已登记标签
      await fetchRegisteredTags(mapId);
      
    } catch (error) {
      console.error('切换地图处理失败:', error);
    }
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
      sensorList.value.forEach(sensor => {
        if (!visibleSensors.value.has(sensor.mac)) {
          if (limitTraceEnabled.value) {
            // 启用轨迹限制：只保留轨迹限制数量的点
            if (sensor.points && sensor.points.length > traceLimit.value) {
              sensor.points = sensor.points.slice(-traceLimit.value)
            }
          } else {
            // 关闭轨迹限制：清空所有轨迹
            if (sensor.points && sensor.points.length > 0) {
              sensor.points = []
            }
          }
        }
      })
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
    
    // 停止标签轮询
    stopTagsPolling()
    
    // 释放大型数据结构
    sensorList.value = []
    sensorMap.value.clear()
    visibleSensors.value.clear()
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
  
  // 保存传感器可见性状态
  function saveSensorVisibility() {
    try {
      const visibilityState = {}
      sensorList.value.forEach(sensor => {
        visibilityState[sensor.mac] = sensor.visible
      })
      sessionStorage.setItem('sensorVisibility', JSON.stringify(visibilityState))
    } catch (e) {
      console.error('无法保存传感器可见性状态到sessionStorage:', e)
    }
  }
  
  // 加载传感器可见性状态
  function loadSensorVisibility() {
    try {
      const storedVisibility = JSON.parse(sessionStorage.getItem('sensorVisibility') || '{}')
      
      // 应用保存的可见性状态
      sensorList.value.forEach(sensor => {
        const macLower = sensor.mac.toLowerCase()
        if (storedVisibility[macLower] !== undefined) {
          sensor.visible = storedVisibility[macLower]
          if (sensor.visible) {
            visibleSensors.value.add(macLower)
          } else {
            visibleSensors.value.delete(macLower)
          }
        }
      })
    } catch (e) {
      console.error('无法从sessionStorage加载传感器可见性状态:', e)
    }
  }
  
  return {
    // 状态
    sensorList,
    visibleSensors,
    visibleSensorsList,
    limitTraceEnabled,
    traceLimit,
    showTracePoints,
    tagIconOpacity,
    registeredTags,
    sensorMap,
    forceUpdateFlag,
    lastUpdateTimestamp,
    
    // 方法
    getSensorColor,
    initSensorColors,
    initTraceSettings,
    loadSensorVisibility,
    clearAllTraces,
    toggleVisibility,
    toggleAllVisible,
    processTrackingData,
    clearUnregisteredSensors,
    filterSensorsByMapId,
    fetchRegisteredTags,
    startTagsPolling,
    stopTagsPolling,
    handleMapChange,
    optimizeMemory,
    cleanup,
    hasDataUpdates,
    notifyUpdate,
    changeSensorColor,
    applyTraceLimitToExistingSensors
  }
} 