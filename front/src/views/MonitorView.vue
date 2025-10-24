<template>
  <div class="monitor-container">
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>{{ t('monitor.title') }}</h2>
        <div class="control-buttons">
          <span style="margin-right: 8px;">{{ t('monitor.selectMap') }}</span>
          <el-select 
            v-model="selectedMapId" 
            :placeholder="t('monitor.selectMapPlaceholder')" 
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
          <el-button 
            @click="toggleFullscreen"
            :title="isFullscreen ? t('monitor.exitFullscreen') : t('monitor.enterFullscreen')"
            style="margin-left: 10px;"
          >
            {{ isFullscreen ? t('monitor.exitFullscreen') : t('monitor.enterFullscreen') }}
          </el-button>
          <div class="trace-control">
            <span style="margin-right: 8px;">{{ t('monitor.traceControl') }}</span>
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
          <div class="trace-point-control">
            <span style="margin-right: 8px;">{{ t('monitor.showTracePoints') }}</span>
            <el-switch
              v-model="trackingStore.showTracePoints"
              @change="handleTracePointsToggle"
            />
          </div>
          <div class="tag-opacity-control">
            <span style="margin-right: 8px;">{{ t('monitor.tagIconOpacity') }}</span>
            <el-slider
              v-model="trackingStore.tagIconOpacity"
              :min="40"
              :max="100"
              :step="5"
              :show-tooltip="true"
              :format-tooltip="(val) => `${val}%`"
              style="width: 80px; margin-left: 10px;"
              @change="handleOpacityChange"
            />
          </div>
          <el-button @click="trackingStore.clearAllTraces" type="danger">
            <el-icon><Delete /></el-icon>{{ t('monitor.clearAllTraces') }}
          </el-button>
        </div>
        <!-- 添加当前活跃传感器数量显示 -->
        <div class="stats-bar">
          <el-tooltip :content="t('monitor.wsStatus')" placement="top">
            <el-tag :type="trackingStore.wsConnected ? 'success' : 'danger'">{{ trackingStore.wsConnected ? t('monitor.wsNormal') : t('monitor.wsAbnormal') }}</el-tag>
          </el-tooltip>
          <el-tag type="success">{{ t('monitor.onlineTags') }}: {{ trackingStore.sensorList.length }}</el-tag>
          <el-tag type="success">{{ t('monitor.visibleTags') }}: {{ trackingStore.visibleSensors.size }}</el-tag>
          <el-tag type="warning">{{ t('monitor.enabledGeofences') }}: {{ trackingStore.geofenceList.length }}</el-tag>
        </div>
      </div>
    </div>

    <div class="main-content">
      <!-- 左侧传感器列表 -->
      <el-aside class="sensor-list-container" :class="{ 'sensor-list-collapsed': isSensorListCollapsed }">
        <div class="sensor-list-wrapper">
          <div class="sensor-list-header">
            <h3 v-show="!isSensorListCollapsed">{{ t('monitor.tagList') }}</h3>
            <el-tooltip 
              :content="isSensorListCollapsed ? t('monitor.expandTagList') : t('monitor.collapseTagList')" 
              placement="top"
              ref="sensorListTooltip"
            >
              <el-button 
                @click="handleSensorListToggle"
                size="small"
                circle
                class="collapse-btn"
              >
                <el-icon :size="18">
                  <Expand v-if="isSensorListCollapsed" />
                  <Fold v-else />
                </el-icon>
              </el-button>
            </el-tooltip>
          </div>
          <div v-show="!isSensorListCollapsed" class="sensor-list-content">
            <div class="sensor-list-actions">
              <el-button size="small" @click="toggleAllVisible(true)">{{ t('monitor.showAll') }}</el-button>
              <el-button size="small" @click="toggleAllVisible(false)">{{ t('monitor.hideAll') }}</el-button>
            </div>
            <el-input
              v-model="sensorFilter"
              :placeholder="t('monitor.searchTagPlaceholder')"
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
                <el-table-column prop="name" :label="t('monitor.tagName')" width="110" show-overflow-tooltip />
                <el-table-column :label="t('monitor.color')" width="110" align="center">
                  <template #default="scope">
                    <el-color-picker
                      v-model="scope.row.color"
                      size="small"
                      @change="(color) => handleColorChange(scope.row.mac, color)"
                      :show-alpha="false"
                      class="sensor-color-picker"
                    />
                  </template>
                </el-table-column>
                <el-table-column :label="t('monitor.operation')" width="90">
                  <template #default="scope">
                    <el-button
                      size="small"
                      :type="scope.row.visible ? 'primary' : 'info'"
                      @click="toggleVisibility(scope.row)"
                    >
                      {{ scope.row.visible ? t('monitor.hide') : t('monitor.show') }}
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-scrollbar>
          </div>
        </div>
      </el-aside>

      <!-- 右侧地图区域 -->
      <div class="map-container">
        <div v-if="!mapStore.selectedMap" class="no-map-selected">
                     <el-empty :description="t('monitor.noMapSelected')">
             <el-button type="primary" @click="goToMapManagement">{{ t('monitor.goToMapManagement') }}</el-button>
          </el-empty>
        </div>
        <div v-else class="map-display" ref="fullscreenContainer">
          <div class="image-wrapper">
            <img 
              :src="mapStore.mapUrl" 
              :alt="t('monitor.monitorMap')" 
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
import { onMounted, watch, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Delete, Search, FullScreen, Close, ArrowLeft, ArrowRight, Expand, Fold } from '@element-plus/icons-vue'
import '@/assets/styles/monitor-view.css'
import { useMonitorView } from './monitorview-js/index.js'

const { t } = useI18n()

// 使用组合式函数
const {
  // refs
  mapImage,
  mapCanvas,
  imageInfo,
  mapList,
  selectedMapId,
  sensorFilter,
  
  // computed
  filteredSensorList,
  
  // stores
  mapStore,
  trackingStore,
  
  // methods
  goToMapManagement,
  handleMapChange,
  toggleVisibility,
  toggleAllVisible,
  handleColorChange,
  handleImageLoad,
  handleTracePointsToggle,
  handleOpacityChange,
  updateScaleFactor,
  
  // lifecycle
  onMountedHandler,
  watchMapChange,
  watchTrackingData,
  onUnmountedHandler
} = useMonitorView()

// 标签列表折叠状态
const isSensorListCollapsed = ref(false)
const sensorListTooltip = ref(null)

// 切换标签列表折叠状态
const toggleSensorListCollapse = () => {
  isSensorListCollapsed.value = !isSensorListCollapsed.value
  
  // 折叠状态变化后，延迟更新缩放比例和重绘
  setTimeout(() => {
    updateScaleFactor()
  }, 350) // 等待CSS动画完成(300ms)后再更新
}

// 处理标签列表切换，同时隐藏tooltip
const handleSensorListToggle = () => {
  toggleSensorListCollapse()
  // 强制隐藏tooltip
  if (sensorListTooltip.value) {
    sensorListTooltip.value.hide()
  }
}

// 全屏控制
const fullscreenContainer = ref(null)
const isFullscreen = ref(false)

const onFullscreenChange = () => {
  const fsElement = document.fullscreenElement
  isFullscreen.value = !!fsElement && (fsElement === fullscreenContainer.value)
  // 切换后更新缩放并重绘，延迟确保布局完成
  setTimeout(() => {
    updateScaleFactor()
  }, 100)
}

const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      if (fullscreenContainer.value?.requestFullscreen) {
        await fullscreenContainer.value.requestFullscreen()
      }
    } else {
      await document.exitFullscreen()
    }
  } catch (e) {
    console.error('切换全屏失败', e)
  }
}

// 组件挂载
onMounted(onMountedHandler)

// 监听全屏变化
onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

// 监听地图变化
watch(() => mapStore.selectedMap, watchMapChange, { deep: true })

// 监听轨迹数据更新
watch(() => trackingStore.forceUpdateFlag, watchTrackingData)

// 监听侧边栏状态变化，影响布局时需要更新缩放比例
const sidebarCollapsed = ref(false)

// 监听侧边栏状态变化事件
const handleSidebarToggle = (e) => {
  const newValue = e.detail.collapsed
  if (newValue !== sidebarCollapsed.value && imageInfo.loaded) {
    console.log('侧边栏状态变化，更新缩放比例')
    sidebarCollapsed.value = newValue
    // 延迟更新，等待CSS动画完成
    setTimeout(() => {
      updateScaleFactor()
    }, 350) // 等待侧边栏动画完成(300ms)后再更新
  }
}

// 组件挂载时添加侧边栏状态变化监听
onMounted(() => {
  // 初始化侧边栏状态
  const savedCollapsed = localStorage.getItem('sidebarCollapsed')
  sidebarCollapsed.value = savedCollapsed ? JSON.parse(savedCollapsed) : false
  
  // 添加自定义事件监听
  window.addEventListener('sidebarToggle', handleSidebarToggle)
})

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('sidebarToggle', handleSidebarToggle)
})

// 组件卸载时清除缓存和定时器
onUnmounted(onUnmountedHandler)

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})
</script>