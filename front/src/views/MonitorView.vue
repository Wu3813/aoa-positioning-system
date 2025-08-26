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
      <div class="sensor-list-container">
        <div class="sensor-list-wrapper">
          <h3>{{ t('monitor.tagList') }}</h3>
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

      <!-- 右侧地图区域 -->
      <div class="map-container">
        <div v-if="!mapStore.selectedMap" class="no-map-selected">
                     <el-empty :description="t('monitor.noMapSelected')">
             <el-button type="primary" @click="goToMapManagement">{{ t('monitor.goToMapManagement') }}</el-button>
          </el-empty>
        </div>
        <div v-else class="map-display">
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
import { onMounted, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Delete, Search } from '@element-plus/icons-vue'
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
  
  // lifecycle
  onMountedHandler,
  watchMapChange,
  watchTrackingData,
  onUnmountedHandler
} = useMonitorView()

// 组件挂载
onMounted(onMountedHandler)

// 监听地图变化
watch(() => mapStore.selectedMap, watchMapChange, { deep: true })

// 监听轨迹数据更新
watch(() => trackingStore.forceUpdateFlag, watchTrackingData)

// 组件卸载时清除缓存和定时器
onUnmounted(onUnmountedHandler)
</script>