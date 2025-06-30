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
              <div v-if="scope.row.id" class="image-container">
                <el-image 
                  style="width: 70px; height: 50px"
                  :src="getMapImageUrl(scope.row.id)" 
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
                        style="width: 100%"
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
                        style="width: 100%"
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
                        style="width: 100%"
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
                        style="width: 100%"
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
                        style="width: 100%"
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
                        style="width: 100%"
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
import { useMapStore } from '@/stores/map'
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete, Edit, Picture } from '@element-plus/icons-vue'
import axios from 'axios'

const mapStore = useMapStore()
const mapList = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('add')
const mapFormRef = ref(null)
const uploadRef = ref(null)

// 搜索表单
const searchForm = reactive({
  mapName: ''
})

// 表格多选
const multipleSelection = ref([])

// 添加/编辑表单
const mapForm = reactive({
  id: null,
  mapId: '',
  name: '',
  file: null,
  originX: 0,
  originY: 0,
  width: 0,
  height: 0,
  scale: null,
  point1X: null,
  point1Y: null,
  point2X: null,
  point2Y: null,
  realDistance: 1
})

// 排序相关
const sortOrder = ref({
  prop: '',
  order: ''
})

// 比例尺计算相关
const scaleForm = reactive({
  points: [],
  pixelDistance: 0,
  realDistance: 1,
  pointInputs: [
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  ]
})

// 图片信息
const imageInfo = reactive({
  width: 0,
  height: 0,
  scale: { x: 1, y: 1 },
  originalImage: null,
  display: null
})

// 预览相关
const previewContainer = ref(null)
const previewImage = ref(null)
const previewLoading = ref(false)
const previewImageUrl = ref(null)

// 表单校验规则
const rules = {
  mapId: [
    { required: true, message: '请输入地图ID', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]+$/, message: '地图ID只能包含字母、数字、下划线和横线', trigger: 'blur' }
  ],
  name: [{ required: true, message: '请输入地图名称', trigger: 'blur' }],
}

// 添加测量模式状态
const isMeasuring = ref(false)
// 原点设置模式
const isSettingOrigin = ref(false)
// 添加当前地图选择相关的数据
const currentMapId = ref(null)
// 添加比例尺计算是否已完成状态
const hasCompletedScale = ref(false)

// --- 方法 ---

// 获取地图图片 URL
const getMapImageUrl = (mapId) => {
  try {
    if (!mapId) return '';
    return `/api/maps/${mapId}/image?t=${Date.now()}`;
  } catch (error) {
    console.error('生成图片URL时出错:', error);
    return '';
  }
}

// 获取地图列表
const fetchMapList = async () => {
  loading.value = true
  try {
    const params = {}
    
    if (searchForm.mapName && searchForm.mapName.trim()) {
      params.name = searchForm.mapName.trim()
    }
    
    const response = await axios.get('/api/maps', { params })
    if (response.data && response.data.content) {
      mapList.value = response.data.content
    } else {
      mapList.value = Array.isArray(response.data) ? response.data : []
    }
    
    await fetchCurrentMapId()
  } catch (error) {
    console.error('获取地图列表失败:', error)
    ElMessage.error('获取地图列表失败')
    mapList.value = []
  } finally {
    loading.value = false
  }
}

// 获取当前地图ID
const fetchCurrentMapId = async () => {
   try {
      const currentMapResponse = await axios.get('/api/maps/current')
      currentMapId.value = currentMapResponse.data?.id || null
    } catch (error) {
       console.warn('获取当前地图失败:', error)
       if (!currentMapId.value) {
           currentMapId.value = null
       }
    }
}

// 搜索
const handleSearch = () => {
  fetchMapList()
}

// 重置搜索
const handleResetSearch = () => {
  searchForm.mapName = ''
  handleSearch()
}

// 表格选择变化
const handleSelectionChange = (val) => {
  multipleSelection.value = val
}

// 计算比例尺
const calculateScale = () => {
  if (scaleForm.pixelDistance <= 0 || scaleForm.realDistance <= 0) return '未计算';
  
  const pixelsPerMeter = scaleForm.pixelDistance / scaleForm.realDistance;
  return `1 m = ${pixelsPerMeter.toFixed(2)} px`;
}

// 计算两点间像素距离
const calculatePixelDistance = (p1, p2) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// 处理地图点击 - 修改为使用图片实际坐标
const handleMapClick = (event) => {
  if (!previewImage.value || !imageInfo.display || !previewImageUrl.value) return;
  
  // 获取点击相对于容器的坐标
  const rect = event.currentTarget.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  
  // 获取图片的实际位置和尺寸（DOM元素尺寸）
  const imgElement = previewImage.value;
  const imgRect = imgElement.getBoundingClientRect();
  const imgOffsetX = imgRect.left - rect.left;
  const imgOffsetY = imgRect.top - rect.top;
  const imgDisplayWidth = imgRect.width;
  const imgDisplayHeight = imgRect.height;
  
  // 检查点击是否在图片区域内（使用实际DOM位置）
  if (
    clickX < imgOffsetX || 
    clickX > imgOffsetX + imgDisplayWidth ||
    clickY < imgOffsetY || 
    clickY > imgOffsetY + imgDisplayHeight
  ) {
    console.log('点击在图片区域外', { 
      点击坐标: { x: clickX, y: clickY }, 
      图片DOM位置: { x: imgOffsetX, y: imgOffsetY },
      图片DOM尺寸: { width: imgDisplayWidth, height: imgDisplayHeight }
    });
    return;
  }
  
  // 计算点击位置相对于图片的比例
  const relativeX = (clickX - imgOffsetX) / imgDisplayWidth;
  const relativeY = (clickY - imgOffsetY) / imgDisplayHeight;
  
  // 转换为图片上的实际像素坐标
  const imageX = Math.round(relativeX * imageInfo.width);
  const imageY = Math.round(relativeY * imageInfo.height);
  
  // 确保坐标在图片范围内
  const boundedImageX = Math.max(0, Math.min(imageInfo.width - 1, imageX));
  const boundedImageY = Math.max(0, Math.min(imageInfo.height - 1, imageY));
  
  console.log('点击位置:', { 
    显示坐标: { x: clickX, y: clickY }, 
    图片位置: { x: imgOffsetX, y: imgOffsetY },
    相对比例: { x: relativeX.toFixed(4), y: relativeY.toFixed(4) },
    转换后图片坐标: { x: boundedImageX, y: boundedImageY }
  });
  
  // 如果是设置原点模式
  if (isSettingOrigin.value) {
    mapForm.originX = boundedImageX;
    mapForm.originY = boundedImageY;
    ElMessage.info(`原点已更新为 (${boundedImageX}, ${boundedImageY})，点击"完成"按钮确认`);
    return;
  }
  
  // 如果是测量模式且未完成比例尺设置
  if (isMeasuring.value && !hasCompletedScale.value) {
    // 如果已有两个点，清除现有点
    if (scaleForm.points.length >= 2) {
      scaleForm.points = [];
      scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    }
    
    // 添加新点（使用图片实际像素坐标）
    scaleForm.points.push({ x: boundedImageX, y: boundedImageY });
    
    // 更新输入框
    const pointIndex = scaleForm.points.length - 1;
    scaleForm.pointInputs[pointIndex].x = boundedImageX;
    scaleForm.pointInputs[pointIndex].y = boundedImageY;
    
    // 提示用户
    if (scaleForm.points.length === 1) {
      ElMessage.info(`已设置第一个测量点 (${boundedImageX}, ${boundedImageY})，请继续设置第二个测量点`);
    } else if (scaleForm.points.length === 2) {
      // 自动计算距离
      scaleForm.pixelDistance = calculatePixelDistance(scaleForm.points[0], scaleForm.points[1]);
      ElMessage.info(`已设置第二个测量点 (${boundedImageX}, ${boundedImageY})，请点击"完成"按钮确认设置比例尺`);
    }
    
    return;
  }
}

// 设置原点模式切换
const setOriginMode = () => {
  // 检查是否处于测量模式且尚未完成
  if (isMeasuring.value) {
    ElMessage.warning('请先完成或取消当前的测量点设置');
    return;
  }
  
  // 检查是否已有测量点但未完成
  if (scaleForm.points.length > 0 && scaleForm.points.length < 2 && !hasCompletedScale.value) {
    ElMessage.warning('请先完成或取消当前的测量点设置');
    return;
  }
  
  if (!previewImageUrl.value) {
    ElMessage.warning('请先上传地图文件');
    return;
  }
  
  isSettingOrigin.value = true;
  isMeasuring.value = false; // 确保退出测量模式
  ElMessage.info('请在图片上点击设置原点位置，完成后点击"完成"按钮');
}

// 完成原点设置
const completeOriginSetting = () => {
  // 允许原点为(0,0)，移除此检查
  /*
  if (mapForm.originX === 0 && mapForm.originY === 0) {
    ElMessage.warning('请点击图片上的位置设置有效的原点坐标');
    return;
  }
  */
  
  isSettingOrigin.value = false;
  ElMessage.success(`原点设置完成: (${mapForm.originX}, ${mapForm.originY})`);
}

// 取消原点设置
const cancelOriginSetting = () => {
  isSettingOrigin.value = false;
  // 如果用户取消，将原点重置为之前的值或0
  if (!mapForm.originX && !mapForm.originY) {
    mapForm.originX = 0;
    mapForm.originY = 0;
  }
}

// 更新原点标记
const updateOriginMarker = () => {
  if (imageInfo.width && imageInfo.height) {
    mapForm.originX = Math.min(Math.max(0, mapForm.originX), imageInfo.width);
    mapForm.originY = Math.min(Math.max(0, mapForm.originY), imageInfo.height);
  }
}

// 处理预览图片加载
const handlePreviewImageLoad = (event) => {
  const img = event.target;
  imageInfo.width = img.naturalWidth;
  imageInfo.height = img.naturalHeight;
  
  // 更新mapForm中的图片尺寸
  mapForm.width = img.naturalWidth;
  mapForm.height = img.naturalHeight;
  
  previewLoading.value = false;
  
  if (!imageInfo.originalImage) {
    imageInfo.originalImage = new Image();
    imageInfo.originalImage.src = img.src;
  }
  
  calculateImageDimensions();
}

// 计算图片在预览区域中的实际尺寸和位置
const calculateImageDimensions = () => {
  if (!previewImage.value || !imageInfo.width || !imageInfo.height) return;
  
  const container = previewImage.value.parentElement;
  if (!container) return;
  
  // 移除固定内边距，使用容器的实际尺寸
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  
  const imgRatio = imageInfo.width / imageInfo.height;
  const containerRatio = containerWidth / containerHeight;
  
  let displayWidth, displayHeight;
  let offsetX = 0, offsetY = 0;
  
  if (imgRatio > containerRatio) {
    // 图片更宽，以容器宽度为基准
    displayWidth = containerWidth;
    displayHeight = containerWidth / imgRatio;
    offsetY = (containerHeight - displayHeight) / 2;
  } else {
    // 图片更高，以容器高度为基准
    displayHeight = containerHeight;
    displayWidth = containerHeight * imgRatio;
    offsetX = (containerWidth - displayWidth) / 2;
  }
  
  // 更新图片显示信息
  imageInfo.display = {
    width: displayWidth,
    height: displayHeight,
    offsetX: offsetX,
    offsetY: offsetY,
    scaleX: imageInfo.width / displayWidth,
    scaleY: imageInfo.height / displayHeight
  };
  
  console.log('图片显示信息:', {
    原始尺寸: `${imageInfo.width} x ${imageInfo.height}`,
    显示尺寸: `${displayWidth.toFixed(2)} x ${displayHeight.toFixed(2)}`,
    缩放比例: `${imageInfo.display.scaleX.toFixed(4)} x ${imageInfo.display.scaleY.toFixed(4)}`,
    偏移量: `${offsetX.toFixed(2)} x ${offsetY.toFixed(2)}`
  });
  
  // 重新计算并更新已有标记点的位置
  if (mapForm.originX !== null && mapForm.originY !== null) {
    updateOriginMarker();
  }
  
  if (scaleForm.points.length > 0) {
    // 强制更新点位置的显示
    scaleForm.points = [...scaleForm.points];
  }
}

// 窗口大小变化时重新计算
window.addEventListener('resize', calculateImageDimensions);

// 在组件卸载时移除事件监听
onBeforeUnmount(() => {
  window.removeEventListener('resize', calculateImageDimensions);
});

// 从输入框更新点位置
const updatePointFromInput = (index) => {
  if (index >= 0 && index <= 1) {
    // 确保点数组有足够的元素
    while (scaleForm.points.length <= index) {
      scaleForm.points.push({ x: 0, y: 0 });
    }
    
    // 更新点坐标
    scaleForm.points[index].x = scaleForm.pointInputs[index].x;
    scaleForm.points[index].y = scaleForm.pointInputs[index].y;
    
    // 如果有两个点，重新计算距离 (无论是否在测量模式)
    if (scaleForm.points.length === 2) {
      scaleForm.pixelDistance = calculatePixelDistance(scaleForm.points[0], scaleForm.points[1]);
      
      // 只在非测量模式下或已完成比例尺设置时更新坐标范围
      if (!isMeasuring.value || hasCompletedScale.value) {
        updateCoordinateRangeFromScale();
      }
    }
  }
}

// 清除标记点
const clearMarkers = () => {
  if (isSettingOrigin.value || isMeasuring.value) {
    ElMessage.warning('请先完成当前操作');
    return;
  }
  
  // 检查是否有未完成的测量点设置（有1个点但没有2个点）
  if (scaleForm.points.length === 1 && !hasCompletedScale.value) {
    ElMessage.warning('请先完成或取消测量点设置');
    return;
  }
  
  scaleForm.points = [];
  scaleForm.pixelDistance = 0;
  scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
}

// 处理文件变更
const handleFileChange = (file, fileList) => {
  if (fileList.length > 1) {
    fileList.splice(0, fileList.length - 1); 
  }
  const isLt10M = file.size / 1024 / 1024 < 10; 
  if (!['image/jpeg', 'image/png'].includes(file.raw.type)) {
    ElMessage.error('上传地图图片只能是 JPG/PNG 格式!');
    uploadRef.value?.clearFiles(); 
    mapForm.file = null;
    previewImageUrl.value = null;
    return false;
  }
  if (!isLt10M) {
    ElMessage.error('上传地图图片大小不能超过 10MB!');
    uploadRef.value?.clearFiles(); 
    mapForm.file = null;
    previewImageUrl.value = null;
    return false;
  }
  
  mapForm.file = file.raw;
  
  // 创建预览
  previewLoading.value = true;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImageUrl.value = e.target.result;
  };
  reader.readAsDataURL(mapForm.file);
  
  // 清除标记点
  clearMarkers();
  
  // 清除原点和比例尺数据
  mapForm.originX = 0;
  mapForm.originY = 0;
  mapForm.scale = null;
  mapForm.point1X = null;
  mapForm.point1Y = null;
  mapForm.point2X = null;
  mapForm.point2Y = null;
  mapForm.realDistance = 1;
  
  // 重置设置状态
  isSettingOrigin.value = false;
  isMeasuring.value = false;
  hasCompletedScale.value = false;
  
  // 如果是编辑模式，提示用户需要重新设置原点和比例尺
  if (dialogType.value === 'edit') {
    ElMessage.warning({
      message: '更换地图后，请重新设置原点坐标和比例尺！',
      duration: 5000
    });
  }
}

// 处理文件移除
const handleFileRemove = () => {
  mapForm.file = null;
  previewImageUrl.value = null;
  clearMarkers();
  imageInfo.width = 0;
  imageInfo.height = 0;
}

// 重置表单
const resetForm = () => {
  if (mapFormRef.value) {
    mapFormRef.value.resetFields();
  }
  mapForm.id = null;
  mapForm.mapId = '';
  mapForm.file = null;
  mapForm.name = '';
  mapForm.originX = 0;
  mapForm.originY = 0;
  mapForm.width = 0;
  mapForm.height = 0;
  mapForm.scale = null;
  mapForm.point1X = null;
  mapForm.point1Y = null;
  mapForm.point2X = null;
  mapForm.point2Y = null;
  mapForm.realDistance = 1;
  
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
  
  // 重置比例尺计算
  scaleForm.points = [];
  scaleForm.pixelDistance = 0;
  scaleForm.realDistance = 1;
  scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  
  // 重置预览
  previewImageUrl.value = null;
  imageInfo.width = 0;
  imageInfo.height = 0;
  imageInfo.originalImage = null;
  
  // 重置原点设置模式
  isSettingOrigin.value = false;
  // 重置测量模式
  isMeasuring.value = false;
  // 重置比例尺完成状态
  hasCompletedScale.value = false;
}

const handleEdit = (row) => {
  resetForm();
  dialogType.value = 'edit';
  // 填充表单数据
  mapForm.id = row.id;
  mapForm.mapId = row.mapId;
  mapForm.name = row.name;
  mapForm.originX = row.originX || 0;
  mapForm.originY = row.originY || 0;
  mapForm.width = row.width || 0;
  mapForm.height = row.height || 0;
  mapForm.scale = row.scale || null;
  mapForm.point1X = row.point1X || null;
  mapForm.point1Y = row.point1Y || null;
  mapForm.point2X = row.point2X || null;
  mapForm.point2Y = row.point2Y || null;
  mapForm.realDistance = row.realDistance || 1;
  mapForm.file = null;
  
  // 如果有测量点坐标，恢复到scaleForm中
  if (row.point1X !== null && row.point1Y !== null && row.point2X !== null && row.point2Y !== null) {
    scaleForm.points = [
      { x: row.point1X, y: row.point1Y },
      { x: row.point2X, y: row.point2Y }
    ];
    scaleForm.pointInputs = [
      { x: row.point1X, y: row.point1Y },
      { x: row.point2X, y: row.point2Y }
    ];
    
    // 恢复比例尺相关数据
    scaleForm.realDistance = row.realDistance || 1;
    scaleForm.pixelDistance = calculatePixelDistance(
      { x: row.point1X, y: row.point1Y },
      { x: row.point2X, y: row.point2Y }
    );
    
    // 设置比例尺已完成标志
    if (row.scale) {
      hasCompletedScale.value = true;
    }
  } else {
    // 没有测量点数据，重置比例尺相关字段
    scaleForm.points = [];
    scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    scaleForm.pixelDistance = 0;
    scaleForm.realDistance = 1;
    hasCompletedScale.value = false;
  }
  
  // 加载预览图
  previewLoading.value = true;
  previewImageUrl.value = getMapImageUrl(row.id);
  
  dialogVisible.value = true;
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除地图 "${row.name}" 吗？`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await axios.delete(`/api/maps/${row.id}`)
      ElMessage.success('删除成功')
      fetchMapList()
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {
    // 用户取消
  })
}

// 批量删除
const handleBatchDelete = () => {
  if (!multipleSelection.value.length) {
    ElMessage.warning('请选择要删除的地图')
    return
  }

  ElMessageBox.confirm(`确定要删除选中的 ${multipleSelection.value.length} 个地图吗？`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const ids = multipleSelection.value.map(item => item.id)
      await axios.delete('/api/maps/batch', { data: ids })
      ElMessage.success('删除成功')
      handleSearch()
    } catch (error) {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }).catch(() => {
    // 取消删除
  })
}

const handleSubmit = async () => {
  if (!mapFormRef.value) return
  
  try {
    const valid = await mapFormRef.value.validate()
    if (!valid) return
    
    // 新增地图时检查比例尺是否已设置
    if (dialogType.value === 'add') {
      if (!mapForm.file) {
        ElMessage.error('请选择要上传的地图文件')
        return
      }
      if (!mapForm.scale || mapForm.scale <= 0) {
        ElMessage.error('请先设置地图比例尺！请点击"点击设置测量点"完成比例尺设置')
        return
      }
    }
    
    const formData = new FormData()
    formData.append('mapId', mapForm.mapId)
    formData.append('name', mapForm.name)
    
    // 添加原点坐标
    if (mapForm.originX !== null) formData.append('originX', mapForm.originX)
    if (mapForm.originY !== null) formData.append('originY', mapForm.originY)
    
    // 添加图片尺寸
    if (mapForm.width > 0) formData.append('width', mapForm.width)
    if (mapForm.height > 0) formData.append('height', mapForm.height)
    
    // 添加比例尺数据
    if (mapForm.scale) formData.append('scale', mapForm.scale)
    
    // 添加测量点数据
    if (mapForm.point1X !== null) formData.append('point1X', mapForm.point1X)
    if (mapForm.point1Y !== null) formData.append('point1Y', mapForm.point1Y)
    if (mapForm.point2X !== null) formData.append('point2X', mapForm.point2X)
    if (mapForm.point2Y !== null) formData.append('point2Y', mapForm.point2Y)
    if (mapForm.realDistance) formData.append('realDistance', mapForm.realDistance)
    
    if (dialogType.value === 'add') {
      formData.append('file', mapForm.file)
      await axios.post('/api/maps', formData)
      ElMessage.success('添加成功')
    } else {
      if (mapForm.file) {
        formData.append('file', mapForm.file)
      }
      if (!mapForm.id) {
        console.error('编辑地图时 ID 丢失')
        ElMessage.error('编辑失败，地图 ID 丢失')
        return
      }
      await axios.put(`/api/maps/${mapForm.id}`, formData)
      ElMessage.success('编辑成功')
    }
    
    dialogVisible.value = false
    fetchMapList()
  } catch (error) {
    console.error('提交失败:', error)
    const errorMsg = error.response?.data?.message || (dialogType.value === 'add' ? '添加失败' : '编辑失败')
    ElMessage.error(errorMsg)
  }
}

// 设置为当前地图
const handleSetCurrent = async (row) => {
  try {
    await axios.put(`/api/maps/current/${row.id}`)
    currentMapId.value = row.id
    ElMessage.success(`已将 "${row.name}" 设置为当前地图`)
  } catch (error) {
    console.error('设置当前地图失败:', error)
    ElMessage.error('设置当前地图失败')
  }
}

// 页面加载时获取地图列表
onMounted(() => {
    fetchMapList()
})

// 处理文件超出限制
const handleExceed = () => {
  ElMessage.warning('只能选择一个地图文件，请先移除当前文件再选择新的文件')
}

const handleAdd = () => {
  resetForm()
  dialogType.value = 'add'
  dialogVisible.value = true
  
  // 确保比例尺计算相关的表单字段初始化
  scaleForm.points = []
  scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }]
  scaleForm.pixelDistance = 0
  scaleForm.realDistance = 1
}

// 设置测量模式
const setMeasureMode = () => {
  if (!previewImageUrl.value) {
    ElMessage.warning('请先上传地图文件');
    return;
  }
  
  if (isSettingOrigin.value) {
    ElMessage.warning('请先完成或取消原点设置');
    return;
  }
  
  isMeasuring.value = true;
  hasCompletedScale.value = false;
  
  // 清除现有点
  scaleForm.points = [];
  scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  scaleForm.pixelDistance = 0;
  ElMessage.info('请在图片上点击设置测量点，需要设置两个点');
}

// 完成测量
const completeMeasuring = () => {
  if (scaleForm.points.length < 2) {
    ElMessage.warning('请先设置两个测量点');
    return;
  }
  
  isMeasuring.value = false;
  hasCompletedScale.value = true;
  
  // 计算距离
  scaleForm.pixelDistance = calculatePixelDistance(scaleForm.points[0], scaleForm.points[1]);
  
  // 更新mapForm中的测量点和比例尺数据
  mapForm.point1X = scaleForm.points[0].x;
  mapForm.point1Y = scaleForm.points[0].y;
  mapForm.point2X = scaleForm.points[1].x;
  mapForm.point2Y = scaleForm.points[1].y;
  mapForm.realDistance = scaleForm.realDistance;
  
  if (scaleForm.pixelDistance > 0 && scaleForm.realDistance > 0) {
    const pixelsPerMeter = scaleForm.pixelDistance / scaleForm.realDistance;
    mapForm.scale = pixelsPerMeter.toFixed(2);
    ElMessage.success(`比例尺设置完成: 1 m = ${pixelsPerMeter.toFixed(2)} px`);
  }
  
  // 根据比例尺自动更新坐标范围
  updateCoordinateRangeFromScale();
}

// 取消测量
const cancelMeasuring = () => {
  isMeasuring.value = false;
  
  // 如果没有已保存的测量点，或者有已保存但未完成测量，清除当前输入
  if (!mapForm.point1X || !mapForm.point1Y || !mapForm.point2X || !mapForm.point2Y || !hasCompletedScale.value) {
    scaleForm.points = [];
    scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    scaleForm.pixelDistance = 0;
  } else {
    // 如果之前已完成测量，恢复到已保存的测量点
    scaleForm.points = [
      { x: mapForm.point1X, y: mapForm.point1Y },
      { x: mapForm.point2X, y: mapForm.point2Y }
    ];
    scaleForm.pointInputs = [
      { x: mapForm.point1X, y: mapForm.point1Y },
      { x: mapForm.point2X, y: mapForm.point2Y }
    ];
    scaleForm.pixelDistance = calculatePixelDistance(
      { x: mapForm.point1X, y: mapForm.point1Y },
      { x: mapForm.point2X, y: mapForm.point2Y }
    );
  }
  
  ElMessage.info('已取消测量点设置');
}

// 格式化日期时间
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '-';
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return dateTimeStr;
    
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  } catch (e) {
    return dateTimeStr;
  }
}

// 处理排序变化
const handleSortChange = ({ prop, order }) => {
  sortOrder.value = { prop, order };
}

// 计算属性：根据排序条件处理地图列表
const filteredMapList = computed(() => {
  let list = [...mapList.value];
  
  // 如果有排序条件，则进行排序
  if (sortOrder.value.prop && sortOrder.value.order) {
    const { prop, order } = sortOrder.value;
    const isAsc = order === 'ascending';
    
    list.sort((a, b) => {
      let valueA = a[prop];
      let valueB = b[prop];
      
      // 特殊处理日期时间字段
      if (prop === 'createTime') {
        valueA = valueA ? new Date(valueA).getTime() : 0;
        valueB = valueB ? new Date(valueB).getTime() : 0;
      }
      
      // 处理可能为空的值
      if (valueA === null || valueA === undefined) valueA = isAsc ? -Infinity : Infinity;
      if (valueB === null || valueB === undefined) valueB = isAsc ? -Infinity : Infinity;
      
      // 字符串使用本地化比较
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return isAsc ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }
      
      // 数值比较
      return isAsc ? valueA - valueB : valueB - valueA;
    });
  }
  
  return list;
});

// 更新坐标范围
const updateCoordinateRangeFromScale = () => {
  if (scaleForm.pixelDistance <= 0 || scaleForm.realDistance <= 0 || !imageInfo.width || !imageInfo.height) return;
  
  // 计算像素到米的比例
  const pixelsPerMeter = scaleForm.pixelDistance / scaleForm.realDistance;
  
  // 计算图片实际尺寸对应的物理尺寸（米）
  const widthInMeters = imageInfo.width / pixelsPerMeter;
  const heightInMeters = imageInfo.height / pixelsPerMeter;
  
  // 假设原点在中心，计算坐标系范围
  const originX = mapForm.originX || imageInfo.width / 2;
  const originY = mapForm.originY || imageInfo.height / 2;
  
  // 计算坐标轴范围（以米为单位）
  const xMin = -originX / pixelsPerMeter;
  const xMax = (imageInfo.width - originX) / pixelsPerMeter;
  const yMin = -originY / pixelsPerMeter;
  const yMax = (imageInfo.height - originY) / pixelsPerMeter;
  
  console.log(`地图物理尺寸: ${widthInMeters.toFixed(2)}m × ${heightInMeters.toFixed(2)}m`);
  console.log(`坐标范围: X(${xMin.toFixed(2)}, ${xMax.toFixed(2)}), Y(${yMin.toFixed(2)}, ${yMax.toFixed(2)})`);
}

// 更新点在UI上的显示位置
const getDisplayPosition = (pixelX, pixelY) => {
  if (!imageInfo.display || !previewImage.value) return { x: 0, y: 0 };
  
  // 确保输入坐标在图片范围内
  const boundedPixelX = Math.max(0, Math.min(imageInfo.width - 1, pixelX || 0));
  const boundedPixelY = Math.max(0, Math.min(imageInfo.height - 1, pixelY || 0));
  
  // 获取图片DOM元素的实际位置和尺寸
  const imgElement = previewImage.value;
  const imgRect = imgElement.getBoundingClientRect();
  const containerRect = imgElement.parentElement.getBoundingClientRect();
  const imgOffsetX = imgRect.left - containerRect.left;
  const imgOffsetY = imgRect.top - containerRect.top;
  
  // 计算坐标相对于原图的比例
  const relativeX = boundedPixelX / imageInfo.width;
  const relativeY = boundedPixelY / imageInfo.height;
  
  // 将比例应用到实际显示图片上
  const displayX = imgOffsetX + (relativeX * imgRect.width);
  const displayY = imgOffsetY + (relativeY * imgRect.height);
  
  return { x: displayX, y: displayY };
}

// 更新比例尺计算
const updateScaleCalculation = () => {
  if (scaleForm.points.length === 2) {
    // 不需要重新计算像素距离，因为点没变，只是实际距离变了
    // 但可以在调试日志中显示当前计算的比例
    const pixelsPerMeter = scaleForm.pixelDistance / scaleForm.realDistance;
    console.log(`比例尺实时计算: 1 m = ${pixelsPerMeter.toFixed(2)} px (实际距离: ${scaleForm.realDistance}m, 像素距离: ${scaleForm.pixelDistance.toFixed(2)}px)`);
  }
}

// 重置比例尺测量
const resetScaleMeasurement = () => {
  // 检查是否处于原点设置模式
  if (isSettingOrigin.value) {
    ElMessage.warning('请先完成或取消原点设置');
    return;
  }
  
  hasCompletedScale.value = false;
  isMeasuring.value = true;
  
  // 清除现有点
  scaleForm.points = [];
  scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  scaleForm.pixelDistance = 0;
  ElMessage.info('请在图片上点击设置测量点，需要设置两个点');
}

// 添加监听器，确保比例尺计算实时更新
watch(
  [
    () => scaleForm.points,
    () => scaleForm.realDistance,
    () => scaleForm.pointInputs
  ],
  () => {
    if (scaleForm.points.length === 2 && scaleForm.realDistance > 0) {
      // 计算像素距离
      scaleForm.pixelDistance = calculatePixelDistance(scaleForm.points[0], scaleForm.points[1]);
      
      // 如果已完成比例尺设置，更新坐标范围
      if (hasCompletedScale.value) {
        updateCoordinateRangeFromScale();
      }
    }
  },
  { deep: true }
);
</script>

<style scoped>
.map-view-container {
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
  padding: 0 20px;
  overflow: hidden;
  margin-bottom: 30px;
}

.map-table-wrapper {
  background: #fff;
  padding: 16px 16px 20px 16px;
  border-radius: 4px;
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.map-table {
  width: 100%;
  flex: 1;
}

.search-bar {
  margin-top: 15px;
}

.action-bar {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.image-container {
  width: 80px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-slot {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  color: #909399;
}

.el-icon {
  font-size: 20px;
}

.text-center {
  text-align: center;
  line-height: 32px;
}

.operation-buttons {
  display: flex;
  flex-direction: column;
  gap: 1px;
  max-width: 130px;
}

.operation-row {
  display: flex;
  width: 100%;
}

.operation-buttons .el-button {
  flex: 1;
  font-size: 10px;
  padding: 3px 1px;
  height: 22px;
  min-width: 0;
}

.current-map-tag {
  margin-left: 4px;
}

/* 响应式布局适配 */
@media screen and (max-width: 768px) {
  .control-panel {
    padding: 0 10px;
    margin: 10px 0;
  }
  
  .main-content {
    padding: 0 10px;
  }
  
  .map-table-wrapper {
    padding: 10px;
  }
  
  .el-form-item {
    margin-bottom: 12px;
  }
}

/* 恢复编辑页面相关样式 */
.scale-calculator {
  margin-bottom: 15px;
}

.scale-input-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.scale-result {
  background-color: #f8f9fa;
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 13px;
  border: 1px solid #e4e7ed;
}

.scale-result p {
  margin: 5px 0;
}

.scale-instruction {
  margin-bottom: 10px;
}

.coordinate-info {
  margin-bottom: 15px;
  font-weight: bold;
  color: #606266;
}

.coordinate-ranges {
  margin-top: 20px;
}

.map-preview-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.map-preview {
  width: 100%;
  height: 700px;
  position: relative;
  border: none;
  border-radius: 0;
  overflow: visible;
  cursor: pointer;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
}

.map-preview-section {
  height: 100%;
  margin-bottom: 0;
  padding: 15px;
  overflow: visible;
}

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.preview-instructions {
  margin-top: 10px;
  text-align: center;
}

.marker {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  position: absolute;
  background-color: #409EFF;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  z-index: 5;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.line-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.point-inputs {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.measure-point-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.measure-point-row span {
  width: 40px;
  display: inline-block;
  line-height: 32px;
}

.no-bottom-margin {
  margin-bottom: 0 !important;
}

.map-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.map-form {
  height: 100%;
  overflow: hidden;
}

.left-panel {
  height: 100%;
  overflow-y: auto;
  padding-right: 10px;
}

.form-section {
  background-color: #f8f9fa;
  border-radius: 4px;
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
}

.form-section h4 {
  margin-top: 10px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.coordinate-inputs {
  display: flex;
  gap: 10px;
}

.half-width {
  flex: 1;
  margin-bottom: 10px;
}

.coordinate-info {
  margin-bottom: 10px;
  font-size: 13px;
  color: #606266;
}

.origin-instruction {
  margin-top: 10px;
}

.origin-instruction p {
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.origin-buttons,
.measure-buttons {
  display: flex;
  gap: 10px;
  margin-top: 5px;
}

.point-inputs {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.point-input-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.point-input-row span {
  margin: 0 2px;
  color: #606266;
}

.map-upload .el-upload__tip {
  line-height: 1.2;
  font-size: 12px;
  margin-top: 5px;
}

.origin-marker {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  position: absolute;
  background-color: #F56C6C;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.size-info {
  line-height: 32px;
  color: #606266;
}

.required-mark {
  color: #f56c6c;
  font-weight: normal;
}
</style>

<style>
/* 确保Element表格内部滚动正常工作 */
.el-table__body-wrapper {
  overflow-x: auto !important;
}

/* 确保表格底部边框显示正常 */
.el-table::before,
.el-table::after {
  display: none;
}

.el-table {
  border-bottom: 1px solid #ebeef5;
}

/* 美化表格内部滚动条 */
.el-table__body-wrapper::-webkit-scrollbar {
  height: 12px !important;
  display: block !important;
}

.el-table__body-wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 6px;
}

.el-table__body-wrapper::-webkit-scrollbar-thumb {
  background: #909399;
  border-radius: 6px;
  border: 2px solid #f1f1f1;
}

.el-table__body-wrapper::-webkit-scrollbar-thumb:hover {
  background: #606266;
}

.el-select {
  width: 100%;
}
</style>