<template>
  <div class="monitor-container">
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>实时轨迹</h2>
        <div class="control-buttons">
          <span style="margin-right: 8px;">选择地图：</span>
          <el-select 
            v-model="selectedMapId" 
            placeholder="请选择地图" 
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
          <el-tooltip content="WebSocket数据流状态" placement="top">
            <el-tag :type="wsConnected ? 'success' : 'danger'">{{ wsConnected ? "数据流正常" : "数据流异常" }}</el-tag>
          </el-tooltip>
          <el-tag type="success">在线标签: {{ sensorList.length }}</el-tag>
          <el-tag type="success">可见标签: {{ visibleSensors.size }}</el-tag>
        </div>
      </div>
    </div>

    <div class="main-content">
      <!-- 左侧传感器列表 -->
      <div class="sensor-list-container">
        <div class="sensor-list-wrapper">
          <h3>标签列表</h3>
          <div class="sensor-list-actions">
            <el-button size="small" @click="toggleAllVisible(true)">全部显示</el-button>
            <el-button size="small" @click="toggleAllVisible(false)">全部隐藏</el-button>
          </div>
          <el-input
            v-model="sensorFilter"
            placeholder="搜索标签"
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
              <el-table-column prop="mac" label="标签名称" width="110" show-overflow-tooltip />
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
      </div>

      <!-- 右侧地图区域 -->
      <div class="map-container">
        <div v-if="!mapStore.selectedMap" class="no-map-selected">
          <el-empty description="请选择一张地图">
            <el-button type="primary" @click="goToMapManagement">前往地图管理</el-button>
          </el-empty>
        </div>
        <div v-else class="map-display">
          <div class="image-wrapper">
            <img 
              :src="mapStore.mapUrl" 
              alt="监控地图" 
              class="map-image" 
              ref="mapImage"
              @load="handleImageLoad"
            />
            <svg 
              v-if="imageInfo.loaded"
              class="coordinate-overlay" 
              :width="imageInfo.width * imageInfo.scaleX"
              :height="imageInfo.height * imageInfo.scaleY"
              :viewBox="`0 0 ${imageInfo.width} ${imageInfo.height}`"
            >
              <template v-for="sensor in visibleSensorsList" :key="sensor.mac">
                <!-- 当前位置点 -->
                <circle
                  v-if="sensor.lastPoint"
                  :cx="mapStore.meterToPixelX(sensor.lastPoint.x)"
                  :cy="mapStore.meterToPixelY(sensor.lastPoint.y)"
                  r="5"
                  :fill="sensor.color"
                  stroke="#fff"
                  stroke-width="2"
                  style="filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.5));"
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
import { ref, onMounted, onUnmounted, computed, watch, reactive } from 'vue'
import { Client } from '@stomp/stompjs'
import { Search, Refresh, Plus, Delete, Edit, Setting, Picture } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const stompClient = ref(null)
const mapImage = ref(null)
const imageInfo = reactive({
  width: 0,
  height: 0,
  loaded: false,
  scaleX: 1,
  scaleY: 1
})
const wsConnected = ref(false)
const receivedDataCount = ref(0)
const mapStore = useMapStore()

// 地图选择相关
const mapList = ref([])
const selectedMapId = ref(null)

// 前往地图管理页面
const goToMapManagement = () => {
  router.push('/home/maps')
}

// 获取地图列表
const fetchMapList = async () => {
  try {
    mapList.value = await mapStore.fetchMapList()
    if (mapList.value.length > 0 && !selectedMapId.value) {
      selectedMapId.value = mapList.value[0].id
      await handleMapChange(selectedMapId.value)
    }
  } catch (error) {
    console.error('获取地图列表失败:', error)
    ElMessage.error('获取地图列表失败')
  }
}

// 处理地图切换
const handleMapChange = async (mapId) => {
  try {
    await mapStore.selectMap(mapId)
    // 清除所有轨迹，因为坐标系统可能已经改变
    clearAllTraces()
  } catch (error) {
    console.error('切换地图失败:', error)
    ElMessage.error('切换地图失败')
  }
}

// 传感器数据
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

// 生成500种颜色
const COLORS = generateColors(550) // 生成550种颜色以确保有足够的备用

// 修改颜色生成和分配方式
const sensorColors = ref({}) // 存储MAC地址和颜色的映射关系

// 获取传感器颜色，确保同一MAC地址始终使用相同颜色
const getSensorColor = (mac) => {
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
const initSensorColors = () => {
  try {
    const storedColors = JSON.parse(localStorage.getItem('sensorColors') || '{}')
    sensorColors.value = storedColors
  } catch (e) {
    console.error('无法从localStorage加载传感器颜色:', e)
    sensorColors.value = {}
  }
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
  if (!points || points.length === 0) return ''
  
  let displayPoints = points
  if (limitTraceEnabled.value) {
    displayPoints = points.slice(-traceLimit.value)
  }
  
  // 调试输出第一个和最后一个点的坐标
  if (displayPoints.length > 0) {
    const firstPoint = displayPoints[0]
    const lastPoint = displayPoints[displayPoints.length - 1]
    const firstPixel = {
      x: mapStore.meterToPixelX(firstPoint.x),
      y: mapStore.meterToPixelY(firstPoint.y)
    }
    const lastPixel = {
      x: mapStore.meterToPixelX(lastPoint.x),
      y: mapStore.meterToPixelY(lastPoint.y)
    }
    
    // 只在轨迹点变化时输出日志，避免频繁打印
    console.debug('轨迹点转换:', {
      first: { meter: firstPoint, pixel: firstPixel },
      last: { meter: lastPoint, pixel: lastPixel },
      imageSize: { width: imageInfo.width, height: imageInfo.height },
      mapOrigin: { x: mapStore.selectedMap?.originX, y: mapStore.selectedMap?.originY },
      scale: mapStore.pixelsPerMeter,
      domInfo: imageInfo.domInfo
    })
  }
  
  return displayPoints
    .map(p => {
      // 使用store的转换方法获取图片上的像素坐标
      const pixelX = mapStore.meterToPixelX(p.x)
      const pixelY = mapStore.meterToPixelY(p.y)
      
      // 防止NaN或无效值
      if (isNaN(pixelX) || isNaN(pixelY)) return null
      
      return `${pixelX},${pixelY}`
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
                  color: getSensorColor(data.mac), // 使用固定颜色分配函数
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

// 图片加载事件处理函数
const handleImageLoad = (e) => {
  const img = e.target
  if (img) {
    // 获取图片的真实尺寸（而不是显示尺寸）
    imageInfo.width = img.naturalWidth
    imageInfo.height = img.naturalHeight
    
    // 如果地图数据有尺寸信息，使用地图数据中的尺寸
    if (mapStore.selectedMap?.width && mapStore.selectedMap?.height) {
      imageInfo.width = mapStore.selectedMap.width
      imageInfo.height = mapStore.selectedMap.height
    }
    
    // 计算图片的显示尺寸与实际尺寸的比例
    const displayWidth = img.clientWidth
    const displayHeight = img.clientHeight
    imageInfo.scaleX = displayWidth / imageInfo.width
    imageInfo.scaleY = displayHeight / imageInfo.height
    
    console.log("地图图片加载完成，尺寸：", imageInfo.width, "x", imageInfo.height, "缩放比例:", imageInfo.scaleX, imageInfo.scaleY)
    imageInfo.loaded = true
    
    // 确保地图和坐标系计算正确初始化
    if (mapStore.selectedMap) {
      console.log("地图设置：", {
        原点: { x: mapStore.selectedMap.originX, y: mapStore.selectedMap.originY },
        比例尺: mapStore.pixelsPerMeter,
        尺寸: { width: imageInfo.width, height: imageInfo.height }
      })
    }
    
    // 添加DOM位置信息，用于精确坐标计算
    const imgRect = img.getBoundingClientRect();
    const containerRect = img.parentElement.getBoundingClientRect();
    imageInfo.domInfo = {
      offsetX: imgRect.left - containerRect.left,
      offsetY: imgRect.top - containerRect.top,
      displayWidth: imgRect.width,
      displayHeight: imgRect.height
    };
    
    console.log("图片DOM位置信息:", imageInfo.domInfo);
  }
}

// 添加更新缩放比例的函数
const updateScaleFactor = () => {
  if (mapImage.value && imageInfo.width && imageInfo.height) {
    const img = mapImage.value;
    
    // 更新显示比例
    imageInfo.scaleX = img.clientWidth / imageInfo.width;
    imageInfo.scaleY = img.clientHeight / imageInfo.height;
    
    // 更新DOM位置信息
    const imgRect = img.getBoundingClientRect();
    const containerRect = img.parentElement.getBoundingClientRect();
    imageInfo.domInfo = {
      offsetX: imgRect.left - containerRect.left,
      offsetY: imgRect.top - containerRect.top,
      displayWidth: imgRect.width,
      displayHeight: imgRect.height
    };
    
    console.log("更新缩放因子:", imageInfo.scaleX, imageInfo.scaleY);
    console.log("更新DOM位置信息:", imageInfo.domInfo);
  }
}

// 组件挂载
onMounted(async () => {
  // 初始化传感器颜色映射
  initSensorColors()
  
  await fetchMapList()
  window.addEventListener('resize', () => {
    // 窗口大小变化时更新缩放比例
    if (mapStore.selectedMap && imageInfo.loaded) {
      updateScaleFactor();
    }
  })
  // 自动连接
  startAutoConnect()
})

// 组件卸载
onUnmounted(() => {
  stopAutoConnect()
  // 清理所有传感器超时定时器
  Object.values(sensorTimeouts.value).forEach(timeout => {
    clearTimeout(timeout)
  })
})

// 监听地图变化
watch(() => mapStore.selectedMap, () => {
  // 当地图变化时，重置图片信息状态
  imageInfo.loaded = false;
  imageInfo.width = 0;
  imageInfo.height = 0;
  imageInfo.scaleX = 1;
  imageInfo.scaleY = 1;
}, { deep: true })
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
  margin: 15px 0;
  display: flex;
}

.control-wrapper {
  border-radius: 4px;
  padding: 16px;
  background-color: #fff;
  flex: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.main-content {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 0 20px;
  overflow: hidden;
  margin-bottom: 30px;
}

.sensor-list-container {
  width: 320px;
  display: flex;
  flex-direction: column;
}

.sensor-list-wrapper {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.map-container {
  flex: 1;
  background: #ffffff;
  overflow: hidden;
  position: relative;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
}

.map-display {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.no-map-selected {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.map-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.coordinate-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
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