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
              <el-input v-model="searchForm.name" :placeholder="$t('geofence.searchNamePlaceholder')" clearable style="width: 200px;" />
            </el-form-item>
            <el-form-item :label="$t('geofence.searchMap')">
              <el-select v-model="searchForm.mapId" :placeholder="$t('geofence.searchMapPlaceholder')" clearable style="width: 220px;">
                <el-option 
                  v-for="map in mapList" 
                  :key="map.mapId" 
                  :label="map.name" 
                  :value="map.mapId"
                />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('geofence.searchStatus')">
              <el-select v-model="searchForm.enabled" :placeholder="$t('geofence.searchStatusPlaceholder')" clearable style="width: 140px;">
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
          style="width: 100%" 
          @selection-change="handleSelectionChange"
          v-loading="loading"
          height="calc(100vh - 320px)"
          border
          stripe
          class="geofence-table"
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
                <el-select v-model="geofenceForm.mapId" :placeholder="$t('geofence.mapPlaceholder')" style="width: 100%;">
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
                    top: `${getDisplayPosition(point.x, point.y).y}px`,
                    transform: 'translate(-50%, -50%)'
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
/* GeofenceView 样式 - 使用scoped避免全局污染 */

.geofence-view-container {
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

.main-content {
  flex: 1;
  display: flex;
  padding: 0 20px;
  overflow: hidden;
  margin-bottom: 20px;
}

.geofence-table-wrapper {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.geofence-table {
  width: 100%;
  height: 100%;
}

.search-bar {
  margin-top: 15px;
  flex-shrink: 0;
}

/* 自适应语言宽度的搜索表单标签 */
.search-bar :deep(.el-form-item__label) {
  min-width: fit-content; /* 自适应内容宽度 */
  white-space: nowrap;
  padding-right: 8px; /* 增加标签和输入框之间的间距 */
}

/* 自适应语言宽度的搜索表单输入框 */
.search-bar :deep(.el-input) {
  min-width: 180px; /* 保持最小宽度 */
  width: auto; /* 允许自动调整宽度 */
}

.search-bar :deep(.el-select) {
  min-width: 200px; /* 保持最小宽度 */
  width: auto; /* 允许自动调整宽度 */
}

.action-bar {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

/* 自适应语言宽度的操作按钮 */
.action-bar :deep(.el-button) {
  min-width: fit-content; /* 自适应内容宽度 */
  white-space: nowrap;
  padding: 8px 16px; /* 增加内边距，确保按钮有足够空间 */
}

.operation-buttons {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: fit-content; /* 自适应内容宽度 */
  max-width: none; /* 移除最大宽度限制 */
}

.operation-row {
  display: flex;
  width: 100%;
}

.operation-buttons :deep(.el-button) {
  flex: 1;
  font-size: 12px;
  padding: 4px 8px;
  min-width: fit-content; /* 自适应内容宽度 */
  white-space: nowrap;
}

/* 对话框样式 */
.geofence-dialog {
  max-height: 90vh;
}

.geofence-form {
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}

.left-panel {
  padding-right: 20px;
}

.form-section {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
  border: 1px solid #e4e7ed;
}

.form-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 10px;
  white-space: nowrap; /* 防止标题换行 */
}

.required-mark {
  color: #f56c6c;
  margin-left: 4px;
}

/* 修复必填字段星号在不同语言下的显示问题 - 使用深度选择器 */
:deep(.el-form-item__label .required-mark),
:deep(.el-form-item__label .required-mark-right) {
  color: #f56c6c;
  font-weight: normal;
  margin-left: 4px;
}

/* 自适应语言宽度的表单标签 */
:deep(.el-form-item__label) {
  position: relative;
  display: inline;
  min-height: 20px;
  min-width: fit-content; /* 自适应内容宽度 */
  white-space: nowrap; /* 防止标签换行 */
  padding-right: 8px; /* 增加标签和输入框之间的间距 */
}

/* 标签文本样式 */
.label-text {
  display: inline;
  white-space: nowrap; /* 防止标签文本换行 */
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

/* 自适应语言宽度的操作按钮 */
.action-buttons :deep(.el-button) {
  min-width: fit-content; /* 自适应内容宽度 */
  white-space: nowrap;
  padding: 8px 16px; /* 增加内边距 */
}

.points-list {
  margin-top: 15px;
}

.point-count {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.point-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
  min-height: 32px;
}

.point-item:last-child {
  border-bottom: none;
}

.point-item span {
  flex: 1;
  margin-right: 10px;
  word-break: break-all;
  white-space: normal; /* 允许点信息换行 */
}

.tip-text {
  font-size: 12px;
  color: #909399;
  margin-top: 10px;
  line-height: 1.4;
  white-space: normal; /* 允许提示文本换行 */
}

.tip-warning {
  color: #e6a23c;
  display: flex;
  align-items: center;
  gap: 4px;
}

.map-preview-section {
  height: 100%;
}

.map-preview-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.map-preview {
  flex: 1;
  position: relative;
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  cursor: crosshair;
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.no-image {
  text-align: center;
  color: #909399;
}

.no-image p {
  margin: 10px 0 0 0;
  font-size: 14px;
}

.marker {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #409EFF;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.geofence-marker {
  background: #67C23A;
}

.polygon-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 响应式布局优化 */
@media (max-width: 1200px) {
  .search-bar :deep(.el-form-item) {
    margin-bottom: 10px;
  }
  
  .action-bar {
    gap: 8px;
  }
  
  .action-bar :deep(.el-button) {
    padding: 6px 12px;
    font-size: 13px;
  }
}

@media (max-width: 768px) {
  .control-panel {
    padding: 0 10px;
  }
  
  .main-content {
    padding: 0 10px;
  }
  
  .search-bar :deep(.el-form-item) {
    display: block;
    margin-bottom: 15px;
  }
  
  .search-bar :deep(.el-input),
  .search-bar :deep(.el-select) {
    width: 100%;
    min-width: auto;
  }
  
  .action-bar {
    flex-direction: column;
    gap: 8px;
  }
  
  .action-bar :deep(.el-button) {
    width: 100%;
    justify-content: center;
  }
}
</style>