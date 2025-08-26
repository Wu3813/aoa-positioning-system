<template>
  <div class="geofence-view-container">
    <!-- 1. 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>{{ $t('geofence.title') }}</h2>
        <!-- 搜索/过滤栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch" label-width="100px">
            <el-form-item :label="$t('geofence.searchName')">
              <el-input v-model="searchForm.name" :placeholder="$t('geofence.searchNamePlaceholder')" clearable class="search-name-input" />
            </el-form-item>
            <el-form-item :label="$t('geofence.searchMap')">
              <el-select v-model="searchForm.mapId" :placeholder="$t('geofence.searchMapPlaceholder')" clearable class="search-map-select">
                <el-option 
                  v-for="map in mapList" 
                  :key="map.mapId" 
                  :label="map.name" 
                  :value="map.mapId"
                />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('geofence.searchStatus')">
              <el-select v-model="searchForm.enabled" :placeholder="$t('geofence.searchStatusPlaceholder')" clearable class="search-status-select">
                <el-option :label="$t('geofence.enabled')" :value="true" />
                <el-option :label="$t('geofence.disabled')" :value="false" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon> {{ $t('geofence.query') }}
              </el-button>
              <el-button @click="handleResetSearch">
                <el-icon><Refresh /></el-icon> {{ $t('geofence.reset') }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        <!-- 操作栏 -->
        <div class="action-bar">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> {{ $t('geofence.add') }}
          </el-button>
          <el-button type="success" @click="handleEnableAll" :disabled="!multipleSelection.length">
            <el-icon><Check /></el-icon> {{ $t('geofence.batchEnable') }}
          </el-button>
          <el-button type="warning" @click="handleDisableAll" :disabled="!multipleSelection.length">
            <el-icon><Close /></el-icon> {{ $t('geofence.batchDisable') }}
          </el-button>
          <el-button type="danger" @click="handleBatchDelete" :disabled="!multipleSelection.length">
            <el-icon><Delete /></el-icon> {{ $t('geofence.batchDelete') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 2. 主要内容区域 -->
    <div class="main-content">
      <!-- 表格 -->
      <div class="geofence-table-wrapper">
        <el-table 
          :data="filteredGeofenceList" 
          class="geofence-table"
          @selection-change="handleSelectionChange"
          v-loading="loading"
          height="calc(100vh - 320px)"
          border
          stripe
          @sort-change="handleSortChange"
        >
          <el-table-column type="selection" width="50" fixed="left" />
          <el-table-column prop="name" :label="$t('geofence.geofenceName')" min-width="180" show-overflow-tooltip sortable="custom" fixed="left" />
          <el-table-column :label="$t('geofence.status')" width="100" align="center" sortable="custom" prop="enabled" fixed="left">
            <template #default="scope">
              <el-tag v-if="scope.row.enabled" type="success">{{ $t('geofence.enabled') }}</el-tag>
              <el-tag v-else type="danger">{{ $t('geofence.disabled') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="mapName" :label="$t('geofence.mapName')" min-width="140" show-overflow-tooltip sortable="custom" />
          <el-table-column :label="$t('geofence.pointCount')" width="120" align="center">
            <template #default="scope">
              <span v-if="scope.row.points && scope.row.points.length">
                {{ scope.row.points.length }} {{ $t('geofence.points') }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" :label="$t('geofence.createTime')" min-width="180" show-overflow-tooltip sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" :label="$t('geofence.remark')" min-width="220" show-overflow-tooltip />
          <el-table-column :label="$t('geofence.operation')" fixed="right" width="220">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button-group class="operation-row">
                  <el-button type="default" size="small" @click="handleToggleEnabled(scope.row)">
                    {{ scope.row.enabled ? $t('geofence.toggleEnabled') : $t('geofence.toggleDisabled') }}
                  </el-button>
                  <el-button type="default" size="small" @click="handleEdit(scope.row)">
                    {{ $t('geofence.edit') }}
                  </el-button>
                  <el-button type="default" size="small" @click="handleDelete(scope.row)">
                    {{ $t('geofence.delete') }}
                  </el-button>
                </el-button-group>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>


  </div>

  <!-- 添加/编辑对话框 -->
  <el-dialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? $t('geofence.addGeofence') : $t('geofence.editGeofence')"
    width="95%"
    @close="resetForm"
    :destroy-on-close="true"
    class="geofence-dialog"
  >
    <el-form
      ref="geofenceFormRef"
      :model="geofenceForm"
      :rules="formRules"
      label-width="120px"
      label-position="left"
      :hide-required-asterisk="true"
      class="geofence-form"
    >
      <el-row :gutter="20">
        <el-col :span="8">
          <div class="left-panel">
            <!-- 基本信息 -->
            <div class="form-section">
              <h3>{{ $t('geofence.basicInfo') }}</h3>
              <el-form-item prop="name">
                <template #label>
                  <span class="label-text">{{ $t('geofence.name') }}</span>
                  <span class="required-mark">*</span>
                </template>
                <el-input v-model="geofenceForm.name" :placeholder="$t('geofence.namePlaceholder')" />
              </el-form-item>
              <el-form-item prop="mapId">
                <template #label>
                  <span class="label-text">{{ $t('geofence.map') }}</span>
                  <span class="required-mark">*</span>
                </template>
                <el-select v-model="geofenceForm.mapId" :placeholder="$t('geofence.mapPlaceholder')" class="form-map-select">
                  <el-option 
                    v-for="map in mapList" 
                    :key="map.mapId" 
                    :label="map.name" 
                    :value="map.mapId"
                  />
                </el-select>
              </el-form-item>
              <el-form-item :label="$t('geofence.enableSwitch')">
                <el-switch v-model="geofenceForm.enabled" />
              </el-form-item>
              <el-form-item :label="$t('geofence.remark')">
                <el-input 
                  v-model="geofenceForm.remark" 
                  type="textarea" 
                  :rows="3"
                  :placeholder="$t('geofence.remarkPlaceholder')"
                />
              </el-form-item>
            </div>
            
            <!-- 围栏点设置 -->
            <div class="form-section">
              <h3>{{ $t('geofence.pointSettings') }} <span class="required-mark">*</span></h3>
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="setPointMode" v-if="!isSettingPoints" :disabled="!selectedMapImageUrl">
                  {{ $t('geofence.clickSetPoints') }}
                </el-button>
                <template v-if="isSettingPoints">
                  <el-button size="small" type="success" @click="completePointSetting" :disabled="geofenceForm.points.length < 3">
                    {{ $t('geofence.completeSetting') }}
                  </el-button>
                  <el-button size="small" @click="cancelPointSetting">
                    {{ $t('geofence.resetSetting') }}
                  </el-button>
                </template>
              </div>
              <div class="points-list" v-if="geofenceForm.points.length > 0">
                <div class="point-count">{{ $t('geofence.pointCountText', { count: geofenceForm.points.length }) }}</div>
                <div class="point-item" v-for="(point, index) in geofenceForm.points" :key="index">
                  <span>{{ $t('geofence.pointItem', { index: index + 1, x: point.x, y: point.y }) }}</span>
                  <el-button size="small" type="danger" link @click="removePoint(index)" v-if="isSettingPoints">
                    {{ $t('common.delete') }}
                  </el-button>
                </div>
              </div>
              <div class="tip-text" v-if="isSettingPoints">
                {{ $t('geofence.tip') }}
              </div>
              <div class="tip-text tip-warning" v-if="isSettingPoints">
                <el-icon><WarningFilled /></el-icon>
                {{ $t('geofence.warning') }}
              </div>
            </div>
          </div>
        </el-col>
        
        <el-col :span="16">
          <!-- 地图预览 -->
          <div class="form-section map-preview-section">
            <h3>{{ $t('geofence.mapPreview') }}</h3>
            <div class="map-preview-container" ref="previewContainer">
              <div 
                class="map-preview" 
                @click="handleMapClick" 
                v-loading="previewLoading"
              >
                <img 
                  v-if="selectedMapImageUrl" 
                  :src="selectedMapImageUrl" 
                  ref="previewImage"
                  @load="handlePreviewImageLoad"
                  alt="地图预览"
                  class="preview-image"
                />
                <div v-else class="no-image">
                  <el-icon :size="40"><Picture /></el-icon>
                  <p>{{ $t('geofence.noImage') }}</p>
                </div>
                
                <!-- 围栏点标记 -->
                <div 
                  v-for="(point, index) in geofenceForm.points" 
                  :key="index" 
                  class="marker geofence-marker"
                  :style="{ 
                    left: `${getDisplayPosition(point.x, point.y).x}px`, 
                    top: `${getDisplayPosition(point.x, point.y).y}px`
                  }"
                >
                  <span>{{ index + 1 }}</span>
                </div>
                
                <!-- 围栏多边形 -->
                <svg v-if="geofenceForm.points.length >= 3" class="polygon-overlay">
                  <polygon 
                    :points="getPolygonPoints()" 
                    fill="rgba(64, 158, 255, 0.2)"
                    stroke="#409EFF" 
                    stroke-width="2"
                  />
                </svg>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading" :disabled="isSettingPoints">
          {{ dialogType === 'add' ? $t('geofence.add') : $t('common.confirm') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { Search, Refresh, Plus, Delete, Check, Close, Picture, WarningFilled } from '@element-plus/icons-vue'
// 恢复CSS导入，因为已经修复了选择器避免样式污染
import '@/assets/styles/geofence-view.css'

// 导入拆分后的模块
import { useGeofenceView } from './geofenceview-js/index.js'

// 使用组合式函数
const {
  // 响应式数据
  loading,
  geofenceList,
  mapList,
  multipleSelection,
  searchForm,
  sortConfig,
  dialogVisible,
  dialogType,
  submitLoading,
  previewLoading,
  isSettingPoints,
  geofenceFormRef,
  geofenceForm,
  formRules,
  previewContainer,
  previewImage,
  selectedMapImageUrl,
  imageInfo,
  filteredGeofenceList,
  
  // 工具方法
  formatDateTime,
  resetForm,
  
  // API方法
  fetchGeofences,
  fetchMaps,
  getMapImageUrl,
  
  // UI方法
  handleSearch,
  handleResetSearch,
  handleAdd,
  handleEdit,
  handleToggleEnabled,
  handleDelete,
  handleSelectionChange,
  handleEnableAll,
  handleDisableAll,
  handleBatchDelete,
  handleSortChange,
  updateMapPreview,
  handleSubmit,
  
  // 地图方法
  handlePreviewImageLoad,
  calculateImageDimensions,
  setPointMode,
  completePointSetting,
  cancelPointSetting,
  removePoint,
  handleMapClick,
  getDisplayPosition,
  getPolygonPoints,
  
  // 生命周期
  onMountedHandler,
  onBeforeUnmountHandler
} = useGeofenceView()

// 使用生命周期
onMounted(onMountedHandler)
onBeforeUnmount(onBeforeUnmountHandler)
</script>

<style scoped>
/* 样式已迁移到外部CSS文件 */
</style>