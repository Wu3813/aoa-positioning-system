<template>
  <div class="history-container">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>历史轨迹回放</h2>
        <div class="control-buttons">
          <!-- 地图选择 -->
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
            <el-form-item label="选择地图">
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
            </el-form-item>
            <el-form-item label="选择标签">
              <el-select 
                v-model="searchForm.deviceId" 
                placeholder="请选择标签" 
                style="width: 200px;"
                clearable
                filterable
              >
                <el-option
                  v-for="tag in tagList"
                  :key="tag.macAddress"
                  :label="tag.name"
                  :value="tag.macAddress"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="datetimerange"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                format="YYYY-MM-DD HH:mm:ss"
                clearable
                style="width: 320px;"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch" :loading="searchLoading">
                <el-icon><Search /></el-icon> 查询
              </el-button>
              <el-button @click="handleResetSearch">
                <el-icon><Refresh /></el-icon> 重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        
        <!-- 回放控制器 - 仅在有数据时显示 -->
        <div class="playback-controls" v-if="trajectoryData.length > 0">
          <div class="playback-actions">
            <el-button-group>
              <el-button @click="startPlayback" :disabled="isPlaying" type="primary">
                <el-icon><VideoPlay /></el-icon> 播放
              </el-button>
              <el-button @click="pausePlayback" :disabled="!isPlaying" type="warning">
                <el-icon><VideoPause /></el-icon> 暂停
              </el-button>
              <el-button @click="stopPlayback" :disabled="!isPlaying && currentPlayIndex === 0" type="danger">
                <el-icon><VideoCamera /></el-icon> 停止
              </el-button>
            </el-button-group>
            
            <div class="speed-control">
              <span>回放速度：</span>
              <el-select v-model="playbackSpeed" size="small" style="width: 90px;">
                <el-option label="0.5x" :value="0.5" />
                <el-option label="1x" :value="1" />
                <el-option label="2x" :value="2" />
                <el-option label="5x" :value="5" />
                <el-option label="10x" :value="10" />
              </el-select>
            </div>
            
            <el-button @click="handleExportCSV" :loading="exportLoading" type="success" size="small">
              <el-icon><Download /></el-icon> 导出CSV
            </el-button>
          </div>
          
          <div class="progress-control">
            <span class="time-display" v-if="trajectoryData.length > 0">
              {{ formatTime(trajectoryData[currentPlayIndex]?.timestamp) }}
            </span>
            <el-slider 
              v-model="currentPlayIndex" 
              :max="trajectoryData.length - 1" 
              :step="1"
              :format-tooltip="formatSliderTooltip"
              style="flex: 1; margin: 0 20px;"
              @change="handleProgressChange"
            />
            <span class="progress-info">{{ currentPlayIndex + 1 }} / {{ trajectoryData.length }}</span>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="stats-bar" v-if="trajectoryData.length > 0">
          <el-tag type="info">轨迹点数: {{ trajectoryData.length }}</el-tag>
          <el-tag type="success" v-if="selectedTag">标签: {{ selectedTag.name }}</el-tag>
          <el-tag type="warning">
            时间跨度: {{ formatDuration(getTimeSpan()) }}
          </el-tag>
        </div>
      </div>
    </div>

    <div class="main-content">
      <!-- 左侧轨迹数据列表 -->
      <div class="trajectory-list-container">
        <div class="trajectory-list-wrapper">
          <h3>轨迹点数据</h3>
          <div v-if="trajectoryData.length === 0" class="no-data-hint">
            <el-empty description="暂无轨迹数据">
              <p>请选择标签和时间范围后查询</p>
            </el-empty>
          </div>
          <el-scrollbar v-else class="trajectory-scrollbar">
            <el-table 
              :data="trajectoryData" 
              style="width: 100%" 
              size="small"
              :max-height="'100%'"
              :row-class-name="getRowClassName"
              @row-click="handleRowClick"
              highlight-current-row
            >
              <el-table-column type="index" label="序号" width="50" />
              <el-table-column prop="timestamp" label="时间" width="125" show-overflow-tooltip>
                <template #default="scope">
                  {{ formatTime(scope.row.timestamp) }}
                </template>
              </el-table-column>
              <el-table-column prop="x" label="X坐标" width="70">
                <template #default="scope">
                  {{ formatCoordinate(scope.row.x) }}
                </template>
              </el-table-column>
              <el-table-column prop="y" label="Y坐标" width="70">
                <template #default="scope">
                  {{ formatCoordinate(scope.row.y) }}
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
              <!-- 显示全部轨迹线 -->
              <polyline
                v-if="displayTrajectory.length > 1"
                :points="getTracePoints(displayTrajectory)"
                stroke="#1890ff"
                fill="none"
                stroke-width="2"
                stroke-opacity="0.6"
              />
              
              <!-- 显示所有轨迹点 -->
              <template v-for="(point, index) in displayTrajectory" :key="index">
                <circle
                  :cx="mapStore.meterToPixelX(point.x)"
                  :cy="mapStore.meterToPixelY(point.y)"
                  :r="index === currentPlayIndex ? 8 : 3"
                  :fill="index === currentPlayIndex ? '#ff4500' : '#1890ff'"
                  :stroke="index === currentPlayIndex ? '#fff' : 'none'"
                  :stroke-width="index === currentPlayIndex ? 2 : 0"
                  :opacity="index === currentPlayIndex ? 1 : 0.7"
                />
              </template>
              
              <!-- 当前播放点标签 -->
              <text 
                v-if="currentPoint"
                :x="mapStore.meterToPixelX(currentPoint.x) + 15"
                :y="mapStore.meterToPixelY(currentPoint.y) - 15"
                fill="#ff4500"
                font-size="12"
                font-weight="bold"
                style="pointer-events: none; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);"
              >
                {{ formatTime(currentPoint.timestamp) }}
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, VideoPlay, VideoPause, VideoCamera, Download } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useMapStore } from '@/stores/map'
import axios from 'axios'

const router = useRouter()
const mapStore = useMapStore()

// 地图相关
const mapList = ref([])
const selectedMapId = ref(null)
const mapImage = ref(null)
const imageInfo = reactive({
  width: 0,
  height: 0,
  loaded: false,
  scaleX: 1,
  scaleY: 1
})

// 标签相关
const tagList = ref([])
const selectedTag = ref(null)

// 查询参数
const searchForm = reactive({
  deviceId: '',
  dateRange: []
})
const searchLoading = ref(false)
const exportLoading = ref(false)

// 轨迹数据
const trajectoryData = ref([])

// 回放控制
const isPlaying = ref(false)
const currentPlayIndex = ref(0)
const playbackSpeed = ref(1)
const playbackTimer = ref(null)

// 计算当前显示的轨迹
const displayTrajectory = computed(() => {
  if (!isPlaying.value) {
    return trajectoryData.value
  }
  return trajectoryData.value.slice(0, currentPlayIndex.value + 1)
})

// 计算当前点
const currentPoint = computed(() => {
  if (trajectoryData.value.length === 0 || currentPlayIndex.value < 0) {
    return null
  }
  return trajectoryData.value[currentPlayIndex.value]
})

// 获取地图列表
const fetchMapList = async () => {
  try {
    mapList.value = await mapStore.fetchMapList()
    
    // 尝试获取上次选择的地图ID
    const savedMapId = mapStore.getPageMapSelection('history')
    
    // 查找保存的地图是否在当前地图列表中
    const savedMapExists = savedMapId && mapList.value.some(map => map.id === savedMapId)
    
    // 如果存在已保存的选择，使用它；否则使用第一张地图
    if (savedMapExists) {
      selectedMapId.value = savedMapId
    } else if (mapList.value.length > 0 && !selectedMapId.value) {
      selectedMapId.value = mapList.value[0].id
    }
    
    if (selectedMapId.value) {
      await handleMapChange(selectedMapId.value)
    }
    
    // 获取所有标签
    await fetchTagList()
  } catch (error) {
    console.error('获取地图列表失败:', error)
    ElMessage.error('获取地图列表失败')
  }
}

// 获取标签列表
const fetchTagList = async () => {
  try {
    const response = await axios.get('/api/tags')
    const tags = Array.isArray(response.data) ? response.data : 
                 (response.data && Array.isArray(response.data.content)) ? response.data.content : []
    
    // 获取所有标签，不再根据地图ID过滤
    tagList.value = tags.filter(tag => tag.macAddress)
    console.log(`获取到标签:`, tagList.value.length, '个')
  } catch (error) {
    console.error('获取标签列表失败:', error)
    ElMessage.error('获取标签列表失败')
    tagList.value = []
  }
}

// 处理地图切换
const handleMapChange = async (mapId) => {
  try {
    await mapStore.selectMap(mapId, 'history') // 传入页面名称参数
    // 不再根据地图ID获取标签
    
    // 清空之前的数据
    trajectoryData.value = []
    searchForm.deviceId = ''
    stopPlayback()
  } catch (error) {
    console.error('切换地图失败:', error)
    ElMessage.error('切换地图失败')
  }
}

// 前往地图管理页面
const goToMapManagement = () => {
  router.push('/home/maps')
}

// 图片加载处理
const handleImageLoad = (e) => {
  const img = e.target
  if (img) {
    imageInfo.width = img.naturalWidth
    imageInfo.height = img.naturalHeight
    
    if (mapStore.selectedMap?.width && mapStore.selectedMap?.height) {
      imageInfo.width = mapStore.selectedMap.width
      imageInfo.height = mapStore.selectedMap.height
    }
    
    const displayWidth = img.clientWidth
    const displayHeight = img.clientHeight
    imageInfo.scaleX = displayWidth / imageInfo.width
    imageInfo.scaleY = displayHeight / imageInfo.height
    
    imageInfo.loaded = true
  }
}

// 查询历史轨迹数据
const handleSearch = async () => {
  if (!searchForm.deviceId) {
    ElMessage.warning('请选择要查询的标签')
    return
  }
  
  if (!searchForm.dateRange || searchForm.dateRange.length !== 2) {
    ElMessage.warning('请选择时间范围')
    return
  }
  
  searchLoading.value = true
  stopPlayback()
  
  try {
    // 格式化日期时间，确保不做时区转换，直接使用选择的日期时间
    const formatDateWithoutTimezone = (date) => {
      // 直接获取年、月、日、时、分、秒组装成ISO格式字符串，不使用toISOString()避免时区转换
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
    }
    
    const startTime = formatDateWithoutTimezone(searchForm.dateRange[0])
    const endTime = formatDateWithoutTimezone(searchForm.dateRange[1])
    
    console.log('查询参数(使用本地时间不转换):', {
      设备ID: searchForm.deviceId,
      开始时间: startTime,
      结束时间: endTime
    })
    
    const params = {
      mapId: selectedMapId.value,
      startTime: startTime,
      endTime: endTime,
      page: 0,
      size: 1000 // 获取足够多的数据点
    }
    
    const response = await axios.get(`/api/trajectory/device/${searchForm.deviceId}/history`, { params })
    const rawData = response.data || []
    
    console.log('查询结果:', rawData.length, '条数据')
    if (rawData.length > 0) {
      console.log('第一条数据时间:', rawData[0].timestamp)
      console.log('最后一条数据时间:', rawData[rawData.length - 1].timestamp)
    }
    
    // 按时间戳正序排序
    trajectoryData.value = rawData.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime()
      const timeB = new Date(b.timestamp).getTime()
      return timeA - timeB // 正序：最早的在前面
    })
    
    // 设置选中的标签信息
    selectedTag.value = tagList.value.find(tag => tag.macAddress === searchForm.deviceId)
    
    if (trajectoryData.value.length === 0) {
      ElMessage.info('未找到该时间段的轨迹数据')
    } else {
      ElMessage.success(`找到 ${trajectoryData.value.length} 个轨迹点`)
      currentPlayIndex.value = 0 // 从第一个点开始
    }
  } catch (error) {
    console.error('查询轨迹数据失败:', error)
    ElMessage.error('查询轨迹数据失败')
    trajectoryData.value = []
  } finally {
    searchLoading.value = false
  }
}

// 重置搜索
const handleResetSearch = () => {
  searchForm.deviceId = ''
  searchForm.dateRange = []
  trajectoryData.value = []
  selectedTag.value = null
  stopPlayback()
  
  // 清除保存的状态
  localStorage.removeItem('historyView_state')
  
  ElMessage.info('已重置')
}

// 开始回放
const startPlayback = () => {
  if (trajectoryData.value.length === 0) {
    ElMessage.warning('没有轨迹数据可回放')
    return
  }
  
  isPlaying.value = true
  playbackTimer.value = setInterval(() => {
    if (currentPlayIndex.value < trajectoryData.value.length - 1) {
      currentPlayIndex.value++
    } else {
      // 回放结束
      stopPlayback()
      ElMessage.success('轨迹回放完成')
    }
  }, 1000 / playbackSpeed.value) // 根据速度调整间隔
}

// 暂停回放
const pausePlayback = () => {
  isPlaying.value = false
  if (playbackTimer.value) {
    clearInterval(playbackTimer.value)
    playbackTimer.value = null
  }
}

// 停止回放
const stopPlayback = () => {
  isPlaying.value = false
  currentPlayIndex.value = 0
  if (playbackTimer.value) {
    clearInterval(playbackTimer.value)
    playbackTimer.value = null
  }
}

// 进度条变化处理
const handleProgressChange = (value) => {
  currentPlayIndex.value = value
  if (isPlaying.value) {
    // 如果正在播放，重新开始定时器
    pausePlayback()
    startPlayback()
  }
}

// 表格行点击
const handleRowClick = (row, column, event) => {
  const index = trajectoryData.value.findIndex(item => item === row)
  if (index !== -1) {
    currentPlayIndex.value = index
  }
}

// 表格行样式
const getRowClassName = ({ row, rowIndex }) => {
  return rowIndex === currentPlayIndex.value ? 'current-row' : ''
}

// 时间格式化
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 坐标格式化，保留两位小数
const formatCoordinate = (value) => {
  if (value === null || value === undefined) return ''
  return Number(value).toFixed(2)
}

// 格式化进度条提示
const formatSliderTooltip = (val) => {
  if (trajectoryData.value[val]) {
    return formatTime(trajectoryData.value[val].timestamp)
  }
  return val
}

// 获取轨迹点字符串
const getTracePoints = (points) => {
  if (!points || points.length === 0) return ''
  
  return points
    .map(p => {
      const pixelX = mapStore.meterToPixelX(p.x)
      const pixelY = mapStore.meterToPixelY(p.y)
      
      if (isNaN(pixelX) || isNaN(pixelY)) return null
      
      return `${pixelX},${pixelY}`
    })
    .filter(p => p !== null)
    .join(' ')
}

// 获取时间跨度
const getTimeSpan = () => {
  if (trajectoryData.value.length < 2) return 0
  const start = new Date(trajectoryData.value[0].timestamp)
  const end = new Date(trajectoryData.value[trajectoryData.value.length - 1].timestamp)
  return end.getTime() - start.getTime()
}

// 格式化持续时间
const formatDuration = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`
  } else {
    return `${seconds}秒`
  }
}

// 导出CSV
const handleExportCSV = () => {
  if (trajectoryData.value.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }
  
  exportLoading.value = true
  
  try {
    // 构建CSV数据
    const headers = ['序号', '时间', 'X坐标', 'Y坐标']
    const csvContent = [
      headers.join(','),
      ...trajectoryData.value.map((item, index) => [
        index + 1,
        formatTime(item.timestamp),
        formatCoordinate(item.x),
        formatCoordinate(item.y)
      ].join(','))
    ].join('\n')
    
    // 创建下载链接
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `轨迹数据_${selectedTag.value?.name || searchForm.deviceId}_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('数据导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

// 监听回放速度变化
watch(playbackSpeed, () => {
  if (isPlaying.value) {
    pausePlayback()
    startPlayback()
  }
})

// 监听地图变化
watch(() => mapStore.selectedMap, () => {
  imageInfo.loaded = false
  imageInfo.width = 0
  imageInfo.height = 0
  imageInfo.scaleX = 1
  imageInfo.scaleY = 1
}, { deep: true })

// 保存状态到localStorage
const saveState = () => {
  if (!searchForm.deviceId && !searchForm.dateRange?.length) return;
  
  try {
    const stateToSave = {
      selectedMapId: selectedMapId.value,
      deviceId: searchForm.deviceId,
      dateRange: searchForm.dateRange ? [
        searchForm.dateRange[0]?.getTime(),
        searchForm.dateRange[1]?.getTime()
      ] : null,
      currentPlayIndex: currentPlayIndex.value,
      playbackSpeed: playbackSpeed.value
    };
    localStorage.setItem('historyView_state', JSON.stringify(stateToSave));
  } catch (error) {
    console.error('保存状态失败:', error);
  }
};

// 从localStorage恢复状态
const restoreState = async () => {
  try {
    const savedState = localStorage.getItem('historyView_state');
    if (!savedState) return;
    
    const state = JSON.parse(savedState);
    
    // 恢复地图选择
    if (state.selectedMapId) {
      selectedMapId.value = state.selectedMapId;
      await handleMapChange(selectedMapId.value);
    }
    
    // 恢复时间范围
    if (state.dateRange && state.dateRange.length === 2) {
      searchForm.dateRange = [
        new Date(state.dateRange[0]),
        new Date(state.dateRange[1])
      ];
    }
    
    // 恢复设备选择
    if (state.deviceId) {
      searchForm.deviceId = state.deviceId;
    }
    
    // 恢复播放速度
    if (state.playbackSpeed) {
      playbackSpeed.value = state.playbackSpeed;
    }
    
    // 如果有足够信息，自动执行查询
    if (searchForm.deviceId && searchForm.dateRange?.length === 2) {
      await handleSearch();
      
      // 恢复播放位置
      if (state.currentPlayIndex && trajectoryData.value.length > 0) {
        currentPlayIndex.value = Math.min(state.currentPlayIndex, trajectoryData.value.length - 1);
      }
    }
  } catch (error) {
    console.error('恢复状态失败:', error);
  }
};

// 监听表单变化，保存状态
watch(() => [searchForm.deviceId, searchForm.dateRange, selectedMapId.value], () => {
  saveState();
}, { deep: true });

// 监听回放状态变化
watch(() => [currentPlayIndex.value, playbackSpeed.value], () => {
  // 只有在有轨迹数据时才保存这些状态
  if (trajectoryData.value.length > 0) {
    saveState();
  }
}, { deep: true });

// 组件挂载
onMounted(async () => {
  await fetchMapList()
  await restoreState()
})

// 组件卸载
onUnmounted(() => {
  stopPlayback()
})
</script>

<style scoped>
.history-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.control-panel {
  padding: 0 20px;
  margin: 15px 0;
  display: flex;
  flex-shrink: 0;
}

.control-wrapper {
  border-radius: 4px;
  padding: 16px;
  background-color: #fff;
  flex: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.control-buttons {
  margin-top: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.main-content {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 0 20px;
  overflow: hidden;
  margin-bottom: 20px;
}

.trajectory-list-container {
  width: 350px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.trajectory-list-wrapper {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.trajectory-scrollbar {
  flex: 1;
  overflow: hidden;
  height: calc(100% - 40px);
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

/* 回放控制 */
.playback-controls {
  margin-top: 15px;
  border-top: 1px solid #f0f0f0;
  padding-top: 15px;
}

.playback-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 10px;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-control {
  margin-top: 15px;
  display: flex;
  align-items: center;
}

.time-display {
  min-width: 110px;
  color: #666;
  font-size: 14px;
}

.progress-info {
  min-width: 60px;
  text-align: right;
  color: #666;
  font-size: 14px;
}

/* 统计栏 */
.stats-bar {
  margin-top: 15px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  border-top: 1px solid #f0f0f0;
  padding-top: 15px;
}

/* 表格相关 */
:deep(.el-table .current-row) {
  background-color: #ecf5ff !important;
}

:deep(.el-table .current-row:hover) {
  background-color: #ecf5ff !important;
}

:deep(.el-table tbody tr:hover) {
  background-color: #f5f7fa;
  cursor: pointer;
}

.no-data-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.no-data-hint p {
  color: #909399;
  font-size: 14px;
  margin-top: 10px;
}
</style> 