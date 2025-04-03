<template>
  <div class="monitor-container">
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>监控管理</h2>
        <div class="control-buttons">
          <el-button @click="connect">连接传感器</el-button>
          <div class="trace-control">
            <el-switch
              v-model="limitTraceEnabled"
              active-text="限制轨迹"
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
        </div>
      </div>
    </div>

    <div class="main-content">
      <!-- 左侧传感器列表 -->
      <div class="sensor-list">
        <h3>传感器列表</h3>
        <el-table :data="sensorList" style="width: 280px" :height="null">
          <el-table-column prop="mac" label="MAC地址" width="100" />
          <el-table-column label="颜色" width="60">
            <template #default="scope">
              <div class="color-block" :style="{ backgroundColor: scope.row.color }"></div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90">
            <template #default="scope">
              <el-button
                type="primary"
                size="small"
                :type="scope.row.visible ? 'primary' : 'info'"
                @click="toggleVisibility(scope.row)"
              >
                {{ scope.row.visible ? '隐藏' : '显示' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
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
              <template v-for="sensor in sensorList" :key="sensor.mac">
                <!-- 当前位置点 -->
                <circle
                  v-if="sensor.visible && sensor.lastPoint"
                  :cx="meterToPixelX(sensor.lastPoint.x)"
                  :cy="meterToPixelY(sensor.lastPoint.y)"
                  r="5"
                  :fill="sensor.color"
                  stroke="#fff"
                  stroke-width="2"
                />
                <!-- 轨迹线 -->
                <polyline
                  v-if="sensor.visible && sensor.points && sensor.points.length > 1"
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
import { ref, onMounted } from 'vue'
import { Client } from '@stomp/stompjs'

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

// 坐标转换函数
const mapStore = useMapStore()

// 删除原有的 COORDINATE_RANGE 常量
// 使用 store 中的值
const meterToPixelX = (x) => {
  const xRange = mapStore.coordinateRange.x.max - mapStore.coordinateRange.x.min
  const xScale = imageWidth.value / xRange
  return (x - mapStore.coordinateRange.x.min) * xScale
}

const meterToPixelY = (y) => {
  const yRange = mapStore.coordinateRange.y.max - mapStore.coordinateRange.y.min
  const yScale = imageHeight.value / yRange
  return imageHeight.value - (y - mapStore.coordinateRange.y.min) * yScale
}

// 在组件挂载时获取当前地图
onMounted(async () => {
  await mapStore.fetchCurrentMap()
  updateImageSize()
  window.addEventListener('resize', updateImageSize)
})

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

const points = ref([])

// 传感器列表数据
// 预定义的颜色列表
const COLORS = [
  '#FF4444', '#44FF44', '#4444FF', '#FFFF44', 
  '#FF44FF', '#44FFFF', '#FF8844', '#44FF88'
]

// 获取下一个可用颜色
const getNextColor = (index) => {
  return COLORS[index % COLORS.length]
}

// 修改传感器数据结构
const sensorList = ref([])
const visibleSensors = ref(new Set())

// 轨迹控制相关
const limitTraceEnabled = ref(false)
const traceLimit = ref(100)

// 修改获取轨迹点函数
const getTracePoints = (points) => {
  let displayPoints = points
  if (limitTraceEnabled.value) {
    displayPoints = points.slice(-traceLimit.value)
  }
  return displayPoints
    .map(p => `${meterToPixelX(p.x)},${meterToPixelY(p.y)}`)
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

const connect = () => {
  stompClient.value = new Client({
    brokerURL: 'ws://localhost:8080/ws-path/websocket',
    onConnect: () => {
      console.log('连接成功')
      
      stompClient.value.subscribe('/topic/pathData', message => {
        try {
          const data = JSON.parse(message.body)
          let sensor = sensorList.value.find(s => s.mac === data.mac)
          
          if (!sensor) {
            sensor = {
              mac: data.mac,
              visible: true,
              showTrace: true,
              color: getNextColor(sensorList.value.length),
              points: []
            }
            sensorList.value.push(sensor)
            visibleSensors.value.add(data.mac)
          }

          const point = {
            x: parseFloat(data.x),
            y: parseFloat(data.y),
            timestamp: data.timestamp
          }
          
          sensor.points.push(point)
          sensor.lastPoint = point
          
          lastMessage.value = message.body
        } catch (error) {
          console.error('数据解析错误:', error)
        }
      })
    },
    onStompError: (frame) => {
      console.error('连接错误:', frame)
    }
  })

  stompClient.value.activate()
}

onMounted(() => {
  updateImageSize()
  window.addEventListener('resize', updateImageSize)
})
</script>

<style scoped>
.monitor-container {
  height: 100%;  /* 改为100% */
  display: flex;
  flex-direction: column;
  padding: 0;    /* 移除内边距 */
  box-sizing: border-box;
  overflow: hidden;  /* 防止内容溢出 */
}

.control-panel {
  padding: 0 20px;  /* 修改：只保留左右内边距 */
  margin: 20px 0;   /* 新增：使用外边距控制上下间距 */
  display: flex;
}

.control-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 16px;
  background-color: #fff;
  flex: 1;
  /* 移除 margin */
}

.main-content {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 0 20px;  /* 保持左右内边距一致 */
  overflow: hidden;
}

.sensor-list {
  width: 300px;
  padding: 20px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
}

.main-content {
  flex: 1;
  display: flex;
  gap: 20px;
  overflow: hidden;
}

.sensor-list {
  width: 300px;
  padding: 20px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;  /* 修改这里，从 auto 改为 hidden */
}

.map-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #ffffff;
  overflow: hidden;
  position: relative;  /* 添加这行 */
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
  max-width: 95%;    /* 略微增加图片显示范围 */
  max-height: 95%;
  object-fit: contain;
  display: block;  /* 添加这行 */
}

.coordinate-overlay {
  position: absolute;
  top: 0;          /* 修改这里 */
  left: 0;         /* 修改这里 */
  width: 100%;     /* 添加这行 */
  height: 100%;    /* 添加这行 */
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

.map-image {
  max-width: 95%;
  max-height: 95%;
  object-fit: contain;
  width: auto;
  height: auto;
  aspect-ratio: auto;
}

.color-block {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin: 0 auto;
}

.operation-column {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* 移除表格滚动条样式 */
.el-table {
  --el-table-border-color: transparent;
  overflow-x: hidden;
}

.el-table__body-wrapper {
  overflow-x: hidden !important;
}

.control-buttons {
  display: flex;
  align-items: center;
  gap: 20px;
}

.trace-control {
  display: flex;
  align-items: center;
}
</style>