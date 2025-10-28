<template>
  <div class="history-container">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>{{ $t('history.title') }}</h2>
        <div class="control-buttons">
          <!-- 地图选择 -->
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
            <el-form-item :label="$t('history.selectMap')">
              <el-select 
                v-model="selectedMapId" 
                :placeholder="$t('history.selectMapPlaceholder')" 
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
            </el-form-item>
            <el-form-item :label="$t('history.selectTag')">
              <el-select 
                v-model="searchForm.deviceId" 
                :placeholder="$t('history.selectTagPlaceholder')" 
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
            <el-form-item :label="$t('history.timeRange')">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="datetimerange"
                :range-separator="$t('common.to')"
                :start-placeholder="$t('history.startTime')"
                :end-placeholder="$t('history.endTime')"
                format="YYYY-MM-DD HH:mm:ss"
                clearable
                style="width: 360px;"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch" :loading="searchLoading">
                <el-icon><Search /></el-icon> {{ $t('history.search') }}
              </el-button>
              <el-button @click="handleResetSearch">
                <el-icon><Refresh /></el-icon> {{ $t('history.reset') }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        
        <!-- 回放控制器 - 仅在有数据时显示 -->
        <div class="playback-controls" v-if="trajectoryData.length > 0">
          <div class="playback-actions">
            <el-button-group>
              <el-button @click="startPlayback" :disabled="isPlaying" type="primary">
                <el-icon><VideoPlay /></el-icon> {{ $t('history.play') }}
              </el-button>
              <el-button @click="pausePlayback" :disabled="!isPlaying" type="warning">
                <el-icon><VideoPause /></el-icon> {{ $t('history.pause') }}
              </el-button>
              <el-button @click="stopPlayback" :disabled="!isPlaying && currentPlayIndex === 0" type="danger">
                <el-icon><VideoCamera /></el-icon> {{ $t('history.stop') }}
              </el-button>
            </el-button-group>
            
            <div class="speed-control">
              <span>{{ $t('history.playbackSpeed') }}: </span>
              <el-select v-model="playbackSpeed" size="small" style="width: 90px;">
                <el-option label="0.5x" :value="0.5" />
                <el-option label="1x" :value="1" />
                <el-option label="2x" :value="2" />
                <el-option label="5x" :value="5" />
                <el-option label="10x" :value="10" />
              </el-select>
            </div>
            
            <el-button @click="handleExportCSV" :loading="exportLoading" type="success" size="small">
              <el-icon><Download /></el-icon> {{ $t('history.exportCSV') }}
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


      </div>
    </div>

    <div class="main-content">
      <!-- 左侧轨迹数据列表 -->
      <div class="trajectory-list-container">
        <div class="trajectory-list-wrapper">
          <h3>{{ $t('history.trajectoryList') }}</h3>
          <div v-if="trajectoryData.length === 0" class="no-data-hint">
            <el-empty :description="$t('history.noDataHint')">
              <p>{{ $t('history.noDataDescription') }}</p>
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
              <el-table-column type="index" :label="$t('history.serialNumber')" width="50" />
              <el-table-column prop="timestamp" :label="$t('history.time')" width="125" show-overflow-tooltip>
                <template #default="scope">
                  {{ formatTime(scope.row.timestamp) }}
                </template>
              </el-table-column>
              <el-table-column prop="x" :label="$t('history.xCoordinate')" width="70">
                <template #default="scope">
                  {{ formatCoordinate(scope.row.x) }}
                </template>
              </el-table-column>
              <el-table-column prop="y" :label="$t('history.yCoordinate')" width="70">
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
          <el-empty :description="$t('history.noMapSelected')">
            <el-button type="primary" @click="goToMapManagement">{{ $t('history.goToMapManagement') }}</el-button>
          </el-empty>
        </div>
        <div v-else class="map-display">
          <div class="image-wrapper">
            <img 
              :src="mapStore.mapUrl" 
              :alt="$t('history.monitorMap')" 
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

<script>
export default {
  name: 'HistoryView'
}
</script>

<script setup>
import { onMounted, onActivated, onUnmounted } from 'vue'
import { Search, Refresh, VideoPlay, VideoPause, VideoCamera, Download } from '@element-plus/icons-vue'
import '@/assets/styles/history-view.css'
import { useHistoryView } from './historyview-js/index.js'

// 使用历史视图的组合式函数
const {
  // 响应式数据
  mapList,
  selectedMapId,
  mapImage,
  imageInfo,
  tagList,
  selectedTag,
  searchForm,
  searchLoading,
  exportLoading,
  trajectoryData,
  isPlaying,
  currentPlayIndex,
  playbackSpeed,
  displayTrajectory,
  currentPoint,

  // 地图相关
  mapStore,
  
  // 方法
  fetchMapList,
  fetchTagList,
  handleMapChange,
  goToMapManagement,
  handleImageLoad,
  handleSearch,
  handleResetSearch,
  startPlayback,
  pausePlayback,
  stopPlayback,
  handleProgressChange,
  handleRowClick,
  getRowClassName,
  formatTime,
  formatCoordinate,
  formatSliderTooltip,
  getTracePoints,
  getTimeSpan,
  formatDuration,
  handleExportCSV,
  saveState,
  restoreState,
  
  // lifecycle
  onMountedHandler,
  onActivatedHandler
} = useHistoryView()

// 组件挂载
onMounted(async () => {
  await onMountedHandler()
})

// 组件激活（从其他页面切换回来时）
onActivated(() => {
  onActivatedHandler()
})

// 组件卸载
onUnmounted(() => {
  stopPlayback()
})
</script> 