<template>
  <div class="monitor-container">
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>轨迹管理</h2>
        <div class="control-buttons">
          <span style="margin-right: 8px;">当前地图：</span>
          <el-select 
            v-model="selectedMapId" 
            placeholder="暂无地图" 
            style="width: 200px;"
            @change="handleMapChange"
          >
            <el-option
              v-for="map in mapList"
              :key="map.id"
              :label="map.name"
              :value="map.id"
            />
          </el-select>
          <div class="trace-control">
            <span style="margin-right: 8px;">保留轨迹数量</span>
            <el-switch
              v-model="limitTraceEnabled"
            />
            <el-input-number 
              v-model="traceLimit" 
              :min="1"
              :max="1000"
              :disabled="!limitTraceEnabled"
              size="small"
              style="width: 120px; margin-left: 10px;"
            />
          </div>
          <el-button @click="clearAllTraces" type="danger">
            <el-icon><Delete /></el-icon>清空所有轨迹
          </el-button>
        </div>
        <!-- 添加当前活跃传感器数量显示 -->
        <div class="stats-bar">
          <el-tag type="success">活跃传感器: {{ sensorList.length }}</el-tag>
          <el-tag type="info">可见传感器: {{ visibleSensors.size }}</el-tag>
          <el-tag type="warning">接收数据: {{ receivedDataCount }}</el-tag>
          <el-tooltip content="WebSocket连接状态" placement="top">
            <el-tag :type="wsConnected ? 'success' : 'danger'">{{ wsConnected ? "已连接" : "未连接" }}</el-tag>
          </el-tooltip>
        </div>
      </div>
    </div>

    <div class="main-content">
      <!-- 左侧传感器列表 -->
      <div class="sensor-list">
        <h3>传感器列表</h3>
        <div class="sensor-list-actions">
          <el-button size="small" @click="toggleAllVisible(true)">全部显示</el-button>
          <el-button size="small" @click="toggleAllVisible(false)">全部隐藏</el-button>
        </div>
        <el-input
          v-model="sensorFilter"
          placeholder="搜索传感器"
          prefix-icon="Search"
          clearable
          size="small"
          style="margin-bottom: 10px;"
        />
        <el-scrollbar height="calc(100vh - 380px)">
          <el-table 
            :data="filteredSensorList" 
            style="width: 100%" 
            size="small"
            :max-height="'100%'"
          >
            <el-table-column prop="mac" label="MAC地址" width="110" show-overflow-tooltip />
            <el-table-column label="颜色" width="50">
              <template #default="scope">
                <div class="color-block" :style="{ backgroundColor: scope.row.color }"></div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90">
              <template #default="scope">
                <el-button
                  size="small"
                  :type="scope.row.visible ? 'primary' : 'info'"
                  @click="toggleVisibility(scope.row)"
                >
                  {{ scope.row.visible ? '隐藏' : '显示' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-scrollbar>
      </div>

      <!-- 右侧地图区域 -->
      <div class="map-container">
        <div class="coordinate-system">
          <div class="image-wrapper">
            <img 
              :src="mapStore.mapUrl" 
              alt="监控地图" 
              class="map-image" 
              ref="mapImage"
              @load="updateImageSize"
            />
            <svg 
              class="coordinate-overlay" 
              :style="{
                width: `${imageWidth}px`, 
                height: `${imageHeight}px`,
                top: `${imageOffsetTop}px`,
                left: `${imageOffsetLeft}px`
              }"
            >
              <template v-for="sensor in visibleSensorsList" :key="sensor.mac">
                <!-- 当前位置点 -->
                <circle
                  v-if="sensor.lastPoint"
                  :cx="meterToPixelX(sensor.lastPoint.x)"
                  :cy="meterToPixelY(sensor.lastPoint.y)"
                  r="5"
                  :fill="sensor.color"
                  stroke="#fff"
                  stroke-width="2"
                />
                <!-- 轨迹线 -->
                <polyline
                  v-if="sensor.points && sensor.points.length > 1"
                  :points="getTracePoints(sensor.points)"
                  :stroke="sensor.color"
                  fill="none"
                  stroke-width="2"
                  opacity="0.6"
                />
              </template>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMapStore } from '@/stores/map'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Client } from '@stomp/stompjs'
import { Search, Refresh, Plus, Delete, Edit, Setting, Picture } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 坐标系范围配置
const COORDINATE_RANGE = {
  x: {
    min: -6,
    max: 6
  },
  y: {
    min: -2,
    max: 10
  }
}

const stompClient = ref(null)
const lastMessage = ref('')
const mapImage = ref(null)
const imageWidth = ref(0)
const imageHeight = ref(0)
const imageOffsetTop = ref(0)
const imageOffsetLeft = ref(0)
const wsConnected = ref(false)
const receivedDataCount = ref(0)

// 坐标转换函数
const mapStore = useMapStore()

// 使用 store 中的值
const meterToPixelX = (x) => {
  if (typeof x !== 'number') {
    console.warn('非数值类型的X坐标:', x)
    return 0
  }
  const xRange = mapStore.coordinateRange.x.max - mapStore.coordinateRange.x.min
  const xScale = imageWidth.value / xRange
  return (x - mapStore.coordinateRange.x.min) * xScale
}

const meterToPixelY = (y) => {
  if (typeof y !== 'number') {
    console.warn('非数值类型的Y坐标:', y)
    return 0
  }
  const yRange = mapStore.coordinateRange.y.max - mapStore.coordinateRange.y.min
  const yScale = imageHeight.value / yRange
  return imageHeight.value - (y - mapStore.coordinateRange.y.min) * yScale
}

const updateImageSize = () => {
  const img = mapImage.value
  if (img) {
    // 等待图片加载完成后再获取尺寸
    if (img.complete) {
      imageWidth.value = img.offsetWidth
      imageHeight.value = img.offsetHeight
      imageOffsetTop.value = img.offsetTop
      imageOffsetLeft.value = img.offsetLeft
    } else {
      img.onload = () => {
        imageWidth.value = img.offsetWidth
        imageHeight.value = img.offsetHeight
        imageOffsetTop.value = img.offsetTop
        imageOffsetLeft.value = img.offsetLeft
      }
    }
  }
}

// 传感器数据
const COLORS = [
  '#FF4444', '#44FF44', '#4444FF', '#FFFF44', 
  '#FF44FF', '#44FFFF', '#FF8844', '#44FF88',
  '#884444', '#448844', '#444488', '#888844',
  '#884488', '#448888', '#FF0088', '#88FF00'
]

// 获取下一个可用颜色
const getNextColor = (index) => {
  return COLORS[index % COLORS.length]
}

// 传感器数据结构
const sensorList = ref([])
const visibleSensors = ref(new Set())
const sensorFilter = ref('')

// 筛选后的传感器列表
const filteredSensorList = computed(() => {
  if (!sensorFilter.value) return sensorList.value
  const lowerFilter = sensorFilter.value.toLowerCase()
  return sensorList.value.filter(sensor => 
    sensor.mac.toLowerCase().includes(lowerFilter)
  )
})

// 可见的传感器列表 (用于渲染)
const visibleSensorsList = computed(() => {
  return sensorList.value.filter(sensor => sensor.visible)
})

// 轨迹控制相关
const limitTraceEnabled = ref(false)
const traceLimit = ref(100)

// 获取轨迹点函数
const getTracePoints = (points) => {
  let displayPoints = points
  if (limitTraceEnabled.value) {
    displayPoints = points.slice(-traceLimit.value)
  }
  return displayPoints
    .map(p => {
      const x = meterToPixelX(p.x)
      const y = meterToPixelY(p.y)
      // 防止NaN或无效值
      if (isNaN(x) || isNaN(y)) return null
      return `${x},${y}`
    })
    .filter(p => p !== null) // 过滤掉无效点
    .join(' ')
}

// 修改显示切换逻辑
const toggleVisibility = (sensor) => {
  sensor.visible = !sensor.visible
  
  // 更新可见传感器集合
  if (sensor.visible) {
    visibleSensors.value.add(sensor.mac)
  } else {
    visibleSensors.value.delete(sensor.mac)
  }
}

// 切换所有传感器显示状态
const toggleAllVisible = (visible) => {
  sensorList.value.forEach(sensor => {
    sensor.visible = visible
    if (visible) {
      visibleSensors.value.add(sensor.mac)
    } else {
      visibleSensors.value.delete(sensor.mac)
    }
  })
}

// 清空所有轨迹
const clearAllTraces = () => {
  sensorList.value.forEach(sensor => {
    sensor.points = []
    sensor.lastPoint = null
  })
  ElMessage.success('已清空所有轨迹')
}

// 传感器超时处理
const SENSOR_TIMEOUT = 10000 // 10秒没有新数据则认为传感器离线
const sensorTimeouts = ref({}) // 存储每个传感器的超时定时器

const connect = () => {
  if (stompClient.value?.active) {
    console.log('WebSocket已连接，无需重复连接')
    return
  }

  stompClient.value = new Client({
    brokerURL: '/ws-path/websocket',
    reconnectDelay: 5000, // 断开后5秒重连
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    onConnect: () => {
      console.log('WebSocket连接成功')
      wsConnected.value = true
      
      // 订阅清除轨迹事件
      stompClient.value.subscribe('/topic/clearTraces', () => {
        clearAllTraces()
      })
      
      // 添加数据缓冲区和处理状态
      const dataBuffer = []
      let isProcessing = false
      
      // 订阅轨迹数据
      stompClient.value.subscribe('/topic/pathData', message => {
        try {
          const data = JSON.parse(message.body)
          receivedDataCount.value++
          
          // 添加到缓冲区
          dataBuffer.push(data)
          
          // 如果没有处理中，开始处理
          if (!isProcessing) {
            processDataBuffer()
          }
          
          // 处理数据缓冲区的函数
          async function processDataBuffer() {
            isProcessing = true
            
            while (dataBuffer.length > 0) {
              const data = dataBuffer.shift()
              
              // 验证数据有效性
              if (!data || !data.mac || typeof data.x !== 'number' || typeof data.y !== 'number') {
                console.warn('收到无效数据:', data)
                continue
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
                  sensorList.value.splice(index, 1)
                  visibleSensors.value.delete(data.mac)
                  console.log(`传感器 ${data.mac} 超时，已移除`)
                }
                delete sensorTimeouts.value[data.mac]
              }, SENSOR_TIMEOUT)
              
              // 如果是新传感器，创建并添加
              if (!sensor) {
                sensor = {
                  mac: data.mac,
                  visible: true, // 默认显示
                  showTrace: true,
                  color: getNextColor(sensorList.value.length),
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
              
              sensor.points.push(point)
              sensor.lastPoint = point
              
              // 每处理30个数据就等待一下，避免界面卡顿
              if (dataBuffer.length % 30 === 0 && dataBuffer.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 10))
              }
            }
            
            isProcessing = false
          }
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

// 添加地图列表和选择相关的数据
const mapList = ref([])
const selectedMapId = ref(null)

// 获取地图列表
const fetchMapList = async () => {
  try {
    // 先获取当前地图
    await mapStore.fetchCurrentMap()
    // 再获取地图列表
    const response = await axios.get('/api/maps')
    mapList.value = response.data
    // 设置当前选中的地图
    selectedMapId.value = mapStore.currentMap.id
  } catch (error) {
    console.error('获取地图列表失败:', error)
    ElMessage.error('获取地图列表失败')
  }
}

// 处理地图切换
const handleMapChange = async (mapId) => {
  try {
    await axios.put(`/api/maps/current/${mapId}`)
    await mapStore.fetchCurrentMap()
    ElMessage.success('切换地图成功')
  } catch (error) {
    console.error('切换地图失败:', error)
    ElMessage.error('切换地图失败')
    // 恢复之前的选择
    selectedMapId.value = mapStore.currentMapId
  }
}

// 自动连接相关的变量和函数
const autoConnect = ref(false)
const reconnectInterval = ref(null)

// 自动重连函数
const startAutoConnect = () => {
  if (!autoConnect.value) {
    autoConnect.value = true
    connect()
    
    // 设置定时检查连接状态
    reconnectInterval.value = setInterval(() => {
      if (!stompClient.value?.connected) {
        console.log('检测到连接断开，尝试重新连接...')
        connect()
      }
    }, 5000) // 5秒检查一次
  }
}

// 停止自动重连
const stopAutoConnect = () => {
  autoConnect.value = false
  if (reconnectInterval.value) {
    clearInterval(reconnectInterval.value)
    reconnectInterval.value = null
  }
  if (stompClient.value?.active) {
    stompClient.value.deactivate()
  }
  wsConnected.value = false
}

// 组件挂载
onMounted(async () => {
  await mapStore.fetchCurrentMap()
  await fetchMapList()
  updateImageSize()
  window.addEventListener('resize', updateImageSize)
  // 自动连接
  startAutoConnect()
})

// 组件卸载
onUnmounted(() => {
  stopAutoConnect()
  window.removeEventListener('resize', updateImageSize)
  // 清理所有传感器超时定时器
  Object.values(sensorTimeouts.value).forEach(timeout => {
    clearTimeout(timeout)
  })
})
</script>

<style scoped>
.monitor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.control-panel {
  padding: 0 20px;
  margin: 20px 0;
  display: flex;
}

.control-wrapper {
  border-radius: 4px;
  padding: 16px;
  background-color: #fff;
  flex: 1;
}

.main-content {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 0 20px;
  overflow: hidden;
}

.sensor-list {
  width: 320px;
  padding: 20px;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.map-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #ffffff;
  overflow: hidden;
  position: relative;
}

.coordinate-system {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.map-image {
  max-width: 95%;
  max-height: 95%;
  object-fit: contain;
  display: block;
}

.coordinate-overlay {
  position: absolute;
  pointer-events: none;
}

.image-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.color-block {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin: 0 auto;
}

.control-buttons {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.trace-control {
  display: flex;
  align-items: center;
}

.stats-bar {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

.sensor-list-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
</style>