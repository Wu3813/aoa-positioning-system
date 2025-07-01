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
              :key="map.mapId"
              :label="map.name"
              :value="map.mapId"
            />
          </el-select>
          <div class="trace-control">
            <span style="margin-right: 8px;">保留轨迹数量</span>
            <el-switch
              v-model="trackingStore.limitTraceEnabled"
            />
            <el-input-number 
              v-model="trackingStore.traceLimit" 
              :min="1"
              :max="1000"
              :disabled="!trackingStore.limitTraceEnabled"
              size="small"
              style="width: 120px; margin-left: 10px;"
            />
          </div>
          <el-button @click="trackingStore.clearAllTraces" type="danger">
            <el-icon><Delete /></el-icon>清空所有轨迹
          </el-button>
        </div>
        <!-- 添加当前活跃传感器数量显示 -->
        <div class="stats-bar">
          <el-tooltip content="WebSocket数据流状态" placement="top">
            <el-tag :type="trackingStore.wsConnected ? 'success' : 'danger'">{{ trackingStore.wsConnected ? "数据流正常" : "数据流异常" }}</el-tag>
          </el-tooltip>
          <el-tag type="success">在线标签: {{ trackingStore.sensorList.length }}</el-tag>
          <el-tag type="success">可见标签: {{ trackingStore.visibleSensors.size }}</el-tag>
          <el-tag type="warning">启用围栏: {{ trackingStore.geofenceList.length }}</el-tag>
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
            placeholder="搜索标签名称"
            prefix-icon="Search"
            clearable
            size="small"
            style="margin-bottom: 10px;"
          />
          <el-scrollbar class="sensor-scrollbar">
            <el-table 
              :data="filteredSensorList" 
              style="width: 100%" 
              size="small"
              :max-height="'100%'"
            >
              <el-table-column prop="name" label="标签名称" width="110" show-overflow-tooltip />
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
              :style="{ willChange: 'transform' }"
            >
              <!-- 围栏多边形 -->
              <template v-for="geofence in trackingStore.geofenceList" :key="geofence.id">
                <polygon 
                  :points="getGeofencePoints(geofence.points)" 
                  fill="rgba(255, 193, 7, 0.1)"
                  stroke="#FFC107" 
                  stroke-width="2"
                  stroke-dasharray="5,5"
                  opacity="0.8"
                />
                <!-- 围栏名称标签 -->
                <text 
                  v-if="geofence.points && geofence.points.length > 0"
                  :x="getGeofenceCenterX(geofence.points)"
                  :y="getGeofenceCenterY(geofence.points)"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  fill="#E65100"
                  font-size="12"
                  font-weight="bold"
                  style="pointer-events: none; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);"
                >
                  {{ geofence.name }}
                </text>
              </template>
              
              <!-- 优化渲染，使用单个g元素分组传感器轨迹 -->
              <g v-for="sensor in trackingStore.visibleSensorsList" :key="sensor.mac">
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
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMapStore } from '@/stores/map'
import { useTrackingStore } from '@/stores/tracking'
import { ref, onMounted, computed, watch, reactive, onUnmounted, nextTick } from 'vue'
import { Search, Refresh, Plus, Delete, Edit, Setting, Picture } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const mapImage = ref(null)
const imageInfo = reactive({
  width: 0,
  height: 0,
  loaded: false,
  scaleX: 1,
  scaleY: 1
})
const mapStore = useMapStore()
const trackingStore = useTrackingStore()

// 自动刷新相关
let autoRefreshInterval = null
const AUTO_REFRESH_INTERVAL = 1000 // 1秒刷新一次

// 地图选择相关
const mapList = ref([])
const selectedMapId = ref(null)

// 传感器搜索过滤
const sensorFilter = ref('')

// 筛选后的传感器列表
const filteredSensorList = computed(() => {
  if (!sensorFilter.value) return trackingStore.sensorList
  const lowerFilter = sensorFilter.value.toLowerCase()
  return trackingStore.sensorList.filter(sensor => 
    (sensor.name && sensor.name.toLowerCase().includes(lowerFilter)) ||
    sensor.mac.toLowerCase().includes(lowerFilter)
  )
})

// 前往地图管理页面
const goToMapManagement = () => {
  router.push('/home/maps')
}

// 获取地图列表
const fetchMapList = async () => {
  try {
    mapList.value = await mapStore.fetchMapList()
    
    // 尝试获取上次选择的地图ID
    const savedMapId = mapStore.getPageMapSelection('monitor')
    
    // 查找保存的地图是否在当前地图列表中（使用mapId）
    const savedMapExists = savedMapId && mapList.value.some(map => map.mapId === savedMapId)
    
    // 如果存在已保存的选择，使用它；否则使用第一张地图
    if (savedMapExists) {
      selectedMapId.value = savedMapId
    } else if (mapList.value.length > 0 && !selectedMapId.value) {
      selectedMapId.value = mapList.value[0].mapId
    }
    
    if (selectedMapId.value) {
      await handleMapChange(selectedMapId.value, true) // 标记为初始加载
    }
  } catch (error) {
    console.error('获取地图列表失败:', error)
    ElMessage.error('获取地图列表失败')
  }
}

// 处理地图切换
const handleMapChange = async (mapId, isInitialLoad = false) => {
  try {
    await mapStore.selectMap(mapId, 'monitor') // 传入页面名称参数
    
    // 调用过滤函数，确保只显示与当前地图匹配的传感器
    trackingStore.filterSensorsByMapId();
    
    // 加载当前地图的电子围栏
    await trackingStore.fetchGeofences(mapId);
    
    // 启动WebSocket连接
    if (!trackingStore.wsConnected) {
      trackingStore.connect();
    }
  } catch (error) {
    console.error('切换地图失败:', error)
    ElMessage.error('切换地图失败')
  }
}

// 获取轨迹点函数 - 高性能优化版
const getTracePoints = (points) => {
  if (!points || points.length === 0) return ''
  
  let displayPoints = points
  if (trackingStore.limitTraceEnabled) {
    displayPoints = points.slice(-trackingStore.traceLimit)
  }
  
  // 创建性能优化的字符串构建器
  const pointsArray = new Array(displayPoints.length)
  let validPointsCount = 0
  
  // 避免多次转换、批量处理
  for (let i = 0; i < displayPoints.length; i++) {
    const p = displayPoints[i]
    
    // 使用store的转换方法获取图片上的像素坐标
    const pixelX = mapStore.meterToPixelX(p.x)
    const pixelY = mapStore.meterToPixelY(p.y)
    
    // 防止NaN或无效值
    if (isNaN(pixelX) || isNaN(pixelY)) continue
    
    // 直接添加到数组中，避免字符串拼接
    pointsArray[validPointsCount++] = `${pixelX},${pixelY}`
  }
  
  // 如果没有有效点，返回空字符串
  if (validPointsCount === 0) return ''
  
  // 只在最后执行一次join操作，提高性能
  return pointsArray.slice(0, validPointsCount).join(' ')
}

// 获取围栏多边形点字符串 - 优化版
const getGeofencePoints = (() => {
  // 闭包缓存已计算的结果
  const cache = new Map()
  
  return (points) => {
    if (!points || points.length === 0) return ''
    
    // 生成缓存key
    const cacheKey = points.map(p => `${p.x},${p.y}`).join('|')
    
    // 检查缓存
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)
    }
    
    // 没有缓存，计算结果
    const result = points
      .map(p => {
        // 围栏点存储的是图片像素坐标，直接使用
        const pixelX = p.x
        const pixelY = p.y
        
        // 防止NaN或无效值
        if (isNaN(pixelX) || isNaN(pixelY)) return null
        
        return `${pixelX},${pixelY}`
      })
      .filter(p => p !== null) // 过滤掉无效点
      .join(' ')
    
    // 存入缓存
    if (cache.size > 100) { // 限制缓存大小
      // 清除第一个缓存项
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }
    cache.set(cacheKey, result)
    
    return result
  }
})()

// 使用缓存的围栏中心点计算
const geofenceCenters = new Map()

// 获取围栏中心点X坐标（用于显示围栏名称）- 优化版
const getGeofenceCenterX = (points) => {
  if (!points || points.length === 0) return 0
  
  const id = JSON.stringify(points) // 简单的缓存键
  
  if (!geofenceCenters.has(id)) {
    // 计算并缓存中心点
    const avgX = points.reduce((sum, p) => sum + (p.x || 0), 0) / points.length
    const avgY = points.reduce((sum, p) => sum + (p.y || 0), 0) / points.length
    geofenceCenters.set(id, { x: avgX, y: avgY })
  }
  
  return geofenceCenters.get(id).x
}

// 获取围栏中心点Y坐标（用于显示围栏名称）- 优化版
const getGeofenceCenterY = (points) => {
  if (!points || points.length === 0) return 0
  
  const id = JSON.stringify(points) // 简单的缓存键
  
  if (!geofenceCenters.has(id)) {
    // 计算并缓存中心点
    const avgX = points.reduce((sum, p) => sum + (p.x || 0), 0) / points.length
    const avgY = points.reduce((sum, p) => sum + (p.y || 0), 0) / points.length
    geofenceCenters.set(id, { x: avgX, y: avgY })
  }
  
  return geofenceCenters.get(id).y
}

// 修改显示切换逻辑
const toggleVisibility = (sensor) => {
  trackingStore.toggleVisibility(sensor)
}

// 切换所有传感器显示状态
const toggleAllVisible = (visible) => {
  trackingStore.toggleAllVisible(visible)
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

// 设置自动刷新
const setupAutoRefresh = () => {
  // 先清除已有的定时器
  clearAutoRefresh();
  
  // 设置新的定时器
  autoRefreshInterval = setInterval(() => {
    // 强制重新渲染组件，确保轨迹正确显示
    nextTick(() => {
      // 只有当有传感器数据且地图已加载时才需刷新
      if (trackingStore.visibleSensorsList.length > 0 && mapStore.selectedMap && imageInfo.loaded) {
        // 检查轨迹数据是否有更新
        const hasNewData = trackingStore.hasDataUpdates();
        
        // 如果有新数据，触发Vue更新
        if (hasNewData) {
          // 通知Vue更新DOM
          trackingStore.notifyUpdate();
        }
      }
    });
  }, AUTO_REFRESH_INTERVAL);
}

// 清除自动刷新
const clearAutoRefresh = () => {
  if (autoRefreshInterval !== null) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// 组件挂载
onMounted(async () => {
  await fetchMapList();
  
  window.addEventListener('resize', () => {
    // 窗口大小变化时更新缩放比例
    if (mapStore.selectedMap && imageInfo.loaded) {
      updateScaleFactor();
    }
  });
  
  // 设置自动刷新，确保轨迹实时显示
  setupAutoRefresh();
})

// 监听地图变化
watch(() => mapStore.selectedMap, () => {
  geofenceCenters.clear();
  
  // 当地图变化时，重置图片信息状态
  imageInfo.loaded = false;
  imageInfo.width = 0;
  imageInfo.height = 0;
  imageInfo.scaleX = 1;
  imageInfo.scaleY = 1;
}, { deep: true })

// 组件卸载时清除缓存和定时器
onUnmounted(() => {
  geofenceCenters.clear();
  clearAutoRefresh();
  
  // 断开WebSocket连接
  trackingStore.disconnect();
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
  height: 100%;
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

.sensor-scrollbar {
  flex: 1;
  overflow: hidden;
  height: calc(100% - 100px);
}
</style>