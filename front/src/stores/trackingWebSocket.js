import { ref } from 'vue'
import { Client } from '@stomp/stompjs'

export function createWebSocketManager(mapStore, sensorManager, geofenceManager) {
  // WebSocket连接状态和客户端
  const wsConnected = ref(false)
  const stompClient = ref(null)
  const receivedDataCount = ref(0)
  
  // 数据处理优化相关变量
  const dataBuffer = ref([]) // 存储接收到的数据
  const processingData = ref(false) // 标记是否正在处理数据
  const BUFFER_SIZE = 200 // 缓冲区大小，每批处理200条数据，减少单次处理量
  const PROCESSING_INTERVAL = 16 // 16ms (约60fps)，提高处理频率以获得更流畅的动画效果
  let processingTimer = null // 处理定时器
  
  // 自动连接相关的变量和函数
  const autoConnect = ref(false)
  const reconnectInterval = ref(null)
  
  // 连接WebSocket
  function connect() {
    if (stompClient.value?.active) {
      console.log('WebSocket已连接，无需重复连接')
      return
    }
    
    // 启动标签轮询
    sensorManager.startTagsPolling()
  
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
        
        // 订阅围栏告警通知
        if (geofenceManager) {
          // 注册围栏告警监听器
          geofenceManager.registerAlarmNotificationListener(stompClient.value)
        }
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

    // 将MAC地址转为小写进行比较
    const macLower = data.mac.toLowerCase()
    
    // 预先检查标签是否已经注册（不区分大小写）
    const isRegistered = Array.from(sensorManager.registeredTags.value.keys())
      .some(key => key.toLowerCase() === macLower)
    
    if (!isRegistered) {
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
    
    // 将数据按MAC地址分组（转为小写），使用对象属性访问比Map快
    for (let i = 0; i < currentBatch.length; i++) {
      const data = currentBatch[i]
      const macLower = data.mac.toLowerCase()
      if (!groupedData[macLower]) {
        groupedData[macLower] = []
      }
      groupedData[macLower].push(data)
    }
    
    // 释放原始数据引用，帮助GC回收
    currentBatch.length = 0
    
    // 处理每组数据
    for (const mac in groupedData) {
      const dataList = groupedData[mac]
      // 只处理最新的一条数据，提高性能
      const latestData = dataList[dataList.length - 1]
      sensorManager.processTrackingData(latestData)
      
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
  
  // 清理资源
  function cleanup() {
    // 清除数据处理定时器
    if (processingTimer) {
      clearTimeout(processingTimer)
      processingTimer = null
    }
    
    // 断开WebSocket连接
    stopAutoConnect()
    
    // 释放大型数据结构
    dataBuffer.value = []
  }
  
  return {
    wsConnected,
    receivedDataCount,
    connect,
    disconnect,
    startAutoConnect,
    stopAutoConnect,
    cleanup,
    stompClient // 导出stompClient以便其他组件可以使用
  }
} 