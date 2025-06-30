<template>
  <div class="geofence-view-container">
    <!-- 1. 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>电子围栏管理</h2>
        <!-- 搜索/过滤栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
            <el-form-item label="围栏名称">
              <el-input v-model="searchForm.name" placeholder="请输入围栏名称" clearable />
            </el-form-item>
            <el-form-item label="所属地图">
              <el-select v-model="searchForm.mapId" placeholder="请选择地图" clearable style="width: 200px;">
                <el-option 
                  v-for="map in mapList" 
                  :key="map.id || map.mapId" 
                  :label="map.name" 
                  :value="map.id || map.mapId"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="searchForm.enabled" placeholder="请选择状态" clearable style="width: 120px;">
                <el-option label="启用" :value="true" />
                <el-option label="禁用" :value="false" />
              </el-select>
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
          <el-button type="success" @click="handleEnableAll" :disabled="!multipleSelection.length">
            <el-icon><Check /></el-icon> 批量启用
          </el-button>
          <el-button type="warning" @click="handleDisableAll" :disabled="!multipleSelection.length">
            <el-icon><Close /></el-icon> 批量禁用
          </el-button>
          <el-button type="danger" @click="handleBatchDelete" :disabled="!multipleSelection.length">
            <el-icon><Delete /></el-icon> 批量删除
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
          <el-table-column type="selection" width="40" fixed="left" />
          <el-table-column prop="name" label="围栏名称" min-width="150" show-overflow-tooltip sortable="custom" fixed="left" />
          <el-table-column label="状态" width="80" align="center" sortable="custom" prop="enabled" fixed="left">
            <template #default="scope">
              <el-tag v-if="scope.row.enabled" type="success">启用</el-tag>
              <el-tag v-else type="danger">禁用</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="mapName" label="所属地图" min-width="120" show-overflow-tooltip sortable="custom" />
          <el-table-column label="坐标点数量" width="110" align="center">
            <template #default="scope">
              <span v-if="scope.row.points && scope.row.points.length">
                {{ scope.row.points.length }} 个点
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" min-width="160" show-overflow-tooltip sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" width="180">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button-group class="operation-row">
                  <el-button type="default" size="small" @click="handleToggleEnabled(scope.row)">
                    {{ scope.row.enabled ? '禁用' : '启用' }}
                  </el-button>
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


  </div>

  <!-- 添加/编辑对话框 -->
  <el-dialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '添加围栏' : '编辑围栏'"
    width="95%"
    @close="resetForm"
    :destroy-on-close="true"
    class="geofence-dialog"
  >
    <el-form
      ref="geofenceFormRef"
      :model="geofenceForm"
      :rules="formRules"
      label-width="80px"
      label-position="left"
      :hide-required-asterisk="true"
      class="geofence-form"
    >
      <el-row :gutter="20">
        <el-col :span="8">
          <div class="left-panel">
            <!-- 基本信息 -->
            <div class="form-section">
              <h3>基本信息</h3>
              <el-form-item prop="name">
                <template #label>
                  围栏名称 <span class="required-mark-right">*</span>
                </template>
                <el-input v-model="geofenceForm.name" placeholder="请输入围栏名称" />
              </el-form-item>
              <el-form-item prop="mapId">
                <template #label>
                  所属地图 <span class="required-mark-right">*</span>
                </template>
                <el-select v-model="geofenceForm.mapId" placeholder="请选择地图" style="width: 100%;">
                  <el-option 
                    v-for="map in mapList" 
                    :key="map.id || map.mapId" 
                    :label="map.name" 
                    :value="map.id || map.mapId"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="是否启用">
                <el-switch v-model="geofenceForm.enabled" />
              </el-form-item>
              <el-form-item label="备注">
                <el-input 
                  v-model="geofenceForm.remark" 
                  type="textarea" 
                  :rows="3"
                  placeholder="请输入备注信息"
                />
              </el-form-item>
            </div>
            
            <!-- 围栏点设置 -->
            <div class="form-section">
              <h3>围栏点设置 <span class="required-mark">*</span></h3>
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="setPointMode" v-if="!isSettingPoints" :disabled="!selectedMapImageUrl">
                  点击设置围栏点
                </el-button>
                <template v-if="isSettingPoints">
                  <el-button size="small" type="success" @click="completePointSetting" :disabled="geofenceForm.points.length < 3">
                    完成设置
                  </el-button>
                  <el-button size="small" @click="cancelPointSetting">
                    重新设置
                  </el-button>
                </template>
              </div>
              <div class="points-list" v-if="geofenceForm.points.length > 0">
                <div class="point-count">已设置 {{ geofenceForm.points.length }} 个点</div>
                <div class="point-item" v-for="(point, index) in geofenceForm.points" :key="index">
                  <span>点{{ index + 1 }}: ({{ point.x }}, {{ point.y }})</span>
                  <el-button size="small" type="danger" link @click="removePoint(index)" v-if="isSettingPoints">
                    删除
                  </el-button>
                </div>
              </div>
              <div class="tip-text" v-if="isSettingPoints">
                提示: 点击地图设置围栏点，至少需要3个点形成围栏
              </div>
              <div class="tip-text tip-warning" v-if="isSettingPoints">
                <el-icon><WarningFilled /></el-icon>
                注意: 请完成围栏点设置后才能保存围栏
              </div>
            </div>
          </div>
        </el-col>
        
        <el-col :span="16">
          <!-- 地图预览 -->
          <div class="form-section map-preview-section">
            <h3>地图预览</h3>
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
                  <p>请选择地图</p>
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
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading" :disabled="isSettingPoints">
          {{ dialogType === 'add' ? '添加' : '更新' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete, Check, Close, Picture, WarningFilled } from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const loading = ref(false)
const geofenceList = ref([])
const mapList = ref([])
const multipleSelection = ref([])

// 搜索表单
const searchForm = reactive({
  name: '',
  mapId: null,
  enabled: null
})

// 排序
const sortConfig = ref({
  prop: '',
  order: ''
})

// 对话框相关
const dialogVisible = ref(false)
const dialogType = ref('add') // 'add' or 'edit'
const submitLoading = ref(false)
const previewLoading = ref(false)
const isSettingPoints = ref(false)

// 表单引用
const geofenceFormRef = ref(null)

// 围栏表单
const geofenceForm = reactive({
  id: null,
  name: '',
  mapId: null,
  enabled: true,
  remark: '',
  points: []
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入围栏名称', trigger: 'blur' }
  ],
  mapId: [
    { required: true, message: '请选择所属地图', trigger: 'change' }
  ]
}

// 地图预览相关
const previewContainer = ref(null)
const previewImage = ref(null)
const selectedMapImageUrl = ref('')
const imageInfo = reactive({
  width: 0,
  height: 0,
  display: null
})

// 计算属性 - 过滤后的围栏列表
const filteredGeofenceList = computed(() => {
  let list = [...geofenceList.value]
  
  // 应用排序
  if (sortConfig.value.prop) {
    list.sort((a, b) => {
      const aVal = a[sortConfig.value.prop]
      const bVal = b[sortConfig.value.prop]
      
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      
      let result = 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        result = aVal.localeCompare(bVal)
      } else {
        result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      }
      
      return sortConfig.value.order === 'ascending' ? result : -result
    })
  }
  
  return list
})

// 方法
const fetchGeofences = async () => {
  loading.value = true
  try {
    const params = {}
    if (searchForm.name) params.name = searchForm.name
    if (searchForm.mapId) params.mapId = searchForm.mapId
    if (searchForm.enabled !== null) params.enabled = searchForm.enabled
    
    const response = await axios.get('/api/geofences', { params })
    if (response.data.success) {
      const geofences = response.data.data || []
      
      // 为每个围栏添加 mapName 字段
      geofences.forEach(geofence => {
        if (geofence.mapId) {
          const map = mapList.value.find(m => (m.id || m.mapId) === geofence.mapId)
          geofence.mapName = map ? map.name : '未知地图'
        } else {
          geofence.mapName = '-'
        }
      })
      
      geofenceList.value = geofences
      console.log('围栏列表获取成功:', geofenceList.value)
    } else {
      ElMessage.error(response.data.message || '获取围栏列表失败')
    }
  } catch (error) {
    console.error('获取围栏列表错误:', error)
    ElMessage.error('获取围栏列表失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

const fetchMaps = async () => {
  try {
    const response = await axios.get('/api/maps')
    // 兼容多种数据结构
    if (Array.isArray(response.data)) {
      mapList.value = response.data
    } else if (response.data && Array.isArray(response.data.content)) {
      mapList.value = response.data.content
    } else if (response.data && response.data.success && response.data.data) {
      mapList.value = Array.isArray(response.data.data) ? response.data.data : []
    } else {
      mapList.value = []
    }
    console.log('地图列表获取成功:', mapList.value)
  } catch (error) {
    console.error('获取地图列表错误:', error)
    ElMessage.error('获取地图列表失败')
    mapList.value = []
  }
}

const handleSearch = () => {
  fetchGeofences()
}

const handleResetSearch = () => {
  searchForm.name = ''
  searchForm.mapId = null
  searchForm.enabled = null
  fetchGeofences()
}

const handleAdd = () => {
  dialogType.value = 'add'
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogType.value = 'edit'
  resetForm()
  
  // 填充表单数据
  geofenceForm.id = row.id
  geofenceForm.name = row.name
  geofenceForm.mapId = row.mapId
  geofenceForm.enabled = row.enabled
  geofenceForm.remark = row.remark || ''
  geofenceForm.points = row.points ? JSON.parse(JSON.stringify(row.points)) : []
  
  // 设置地图预览
  if (row.mapId) {
    updateMapPreview(row.mapId)
  }
  
  dialogVisible.value = true
}

const handleToggleEnabled = async (row) => {
  const action = row.enabled ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定要${action}围栏"${row.name}"吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await axios.patch(
      `/api/geofences/${row.id}/toggle?enabled=${!row.enabled}`
    )
    
    if (response.data.success) {
      ElMessage.success(`${action}成功`)
      fetchGeofences()
    } else {
      ElMessage.error(response.data.message || `${action}失败`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error(`${action}围栏错误:`, error)
      ElMessage.error(`${action}失败: ` + (error.response?.data?.message || error.message))
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除围栏"${row.name}"吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await axios.delete(`/api/geofences/${row.id}`)
    if (response.data.success) {
      ElMessage.success('删除成功')
      fetchGeofences()
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除围栏错误:', error)
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

const handleSelectionChange = (selection) => {
  multipleSelection.value = selection
}

const handleEnableAll = async () => {
  if (multipleSelection.value.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定要启用选中的 ${multipleSelection.value.length} 个围栏吗？`,
      '确认批量启用',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const promises = multipleSelection.value.map(item => 
      axios.patch(`/api/geofences/${item.id}/toggle?enabled=true`)
    )
    
    await Promise.all(promises)
    ElMessage.success('批量启用成功')
    fetchGeofences()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量启用错误:', error)
      ElMessage.error('批量启用失败')
    }
  }
}

const handleDisableAll = async () => {
  if (multipleSelection.value.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定要禁用选中的 ${multipleSelection.value.length} 个围栏吗？`,
      '确认批量禁用',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const promises = multipleSelection.value.map(item => 
      axios.patch(`/api/geofences/${item.id}/toggle?enabled=false`)
    )
    
    await Promise.all(promises)
    ElMessage.success('批量禁用成功')
    fetchGeofences()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量禁用错误:', error)
      ElMessage.error('批量禁用失败')
    }
  }
}

const handleBatchDelete = async () => {
  if (multipleSelection.value.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${multipleSelection.value.length} 个围栏吗？此操作不可恢复！`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const ids = multipleSelection.value.map(item => item.id)
    const response = await axios.delete('/api/geofences/batch', { data: ids })
    
    if (response.data.success) {
      ElMessage.success('批量删除成功')
      fetchGeofences()
    } else {
      ElMessage.error(response.data.message || '批量删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除错误:', error)
      ElMessage.error('批量删除失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

const handleSortChange = ({ prop, order }) => {
  sortConfig.value.prop = prop
  sortConfig.value.order = order
}

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

// === 对话框相关方法 ===

// 重置表单
const resetForm = () => {
  geofenceForm.id = null
  geofenceForm.name = ''
  geofenceForm.mapId = null
  geofenceForm.enabled = true
  geofenceForm.remark = ''
  geofenceForm.points = []
  
  selectedMapImageUrl.value = ''
  imageInfo.width = 0
  imageInfo.height = 0
  imageInfo.display = null
  
  isSettingPoints.value = false
  
  if (geofenceFormRef.value) {
    geofenceFormRef.value.clearValidate()
  }
}

// 获取地图图片URL
const getMapImageUrl = (mapId) => {
  try {
    if (!mapId) return ''
    return `/api/maps/${mapId}/image?t=${Date.now()}`
  } catch (error) {
    console.error('生成图片URL时出错:', error)
    return ''
  }
}

// 更新地图预览
const updateMapPreview = (mapId) => {
  if (!mapId) {
    selectedMapImageUrl.value = ''
    return
  }
  selectedMapImageUrl.value = getMapImageUrl(mapId)
}

// 监听地图选择变化
watch(() => geofenceForm.mapId, (newMapId) => {
  updateMapPreview(newMapId)
  // 切换地图时清除已设置的点
  if (isSettingPoints.value) {
    geofenceForm.points = []
  }
})

// 处理地图预览图片加载
const handlePreviewImageLoad = (event) => {
  const img = event.target
  imageInfo.width = img.naturalWidth
  imageInfo.height = img.naturalHeight
  
  previewLoading.value = false
  
  calculateImageDimensions()
}

// 计算图片在预览区域中的实际尺寸和位置
const calculateImageDimensions = () => {
  if (!previewImage.value || !imageInfo.width || !imageInfo.height) return
  
  const container = previewImage.value.parentElement
  if (!container) return
  
  // 移除固定内边距，使用容器的实际尺寸
  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight
  
  const imgRatio = imageInfo.width / imageInfo.height
  const containerRatio = containerWidth / containerHeight
  
  let displayWidth, displayHeight
  let offsetX = 0, offsetY = 0
  
  if (imgRatio > containerRatio) {
    // 图片更宽，以容器宽度为基准
    displayWidth = containerWidth
    displayHeight = containerWidth / imgRatio
    offsetY = (containerHeight - displayHeight) / 2
  } else {
    // 图片更高，以容器高度为基准
    displayHeight = containerHeight
    displayWidth = containerHeight * imgRatio
    offsetX = (containerWidth - displayWidth) / 2
  }
  
  // 更新图片显示信息
  imageInfo.display = {
    width: displayWidth,
    height: displayHeight,
    offsetX: offsetX,
    offsetY: offsetY,
    scaleX: imageInfo.width / displayWidth,
    scaleY: imageInfo.height / displayHeight
  }
  
  console.log('图片显示信息:', {
    原始尺寸: `${imageInfo.width} x ${imageInfo.height}`,
    显示尺寸: `${displayWidth.toFixed(2)} x ${displayHeight.toFixed(2)}`,
    缩放比例: `${imageInfo.display.scaleX.toFixed(4)} x ${imageInfo.display.scaleY.toFixed(4)}`,
    偏移量: `${offsetX.toFixed(2)} x ${offsetY.toFixed(2)}`
  })
}

// 设置围栏点模式
const setPointMode = () => {
  if (!selectedMapImageUrl.value) {
    ElMessage.warning('请先选择地图')
    return
  }
  
  geofenceForm.points = []
  isSettingPoints.value = true
  ElMessage.info('请在地图上点击设置围栏点，至少需要3个点')
}

// 完成围栏点设置
const completePointSetting = () => {
  if (geofenceForm.points.length < 3) {
    ElMessage.warning('至少需要3个点才能形成围栏')
    return
  }
  
  isSettingPoints.value = false
  ElMessage.success(`围栏点设置完成，共${geofenceForm.points.length}个点`)
}

// 取消围栏点设置
const cancelPointSetting = () => {
  geofenceForm.points = []
  isSettingPoints.value = false
  ElMessage.info('已清除所有围栏点')
}

// 删除围栏点
const removePoint = (index) => {
  geofenceForm.points.splice(index, 1)
  ElMessage.info(`已删除第${index + 1}个点`)
}

// 处理地图点击
const handleMapClick = (event) => {
  if (!previewImage.value || !imageInfo.display || !selectedMapImageUrl.value || !isSettingPoints.value) {
    return
  }
  
  // 获取点击相对于容器的坐标
  const rect = event.currentTarget.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const clickY = event.clientY - rect.top
  
  // 获取图片的实际位置和尺寸（DOM元素尺寸）
  const imgElement = previewImage.value
  const imgRect = imgElement.getBoundingClientRect()
  const imgOffsetX = imgRect.left - rect.left
  const imgOffsetY = imgRect.top - rect.top
  const imgDisplayWidth = imgRect.width
  const imgDisplayHeight = imgRect.height
  
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
    })
    return
  }
  
  // 计算点击位置相对于图片的比例
  const relativeX = (clickX - imgOffsetX) / imgDisplayWidth
  const relativeY = (clickY - imgOffsetY) / imgDisplayHeight
  
  // 转换为图片上的实际像素坐标
  const imageX = Math.round(relativeX * imageInfo.width)
  const imageY = Math.round(relativeY * imageInfo.height)
  
  // 确保坐标在图片范围内
  const boundedImageX = Math.max(0, Math.min(imageInfo.width - 1, imageX))
  const boundedImageY = Math.max(0, Math.min(imageInfo.height - 1, imageY))
  
  console.log('点击位置:', { 
    显示坐标: { x: clickX, y: clickY }, 
    图片位置: { x: imgOffsetX, y: imgOffsetY },
    相对比例: { x: relativeX.toFixed(4), y: relativeY.toFixed(4) },
    转换后图片坐标: { x: boundedImageX, y: boundedImageY }
  })
  
  // 添加围栏点
  geofenceForm.points.push({ x: boundedImageX, y: boundedImageY })
  
  ElMessage.info(`已添加第${geofenceForm.points.length}个围栏点 (${boundedImageX}, ${boundedImageY})`)
}

// 获取显示位置（图片坐标转换为显示坐标）
const getDisplayPosition = (pixelX, pixelY) => {
  if (!imageInfo.display || !previewImage.value) return { x: 0, y: 0 }
  
  // 确保输入坐标在图片范围内
  const boundedPixelX = Math.max(0, Math.min(imageInfo.width - 1, pixelX || 0))
  const boundedPixelY = Math.max(0, Math.min(imageInfo.height - 1, pixelY || 0))
  
  // 获取图片DOM元素的实际位置和尺寸
  const imgElement = previewImage.value
  const imgRect = imgElement.getBoundingClientRect()
  const containerRect = imgElement.parentElement.getBoundingClientRect()
  const imgOffsetX = imgRect.left - containerRect.left
  const imgOffsetY = imgRect.top - containerRect.top
  
  // 计算坐标相对于原图的比例
  const relativeX = boundedPixelX / imageInfo.width
  const relativeY = boundedPixelY / imageInfo.height
  
  // 将比例应用到实际显示图片上
  const displayX = imgOffsetX + (relativeX * imgRect.width)
  const displayY = imgOffsetY + (relativeY * imgRect.height)
  
  return { x: displayX, y: displayY }
}

// 获取多边形点字符串
const getPolygonPoints = () => {
  return geofenceForm.points.map(point => {
    const pos = getDisplayPosition(point.x, point.y)
    return `${pos.x},${pos.y}`
  }).join(' ')
}

// 提交表单
const handleSubmit = async () => {
  if (!geofenceFormRef.value) return
  
  try {
    // 检查是否处于设置点模式
    if (isSettingPoints.value) {
      ElMessage.warning('请先点击"完成设置"按钮完成围栏点设置')
      return
    }
    
    await geofenceFormRef.value.validate()
    
    if (geofenceForm.points.length < 3) {
      ElMessage.warning('请设置至少3个围栏点')
      return
    }
    
    submitLoading.value = true
    
    const formData = {
      name: geofenceForm.name,
      mapId: geofenceForm.mapId,
      enabled: geofenceForm.enabled,
      remark: geofenceForm.remark,
      points: geofenceForm.points
    }
    
    let response
    if (dialogType.value === 'add') {
      response = await axios.post('/api/geofences', formData)
    } else {
      response = await axios.put(`/api/geofences/${geofenceForm.id}`, formData)
    }
    
    if (response.data.success) {
      ElMessage.success(`${dialogType.value === 'add' ? '添加' : '更新'}成功`)
      dialogVisible.value = false
      fetchGeofences()
    } else {
      ElMessage.error(response.data.message || `${dialogType.value === 'add' ? '添加' : '更新'}失败`)
    }
  } catch (error) {
    console.error('提交表单错误:', error)
    ElMessage.error(`${dialogType.value === 'add' ? '添加' : '更新'}失败: ` + (error.response?.data?.message || error.message))
  } finally {
    submitLoading.value = false
  }
}

// 生命周期
onMounted(async () => {
  await fetchMaps()  // 先获取地图数据
  fetchGeofences()   // 再获取围栏数据
  
  // 窗口大小变化时重新计算
  window.addEventListener('resize', calculateImageDimensions)
})

// 组件卸载时移除事件监听
onBeforeUnmount(() => {
  window.removeEventListener('resize', calculateImageDimensions)
})
</script>

<style scoped>
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

.action-bar {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.operation-buttons {
  display: flex;
  flex-direction: column;
  gap: 1px;
  max-width: 170px;
}

.operation-row {
  display: flex;
  width: 100%;
}

.operation-buttons .el-button {
  flex: 1;
  font-size: 12px;
  padding: 4px 8px;
  height: 28px;
  min-width: 0;
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

/* 对话框样式 */
.geofence-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.geofence-form {
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

.required-mark {
  color: #f56c6c;
  margin-left: 4px;
}

.required-mark-right {
  color: #f56c6c;
  margin-left: 4px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
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
}

.point-item:last-child {
  border-bottom: none;
}

.tip-text {
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 8px;
  border-radius: 4px;
}

.tip-warning {
  color: #e6a23c;
  background-color: #fdf6ec;
  border-left: 3px solid #e6a23c;
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
}

.map-preview-section {
  height: 100%;
  margin-bottom: 0;
  padding: 15px;
  overflow: visible;
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

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
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

.geofence-marker {
  background-color: #409EFF;
  border: 2px solid #fff;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.polygon-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

.dialog-footer {
  text-align: right;
}
</style>