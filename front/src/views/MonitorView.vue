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
            <!-- 替换SVG为Canvas，并将尺寸设置为显示尺寸 -->
            <canvas 
              v-if="imageInfo.loaded"
              ref="mapCanvas"
              class="coordinate-overlay" 
              :width="imageInfo.displayWidth"
              :height="imageInfo.displayHeight"
              :style="{
                position: 'absolute',
                top: `${imageInfo.domInfo.offsetY}px`,
                left: `${imageInfo.domInfo.offsetX}px`,
                width: `${imageInfo.displayWidth}px`,
                height: `${imageInfo.displayHeight}px`,
                pointerEvents: 'none'
              }"
            ></canvas>
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
const mapCanvas = ref(null)
const imageInfo = reactive({
  width: 0,
  height: 0,
  loaded: false,
  scaleX: 1,
  scaleY: 1,
  displayWidth: 0,
  displayHeight: 0,
  domInfo: {
    offsetX: 0,
    offsetY: 0,
    displayWidth: 0,
    displayHeight: 0
  }
})
const mapStore = useMapStore()
const trackingStore = useTrackingStore()

// 自动刷新相关
let autoRefreshInterval = null
let renderRequestId = null
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

// 坐标转换函数 - 将原始像素坐标转换为显示尺寸坐标
const convertToDisplayX = (x) => {
  return x * imageInfo.scaleX;
}

const convertToDisplayY = (y) => {
  return y * imageInfo.scaleY;
}

// 修改: 使用Canvas绘制轨迹点函数
const renderCanvas = () => {
  if (!mapCanvas.value || !imageInfo.loaded) return
  
  const canvas = mapCanvas.value
  const ctx = canvas.getContext('2d')
  
  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 绘制围栏
  renderGeofences(ctx)
  
  // 绘制传感器轨迹和当前位置点
  trackingStore.visibleSensorsList.forEach(sensor => {
    if (!sensor.points || sensor.points.length === 0) return
    
    // 确定要显示的点
    let displayPoints = sensor.points
    if (trackingStore.limitTraceEnabled) {
      displayPoints = displayPoints.slice(-trackingStore.traceLimit)
    }
    
    // 绘制轨迹线
    if (displayPoints.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = sensor.color
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.6
      
      // 确保第一个点是有效的
      let validPoints = displayPoints.filter(p => {
        const x = mapStore.meterToPixelX(p.x)
        const y = mapStore.meterToPixelY(p.y)
        return !isNaN(x) && !isNaN(y)
      })
      
      if (validPoints.length > 0) {
        const firstPoint = validPoints[0]
        // 转换到显示坐标
        const x = convertToDisplayX(mapStore.meterToPixelX(firstPoint.x))
        const y = convertToDisplayY(mapStore.meterToPixelY(firstPoint.y))
        ctx.moveTo(x, y)
        
        // 绘制后续点
        for (let i = 1; i < validPoints.length; i++) {
          const p = validPoints[i]
          // 转换到显示坐标
          const x = convertToDisplayX(mapStore.meterToPixelX(p.x))
          const y = convertToDisplayY(mapStore.meterToPixelY(p.y))
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1.0
    }
    
    // 绘制当前位置点
    if (sensor.lastPoint) {
      // 转换到显示坐标
      const x = convertToDisplayX(mapStore.meterToPixelX(sensor.lastPoint.x))
      const y = convertToDisplayY(mapStore.meterToPixelY(sensor.lastPoint.y))
      
      if (!isNaN(x) && !isNaN(y)) {
        // 绘制外圈阴影
        ctx.beginPath()
        ctx.shadowBlur = 3
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.fillStyle = sensor.color
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.shadowBlur = 0
      }
    }
  })
}

// 新增：绘制围栏函数
const renderGeofences = (ctx) => {
  // 绘制所有围栏
  trackingStore.geofenceList.forEach(geofence => {
    if (!geofence.points || geofence.points.length < 3) return
    
    // 绘制围栏多边形
    ctx.beginPath()
    ctx.fillStyle = 'rgba(255, 193, 7, 0.1)'
    ctx.strokeStyle = '#FFC107'
    ctx.lineWidth = 2
    
    // 使用虚线绘制
    ctx.setLineDash([5, 5])
    
    const firstPoint = geofence.points[0]
    // 转换到显示坐标
    ctx.moveTo(convertToDisplayX(firstPoint.x), convertToDisplayY(firstPoint.y))
    
    for (let i = 1; i < geofence.points.length; i++) {
      const point = geofence.points[i]
      // 转换到显示坐标
      ctx.lineTo(convertToDisplayX(point.x), convertToDisplayY(point.y))
    }
    
    // 闭合路径
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    
    // 重置线型为实线
    ctx.setLineDash([])
    
    // 绘制围栏名称
    const centerX = convertToDisplayX(getGeofenceCenterX(geofence.points))
    const centerY = convertToDisplayY(getGeofenceCenterY(geofence.points))
    
    ctx.font = 'bold 12px Arial'
    ctx.fillStyle = '#E65100'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // 添加文字阴影效果
    ctx.shadowColor = 'rgba(255,255,255,0.8)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1
    
    ctx.fillText(geofence.name, centerX, centerY)
    
    // 重置阴影
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  })
}

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
  // 切换显示状态后重新渲染Canvas
  renderCanvas()
}

// 切换所有传感器显示状态
const toggleAllVisible = (visible) => {
  trackingStore.toggleAllVisible(visible)
  // 切换显示状态后重新渲染Canvas
  renderCanvas()
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
    
    // 等待图片完全加载并布局完成
    nextTick(() => {
      // 获取图片的实际显示尺寸和位置信息
      const imgRect = img.getBoundingClientRect();
      const containerRect = img.parentElement.getBoundingClientRect();
      
      // 存储图片在容器中的偏移量和显示尺寸
      imageInfo.domInfo = {
        offsetX: imgRect.left - containerRect.left,
        offsetY: imgRect.top - containerRect.top,
        displayWidth: imgRect.width,
        displayHeight: imgRect.height
      };
      
      // 更新显示尺寸和缩放比例
      imageInfo.displayWidth = imgRect.width;
      imageInfo.displayHeight = imgRect.height;
      imageInfo.scaleX = imageInfo.displayWidth / imageInfo.width;
      imageInfo.scaleY = imageInfo.displayHeight / imageInfo.height;
      
      console.log("地图图片加载完成，尺寸：", imageInfo.width, "x", imageInfo.height, 
                "显示尺寸:", imageInfo.displayWidth, "x", imageInfo.displayHeight, 
                "偏移位置:", imageInfo.domInfo.offsetX, "x", imageInfo.domInfo.offsetY,
                "缩放比例:", imageInfo.scaleX, imageInfo.scaleY);
      
      imageInfo.loaded = true;
      
      // 确保地图和坐标系计算正确初始化
      if (mapStore.selectedMap) {
        console.log("地图设置：", {
          原点: { x: mapStore.selectedMap.originX, y: mapStore.selectedMap.originY },
          比例尺: mapStore.pixelsPerMeter,
          尺寸: { width: imageInfo.width, height: imageInfo.height }
        });
      }
      
      // 图片加载完成后，初始化Canvas并首次渲染
      if (mapCanvas.value) {
        renderCanvas();
      }
    });
  }
}

// 添加更新缩放比例的函数
const updateScaleFactor = () => {
  if (mapImage.value && imageInfo.width && imageInfo.height) {
    const img = mapImage.value;
    
    // 获取最新的图片位置和尺寸信息
    const imgRect = img.getBoundingClientRect();
    const containerRect = img.parentElement.getBoundingClientRect();
    
    // 更新偏移量和显示尺寸
    imageInfo.domInfo = {
      offsetX: imgRect.left - containerRect.left,
      offsetY: imgRect.top - containerRect.top,
      displayWidth: imgRect.width,
      displayHeight: imgRect.height
    };
    
    // 更新显示尺寸和比例
    imageInfo.displayWidth = imgRect.width;
    imageInfo.displayHeight = imgRect.height;
    imageInfo.scaleX = imageInfo.displayWidth / imageInfo.width;
    imageInfo.scaleY = imageInfo.displayHeight / imageInfo.height;
    
    console.log("更新缩放因子:", imageInfo.scaleX, imageInfo.scaleY);
    console.log("更新显示尺寸:", imageInfo.displayWidth, "x", imageInfo.displayHeight);
    console.log("更新图片位置:", imageInfo.domInfo.offsetX, ",", imageInfo.domInfo.offsetY);
    
    // 缩放比例更新后重新渲染Canvas
    renderCanvas();
  }
}

// 修改：Canvas渲染动画帧
const renderFrame = () => {
  renderCanvas();
  renderRequestId = requestAnimationFrame(renderFrame);
}

// 设置自动刷新
const setupAutoRefresh = () => {
  // 先清除已有的定时器
  clearAutoRefresh();
  
  // 使用requestAnimationFrame进行Canvas渲染
  renderRequestId = requestAnimationFrame(renderFrame);
  
  // 设置新的定时器用于数据检查
  autoRefreshInterval = setInterval(() => {
    // 只有当有传感器数据且地图已加载时才需处理
    if (trackingStore.visibleSensorsList.length > 0 && mapStore.selectedMap && imageInfo.loaded) {
      // 检查轨迹数据是否有更新
      const hasNewData = trackingStore.hasDataUpdates();
      
      // 如果有新数据，触发Vue更新
      if (hasNewData) {
        // 通知Vue更新DOM
        trackingStore.notifyUpdate();
      }
    }
  }, AUTO_REFRESH_INTERVAL);
}

// 清除自动刷新
const clearAutoRefresh = () => {
  if (autoRefreshInterval !== null) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
  
  // 取消requestAnimationFrame
  if (renderRequestId !== null) {
    cancelAnimationFrame(renderRequestId);
    renderRequestId = null;
  }
}

// 组件挂载
onMounted(async () => {
  await fetchMapList();
  
  window.addEventListener('resize', () => {
    // 窗口大小变化时更新缩放比例
    if (mapStore.selectedMap && imageInfo.loaded) {
      // 清除坐标转换缓存
      trackingStore.coordinateCache?.clear();
      
      // 延迟更新缩放比例，确保DOM已经完成重排
      setTimeout(() => {
        updateScaleFactor();
      }, 100);
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
  imageInfo.displayWidth = 0;
  imageInfo.displayHeight = 0;
  imageInfo.domInfo = {
    offsetX: 0,
    offsetY: 0,
    displayWidth: 0,
    displayHeight: 0
  };
}, { deep: true })

// 监听轨迹数据更新
watch(() => trackingStore.forceUpdateFlag, () => {
  // 轨迹数据更新时，触发Canvas重绘
  if (imageInfo.loaded && mapCanvas.value) {
    renderCanvas();
  }
})

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