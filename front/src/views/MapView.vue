<template>
  <div class="map-view-container">
    <!-- 1. 控制面板 (类似 UserView) -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>地图管理</h2>
        <!-- 搜索/过滤栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
            <el-form-item label="地图名称">
              <el-input v-model="searchForm.mapName" placeholder="请输入地图名称" clearable />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon> 查询
              </el-button>
              <el-button @click="handleResetSearch">
                 <el-icon><Refresh /></el-icon> 重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        <!-- 操作栏 -->
        <div class="action-bar">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> 新增
          </el-button>
          <el-button type="danger" @click="handleBatchDelete" :disabled="!multipleSelection.length">
            <el-icon><Delete /></el-icon> 批量删除
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
          <el-table-column label="序号" width="60" align="center" fixed="left">
            <template #default="scope">
              {{ scope.$index + 1 }}
            </template>
          </el-table-column>
          <el-table-column prop="mapId" label="地图ID" min-width="100" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="name" label="地图名称" min-width="150" show-overflow-tooltip sortable="custom" />
          <el-table-column label="地图图片" width="110">
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
          <el-table-column label="图片尺寸" min-width="130" show-overflow-tooltip>
            <template #default="scope">
              <span v-if="scope.row.width && scope.row.height">
                {{ scope.row.width || 0 }} × {{ scope.row.height || 0 }} px
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="原点坐标" min-width="120" show-overflow-tooltip>
            <template #default="scope">
              <span v-if="scope.row.originX !== undefined && scope.row.originY !== undefined">
                ({{ scope.row.originX || 0 }} px, {{ scope.row.originY || 0 }} px)
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="比例尺" min-width="120" show-overflow-tooltip>
            <template #default="scope">
              <span v-if="scope.row.scale">
                1 m = {{ scope.row.scale || 0 }} px
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" min-width="160" show-overflow-tooltip sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="140">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button-group class="operation-row">
                  <el-button type="default" size="small" @click="handleEdit(scope.row)">
                    修改
                  </el-button>
                  <el-button type="default" size="small" @click="handleDelete(scope.row)">
                    删除
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
      :title="dialogType === 'add' ? '添加地图' : '编辑地图'"
      width="90%"
      @close="resetForm"
      :fullscreen="false"
      :destroy-on-close="true"
      class="map-dialog"
    >
      <el-form
        ref="mapFormRef"
        :model="mapForm"
        :rules="rules"
        label-width="80px"
        class="map-form"
      >
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="left-panel">
              <!-- 基本信息 -->
              <div class="form-section">
                <h3>基本信息</h3>
                <el-form-item label="地图ID" prop="mapId">
                  <el-input v-model="mapForm.mapId" placeholder="请输入地图ID" />
                </el-form-item>
                <el-form-item label="地图名称" prop="name">
                  <el-input v-model="mapForm.name" placeholder="请输入地图名称" />
                </el-form-item>
                <el-form-item label="地图文件" prop="file">
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
                    <el-button type="primary" size="small">选择文件</el-button>
                    <template #tip>
                      <div class="el-upload__tip">
                        只能上传 jpg/png 文件，大小不超过 10MB
                      </div>
                    </template>
                  </el-upload>
                </el-form-item>
                <el-form-item label="图片尺寸" v-if="imageInfo.width && imageInfo.height">
                  <div class="size-info">{{ imageInfo.width || 0 }} × {{ imageInfo.height || 0 }} 像素</div>
                </el-form-item>
              </div>
              
              <!-- 原点坐标设置 -->
              <div class="form-section">
                <h3>原点坐标</h3>
                <div class="action-buttons">
                  <el-button size="small" type="primary" @click="setOriginMode" v-if="!isSettingOrigin && !isMeasuring" :disabled="!previewImageUrl">
                    点击设置原点
                  </el-button>
                  <template v-if="isSettingOrigin">
                    <el-button size="small" type="success" @click="completeOriginSetting">
                      完成
                    </el-button>
                    <el-button size="small" @click="cancelOriginSetting">
                      取消
                    </el-button>
                  </template>
                </div>
                <div class="coordinate-inputs">
                  <div class="measure-point-row">
                    <span>原点:</span>
                    <el-form-item label="X (px)" class="half-width no-bottom-margin">
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
                    <el-form-item label="Y (px)" class="half-width no-bottom-margin">
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
                <h3>比例尺计算 <span class="required-mark" v-if="dialogType === 'add'">*</span></h3>
                <div class="action-buttons">
                  <el-button size="small" type="primary" @click="setMeasureMode" v-if="!isMeasuring && !hasCompletedScale && !isSettingOrigin" :disabled="!previewImageUrl">
                    点击设置测量点
                  </el-button>
                  <template v-if="isMeasuring">
                    <el-button size="small" type="success" @click="completeMeasuring" :disabled="scaleForm.points.length < 2">
                      完成
                    </el-button>
                    <el-button size="small" @click="cancelMeasuring">
                      取消
                    </el-button>
                  </template>
                  <template v-if="hasCompletedScale && !isSettingOrigin">
                    <el-button size="small" type="primary" @click="resetScaleMeasurement">
                      点击设置测量点
                    </el-button>
                  </template>
                </div>
                <div class="scale-calculator">
                  <div class="scale-input-group">
                    <span>实际距离(m):</span>
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
                    <p>像素距离: {{ scaleForm.pixelDistance.toFixed(2) }} px</p>
                    <p>比例尺: {{ calculateScale() }}</p>
                  </div>
                </div>

                <!-- 添加两点坐标手动输入 -->
                <div class="point-inputs">
                  <div class="measure-point-row">
                    <span>点1:</span>
                    <el-form-item label="X (px)" class="half-width no-bottom-margin">
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
                    <el-form-item label="Y (px)" class="half-width no-bottom-margin">
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
                    <span>点2:</span>
                    <el-form-item label="X (px)" class="half-width no-bottom-margin">
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
                    <el-form-item label="Y (px)" class="half-width no-bottom-margin">
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
              <h3>地图预览</h3>
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
                    alt="地图预览"
                    class="preview-image"
                  />
                  <div v-else class="no-image">
                    <el-icon :size="40"><Picture /></el-icon>
                    <p>请上传地图图片</p>
                  </div>
                  
                  <!-- 原点标记 -->
                  <div 
                    v-if="mapForm.originX !== null && mapForm.originY !== null && previewImageUrl" 
                    class="origin-marker"
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
                    :key="index" 
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
                  <svg v-if="scaleForm.points.length === 2" class="line-overlay">
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
                    <template v-if="isSettingOrigin">点击图片设置原点位置，完成后点击"完成"按钮</template>
                    <template v-else-if="isMeasuring">点击图片设置测量点 ({{ scaleForm.points.length }}/2)，完成后点击"完成"按钮</template>
                    <template v-else>选择"点击设置原点"或"点击设置测量点"开始</template>
                  </p>
                  <el-button size="small" type="danger" @click="clearMarkers" v-if="!isSettingOrigin && !isMeasuring && scaleForm.points.length > 0">清除标记点</el-button>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { useMapView } from './mapview-js'
import { Search, Refresh, Plus, Delete, Edit, Picture } from '@element-plus/icons-vue'

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

<style scoped>
@import '@/assets/styles/map-view.css';
</style>