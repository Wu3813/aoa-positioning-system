<template>
  <div class="map-view-container">
    <!-- 1. 控制面板 (类似 UserView) -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>{{ $t('maps.title') }}</h2>
        <!-- 搜索/过滤栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
            <el-form-item :label="$t('maps.searchMapName')">
              <el-input v-model="searchForm.mapName" :placeholder="$t('maps.searchMapNamePlaceholder')" clearable />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon> {{ $t('maps.query') }}
              </el-button>
              <el-button @click="handleResetSearch">
                 <el-icon><Refresh /></el-icon> {{ $t('maps.reset') }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        <!-- 操作栏 -->
        <div class="action-bar">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> {{ $t('maps.add') }}
          </el-button>
          <el-button type="danger" @click="handleBatchDelete" :disabled="!multipleSelection.length">
            <el-icon><Delete /></el-icon> {{ $t('maps.batchDelete') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 2. 主要内容区域 (类似 UserView) -->
    <div class="main-content">
      <!-- 表格 -->
      <div class="map-table-wrapper">
        <el-table 
          :data="filteredMapList" 
          style="width: 100%" 
          @selection-change="handleSelectionChange"
          v-loading="loading"
          height="calc(100vh - 320px)"
          border
          stripe
          class="map-table"
          @sort-change="handleSortChange"
        >
          <el-table-column type="selection" width="40" fixed="left" />
          <el-table-column prop="name" :label="$t('maps.mapName')" min-width="180" show-overflow-tooltip sortable="custom" />
          <el-table-column :label="$t('maps.mapImage')" width="120">
            <template #default="scope">
              <div v-if="scope.row.mapId" class="image-container">
                <el-image 
                  style="width: 70px; height: 50px"
                  :src="getMapImageUrl(scope.row.mapId)" 
                  fit="cover"
                  loading="lazy"
                >
                  <template #placeholder>
                    <div class="image-slot">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                  <template #error>
                    <div class="image-slot">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
              </div>
              <div v-else class="image-slot">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="$t('maps.imageSize')" min-width="150" show-overflow-tooltip>
            <template #default="scope">
              <span v-if="scope.row.width && scope.row.height">
                {{ scope.row.width || 0 }} × {{ scope.row.height || 0 }} px
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('maps.originCoordinates')" min-width="140" show-overflow-tooltip>
            <template #default="scope">
              <span v-if="scope.row.originX !== undefined && scope.row.originY !== undefined">
                ({{ scope.row.originX || 0 }} px, {{ scope.row.originY || 0 }} px)
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('maps.scale')" min-width="140" show-overflow-tooltip>
            <template #default="scope">
              <span v-if="scope.row.scale">
                1 m = {{ scope.row.scale || 0 }} px
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" :label="$t('maps.createTime')" min-width="180" show-overflow-tooltip sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('maps.operation')" fixed="right" width="160">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button-group class="operation-row">
                  <el-button type="default" size="small" @click="handleEdit(scope.row)">
                    {{ $t('maps.edit') }}
                  </el-button>
                  <el-button type="default" size="small" @click="handleDelete(scope.row)">
                    {{ $t('maps.delete') }}
                  </el-button>
                </el-button-group>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 添加/编辑对话框 (修改) -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? $t('maps.addMap') : $t('maps.editMap')"
      width="90%"
      @close="resetForm"
      @open="handleDialogOpen"
      :fullscreen="false"
      :destroy-on-close="true"
      class="map-dialog"
    >
      <el-form
        ref="mapFormRef"
        :model="mapForm"
        :rules="rules"
        label-width="120px"
        label-position="left"
        :hide-required-asterisk="true"
        class="map-form"
      >
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="left-panel">
              <!-- 基本信息 -->
              <div class="form-section">
                <h3>{{ $t('maps.basicInfo') }}</h3>
                <el-form-item :label="$t('maps.mapName')" prop="name" label-width="120px">
                  <template #label>
                    {{ $t('maps.mapName') }} <span class="required-mark-right">*</span>
                  </template>
                  <el-input v-model="mapForm.name" :placeholder="$t('maps.searchMapNamePlaceholder')" />
                </el-form-item>
                <el-form-item :label="$t('maps.mapFile')" prop="file" label-width="120px">
                  <el-upload
                    class="map-upload"
                    ref="uploadRef"
                    action="#"
                    :auto-upload="false"
                    :show-file-list="true"
                    :limit="1"
                    :on-exceed="handleExceed"
                    :on-change="handleFileChange"
                    :on-remove="handleFileRemove"
                    accept=".jpg,.jpeg,.png"
                  >
                    <el-button type="primary" size="small">{{ $t('maps.selectFile') }}</el-button>
                    <template #tip>
                      <div class="el-upload__tip">
                        {{ $t('maps.uploadTip') }}
                      </div>
                    </template>
                  </el-upload>
                </el-form-item>
                <el-form-item :label="$t('maps.imageSize')" v-if="imageInfo.width && imageInfo.height" label-width="120px">
                  <div class="size-info">{{ imageInfo.width || 0 }} × {{ imageInfo.height || 0 }} {{ $t('maps.pixels') }}</div>
                </el-form-item>
              </div>
              
              <!-- 原点坐标设置 -->
              <div class="form-section">
                <h3>{{ $t('maps.originCoordinateSetting') }}</h3>
                <div class="action-buttons">
                  <el-button size="small" type="primary" @click="setOriginMode" v-if="!isSettingOrigin && !isMeasuring" :disabled="!previewImageUrl">
                    {{ $t('maps.clickSetOrigin') }}
                  </el-button>
                  <template v-if="isSettingOrigin">
                    <el-button size="small" type="success" @click="completeOriginSetting">
                      {{ $t('maps.complete') }}
                    </el-button>
                    <el-button size="small" @click="cancelOriginSetting">
                      {{ $t('maps.cancel') }}
                    </el-button>
                  </template>
                </div>
                <div class="coordinate-inputs">
                  <div class="measure-point-row">
                    <span class="coordinate-label">{{ $t('maps.origin') }}:</span>
                    <el-form-item label="X (px)" class="half-width no-bottom-margin" label-width="60px">
                      <el-input-number 
                        v-model="mapForm.originX" 
                        :precision="0" 
                        :step="1" 
                        :min="0"
                        controls-position="right" 
                        size="small"
                        style="width: 80px"
                        @change="updateOriginMarker"
                        :disabled="!isSettingOrigin || !previewImageUrl"
                      />
                    </el-form-item>
                    <el-form-item label="Y (px)" class="half-width no-bottom-margin" label-width="60px">
                      <el-input-number 
                        v-model="mapForm.originY" 
                        :precision="0" 
                        :step="1" 
                        :min="0"
                        controls-position="right" 
                        size="small"
                        style="width: 80px"
                        @change="updateOriginMarker"
                        :disabled="!isSettingOrigin || !previewImageUrl"
                      />
                    </el-form-item>
                  </div>
                </div>
              </div>
              
              <!-- 比例尺计算区域 -->
              <div class="form-section">
                <h3>{{ $t('maps.scaleCalculation') }} <span class="required-mark" v-if="dialogType === 'add'">*</span></h3>
                <div class="action-buttons">
                  <el-button size="small" type="primary" @click="setMeasureMode" v-if="!isMeasuring && !hasCompletedScale && !isSettingOrigin" :disabled="!previewImageUrl">
                    {{ $t('maps.clickSetMeasurePoints') }}
                  </el-button>
                  <template v-if="isMeasuring">
                    <el-button size="small" type="success" @click="completeMeasuring" :disabled="scaleForm.points.length < 2">
                      {{ $t('maps.complete') }}
                    </el-button>
                    <el-button size="small" @click="cancelMeasuring">
                      {{ $t('maps.cancel') }}
                    </el-button>
                  </template>
                  <template v-if="hasCompletedScale && !isSettingOrigin">
                    <el-button size="small" type="primary" @click="resetScaleMeasurement">
                      {{ $t('maps.clickSetMeasurePoints') }}
                    </el-button>
                  </template>
                </div>
                <div class="scale-calculator">
                  <div class="scale-input-group">
                    <span class="scale-label">{{ $t('maps.realDistance') }}:</span>
                    <el-input-number 
                      v-model="scaleForm.realDistance" 
                      :precision="2" 
                      :step="0.1" 
                      :min="0.01"
                      controls-position="right" 
                      style="width: 120px"
                      :disabled="!isMeasuring || !previewImageUrl || hasCompletedScale || isSettingOrigin"
                      @change="updateScaleCalculation"
                    />
                  </div>
                  <div class="scale-result" v-if="scaleForm.pixelDistance > 0">
                    <p>{{ $t('maps.pixelDistance') }}: {{ scaleForm.pixelDistance.toFixed(2) }} px</p>
                    <p>{{ $t('maps.scaleResult') }}: {{ calculateScale() }}</p>
                  </div>
                </div>

                <!-- 添加两点坐标手动输入 -->
                <div class="point-inputs">
                  <div class="measure-point-row">
                    <span class="point-label">{{ $t('maps.point1') }}:</span>
                    <el-form-item label="X (px)" class="half-width no-bottom-margin" label-width="60px">
                      <el-input-number 
                        v-model="scaleForm.pointInputs[0].x" 
                        :precision="0" 
                        :step="1" 
                        :min="0"
                        controls-position="right" 
                        size="small"
                        style="width: 80px"
                        @change="updatePointFromInput(0)"
                        :disabled="!isMeasuring || !previewImageUrl || hasCompletedScale || isSettingOrigin"
                      />
                    </el-form-item>
                    <el-form-item label="Y (px)" class="half-width no-bottom-margin" label-width="60px">
                      <el-input-number 
                        v-model="scaleForm.pointInputs[0].y" 
                        :precision="0" 
                        :step="1" 
                        :min="0"
                        controls-position="right" 
                        size="small"
                        style="width: 80px"
                        @change="updatePointFromInput(0)"
                        :disabled="!isMeasuring || !previewImageUrl || hasCompletedScale || isSettingOrigin"
                      />
                    </el-form-item>
                  </div>
                  <div class="measure-point-row">
                    <span class="point-label">{{ $t('maps.point2') }}:</span>
                    <el-form-item label="X (px)" class="half-width no-bottom-margin" label-width="60px">
                      <el-input-number 
                        v-model="scaleForm.pointInputs[1].x" 
                        :precision="0" 
                        :step="1" 
                        :min="0"
                        controls-position="right" 
                        size="small"
                        style="width: 80px"
                        @change="updatePointFromInput(1)"
                        :disabled="!isMeasuring || !previewImageUrl || hasCompletedScale || isSettingOrigin"
                      />
                    </el-form-item>
                    <el-form-item label="Y (px)" class="half-width no-bottom-margin" label-width="60px">
                      <el-input-number 
                        v-model="scaleForm.pointInputs[1].y" 
                        :precision="0" 
                        :step="1" 
                        :min="0"
                        controls-position="right" 
                        size="small"
                        style="width: 80px"
                        @change="updatePointFromInput(1)"
                        :disabled="!isMeasuring || !previewImageUrl || hasCompletedScale || isSettingOrigin"
                      />
                    </el-form-item>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
          
          <el-col :span="16">
            <!-- 地图缩略图 -->
            <div class="form-section map-preview-section">
              <h3>{{ $t('maps.mapPreview') }}</h3>
              <div class="map-preview-container" ref="previewContainer">
                <div 
                  class="map-preview" 
                  @click="handleMapClick" 
                  v-loading="previewLoading"
                >
                  <img 
                    v-if="previewImageUrl" 
                    :src="previewImageUrl" 
                    ref="previewImage"
                    @load="handlePreviewImageLoad"
                    @resize="calculateImageDimensions"
                    :alt="$t('maps.mapPreview')"
                    class="preview-image"
                  />
                  <div v-else class="no-image">
                    <el-icon :size="40"><Picture /></el-icon>
                    <p>{{ $t('maps.uploadMapImage') }}</p>
                  </div>
                  
                  <!-- 原点标记 -->
                  <div 
                    v-if="mapForm.originX !== null && mapForm.originY !== null && previewImageUrl" 
                    class="origin-marker"
                    :key="`origin-${imageSizeVersion}`"
                    :style="{ 
                      left: `${getDisplayPosition(mapForm.originX, mapForm.originY).x}px`, 
                      top: `${getDisplayPosition(mapForm.originX, mapForm.originY).y}px`,
                      transform: 'translate(-50%, -50%)'
                    }"
                  >
                    <span>O</span>
                  </div>
                  
                  <!-- 标记点 -->
                  <div 
                    v-for="(point, index) in scaleForm.points" 
                    :key="`point-${index}-${imageSizeVersion}`" 
                    class="marker"
                    :style="{ 
                      left: `${getDisplayPosition(point.x, point.y).x}px`, 
                      top: `${getDisplayPosition(point.x, point.y).y}px`,
                      backgroundColor: index === 0 ? '#409EFF' : '#67C23A',
                      transform: 'translate(-50%, -50%)'
                    }"
                  >
                    <span>{{ index + 1 }}</span>
                  </div>
                  
                  <!-- 连线 -->
                  <svg v-if="scaleForm.points.length === 2" class="line-overlay" :key="`line-${imageSizeVersion}`">
                    <line 
                      :x1="getDisplayPosition(scaleForm.points[0].x, scaleForm.points[0].y).x" 
                      :y1="getDisplayPosition(scaleForm.points[0].x, scaleForm.points[0].y).y"
                      :x2="getDisplayPosition(scaleForm.points[1].x, scaleForm.points[1].y).x" 
                      :y2="getDisplayPosition(scaleForm.points[1].x, scaleForm.points[1].y).y"
                      stroke="#E6A23C" 
                      stroke-width="2"
                    />
                  </svg>
                </div>
                
                <div class="preview-instructions" v-if="previewImageUrl">
                  <p>
                    <template v-if="isSettingOrigin">{{ $t('maps.clickImageSetOrigin') }}</template>
                    <template v-else-if="isMeasuring">{{ $t('maps.clickImageSetMeasurePoints', { count: scaleForm.points.length }) }}</template>
                    <template v-else>{{ $t('maps.selectOriginOrMeasure') }}</template>
                  </p>
                  <el-button size="small" type="danger" @click="clearMarkers" v-if="!isSettingOrigin && !isMeasuring && scaleForm.points.length > 0">{{ $t('maps.clearMarkers') }}</el-button>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">{{ $t('maps.cancel') }}</el-button>
          <el-button type="primary" @click="handleSubmit">{{ $t('maps.confirm') }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { useMapView } from './mapview-js'
import { Search, Refresh, Plus, Delete, Edit, Picture } from '@element-plus/icons-vue'
// 恢复CSS导入，因为已经修复了选择器避免样式污染
import '@/assets/styles/map-view.css'

// 使用组合式函数获取所有响应式数据和方法
const {
  // 响应式数据
  mapList,
  loading,
  dialogVisible,
  dialogType,
  mapFormRef,
  uploadRef,
  searchForm,
  multipleSelection,
  mapForm,
  sortOrder,
  scaleForm,
  imageInfo,
  imageSizeVersion,
  previewContainer,
  previewImage,
  previewLoading,
  previewImageUrl,
  rules,
  isMeasuring,
  isSettingOrigin,
  currentMapId,
  hasCompletedScale,
  filteredMapList,

  // 方法
  getMapImageUrl,
  fetchMapList,
  fetchCurrentMapId,
  handleSearch,
  handleResetSearch,
  handleSelectionChange,
  calculateScale,
  calculatePixelDistance,
  handleMapClick,
  setOriginMode,
  completeOriginSetting,
  cancelOriginSetting,
  updateOriginMarker,
  handlePreviewImageLoad,
  calculateImageDimensions,
  updatePointFromInput,
  clearMarkers,
  handleFileChange,
  handleFileRemove,
  resetForm,
  handleEdit,
  handleDelete,
  handleBatchDelete,
  handleSubmit,
  handleSetCurrent,
  handleExceed,
  handleAdd,
  setMeasureMode,
  completeMeasuring,
  cancelMeasuring,
  formatDateTime,
  handleSortChange,
  updateCoordinateRangeFromScale,
  getDisplayPosition,
  updateScaleCalculation,
  resetScaleMeasurement
} = useMapView()
</script>

<style>
/* 使用外部CSS文件 */
</style>