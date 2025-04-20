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
      <div class="map-table">
        <el-table 
          :data="mapList" 
          style="width: 100%" 
          @selection-change="handleSelectionChange"
          v-loading="loading"
          height="calc(100vh - 280px)"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column label="序号" width="80" align="center">
            <template #default="scope">
              {{ scope.$index + 1 }}
            </template>
          </el-table-column>
          <el-table-column prop="mapId" label="地图ID" width="80" show-overflow-tooltip />
          <el-table-column prop="name" label="地图名称" width="120" show-overflow-tooltip />
          <el-table-column label="坐标范围" min-width="60" show-overflow-tooltip>
            <template #default="scope">
              <div>
                X: {{ scope.row.xmin }} ~ {{ scope.row.xmax }}
              </div>
              <div>
                Y: {{ scope.row.ymin }} ~ {{ scope.row.ymax }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="地图图片" width="120">
            <template #default="scope">
              <div v-if="scope.row.id" class="image-container">
                <el-image 
                  style="width: 80px; height: 60px"
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
          <el-table-column prop="createTime" label="创建时间" width="180" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" min-width="200">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button link type="primary" size="small" @click="handleEdit(scope.row)">
                  <el-icon><Edit /></el-icon> 修改
                </el-button>
                <el-button link type="danger" size="small" @click="handleDelete(scope.row)" :disabled="scope.row.id === currentMapId">
                  <el-icon><Delete /></el-icon> 删除
                </el-button>
                <el-tag v-if="scope.row.id === currentMapId" type="success" effect="plain" size="small" class="current-map-tag">
                  当前地图
                </el-tag>
              </div>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 删除分页容器和组件 -->
      </div>
    </div>

    <!-- 添加/编辑对话框 (保持不变) -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加地图' : '编辑地图'"
      width="500px"
      @close="resetForm"
    >
      <el-form
        ref="mapFormRef"
        :model="mapForm"
        :rules="rules"
        label-width="100px"
      >
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
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                只能上传 jpg/png 文件，编辑时如需更换请重新上传
              </div>
            </template>
          </el-upload>
        </el-form-item>
        
        <el-form-item label="X轴范围(m)">
          <el-col :span="11">
            <el-form-item prop="xMin">
              <el-input-number v-model="mapForm.xMin" :precision="2" :step="0.1" placeholder="最小值" controls-position="right" style="width: 100%;"/>
            </el-form-item>
          </el-col>
          <el-col :span="2" class="text-center">~</el-col>
          <el-col :span="11">
            <el-form-item prop="xMax">
              <el-input-number v-model="mapForm.xMax" :precision="2" :step="0.1" placeholder="最大值" controls-position="right" style="width: 100%;"/>
            </el-form-item>
          </el-col>
        </el-form-item>
        
        <el-form-item label="Y轴范围(m)">
          <el-col :span="11">
            <el-form-item prop="yMin">
              <el-input-number v-model="mapForm.yMin" :precision="2" :step="0.1" placeholder="最小值" controls-position="right" style="width: 100%;"/>
            </el-form-item>
          </el-col>
          <el-col :span="2" class="text-center">~</el-col>
          <el-col :span="11">
            <el-form-item prop="yMax">
              <el-input-number v-model="mapForm.yMax" :precision="2" :step="0.1" placeholder="最大值" controls-position="right" style="width: 100%;"/>
            </el-form-item>
          </el-col>
        </el-form-item>
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete, Edit, Setting, Picture } from '@element-plus/icons-vue' // 引入 Picture 图标
import axios from 'axios'

// 删除默认地图导入
// import defaultMap from '../assets/default-map.jpg'

const mapStore = useMapStore() // 移到顶部，保持一致性
const mapList = ref([])
const loading = ref(false) // 添加 loading 状态
const dialogVisible = ref(false)
const dialogType = ref('add')
const mapFormRef = ref(null)
const uploadRef = ref(null) // 添加 uploadRef

// 搜索表单
const searchForm = reactive({
  mapName: ''
})

// 分页数据
// const pagination = reactive({
//   currentPage: 1,
//   pageSize: 10,
//   total: 0
// })

// 表格多选
const multipleSelection = ref([])

// 添加/编辑表单
const mapForm = reactive({
  id: null,
  mapId: '', // 添加 mapId 字段
  name: '',
  file: null,
  xMin: -6,
  xMax: 6,
  yMin: -2,
  yMax: 10
})

// 表单校验规则
const rules = {
  mapId: [
    { required: true, message: '请输入地图ID', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]+$/, message: '地图ID只能包含字母、数字、下划线和横线', trigger: 'blur' }
  ],
  name: [{ required: true, message: '请输入地图名称', trigger: 'blur' }],
  // file: [{ required: true, message: '请上传地图文件', trigger: 'change' }], // 移除文件必填，在提交时判断
  xMin: [{ required: true, message: '请输入X轴最小值', trigger: 'blur' }],
  xMax: [
      { required: true, message: '请输入X轴最大值', trigger: 'blur' },
      { validator: (rule, value, callback) => {
          if (value <= mapForm.xMin) {
            callback(new Error('X轴最大值必须大于最小值'))
          } else {
            callback()
          }
        }, trigger: 'blur' }
  ],
  yMin: [{ required: true, message: '请输入Y轴最小值', trigger: 'blur' }],
  yMax: [
      { required: true, message: '请输入Y轴最大值', trigger: 'blur' },
      { validator: (rule, value, callback) => {
          if (value <= mapForm.yMin) {
            callback(new Error('Y轴最大值必须大于最小值'))
          } else {
            callback()
          }
        }, trigger: 'blur' }
  ],
}

// --- 方法 ---

// 获取地图图片 URL
const getMapImageUrl = (mapId) => {
  try {
    if (!mapId) return '';
    return `/api/maps/${mapId}/image?t=${Date.now()}`; // 使用 Date.now() 替代 new Date().getTime()
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
    
    // 只有当搜索关键词存在且不为空时才添加到查询参数中
    if (searchForm.mapName && searchForm.mapName.trim()) {
      params.name = searchForm.mapName.trim()
    }
    
    const response = await axios.get('/api/maps', { params })
    // 确保返回的数据结构正确
    if (response.data && response.data.content) {
      mapList.value = response.data.content
    } else {
      // 兼容旧格式
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
       console.warn('获取当前地图失败:', error) // 使用 warn 级别
       // 如果没有当前地图，并且列表不为空，尝试设置第一个为当前
       if (!currentMapId.value && mapList.value.length > 0) {
           const firstMapId = mapList.value[0].id;
           console.log(`当前地图未设置，尝试设置第一个地图 (ID: ${firstMapId}) 为当前地图`);
           // 暂时不自动设置，避免潜在问题，让用户手动设置
           // try {
           //     await axios.put(`/api/maps/current/${firstMapId}`);
           //     currentMapId.value = firstMapId;
           // } catch (setError) {
           //     console.error(`尝试设置第一个地图 (ID: ${firstMapId}) 为当前地图失败:`, setError);
           //     currentMapId.value = null; // 确保失败时为 null
           // }
           currentMapId.value = null; // 获取失败或无当前地图，则设为 null
       } else if (!currentMapId.value) {
           currentMapId.value = null; // 列表为空，也设为 null
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

// 分页大小变化
const handleSizeChange = (val) => {
  pagination.pageSize = val
  pagination.currentPage = 1 // 切换每页大小时回到第一页
  fetchMapList() 
}

// 分页页码变化
const handleCurrentChange = (val) => {
  pagination.currentPage = val
  fetchMapList()
}

// 重置表单
const resetForm = () => {
  if (mapFormRef.value) {
    mapFormRef.value.resetFields()
  }
  mapForm.id = null
  mapForm.mapId = ''  // 重置 mapId
  mapForm.file = null
  mapForm.name = ''
  mapForm.xMin = -6
  mapForm.xMax = 6
  mapForm.yMin = -2
  mapForm.yMax = 10
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}


const handleFileChange = (file, fileList) => {
  if (fileList.length > 1) {
    fileList.splice(0, fileList.length - 1); 
  }
  const isLt2M = file.size / 1024 / 1024 < 2; 
  if (!['image/jpeg', 'image/png'].includes(file.raw.type)) {
    ElMessage.error('上传地图图片只能是 JPG/PNG 格式!');
    uploadRef.value?.clearFiles(); 
    mapForm.file = null;
    return false;
  }
  if (!isLt2M) {
    ElMessage.error('上传地图图片大小不能超过 2MB!');
     uploadRef.value?.clearFiles(); 
     mapForm.file = null;
    return false;
  }
  mapForm.file = file.raw 
}

// 处理文件移除
const handleFileRemove = () => {
  mapForm.file = null
}

// 处理文件超出限制
const handleExceed = () => {
  ElMessage.warning('只能选择一个地图文件，请先移除当前文件再选择新的文件')
}


const handleAdd = () => {
  resetForm() // 使用 resetForm 统一重置逻辑
  dialogType.value = 'add'
  dialogVisible.value = true
}

const handleEdit = (row) => {
  resetForm() // 先重置
  dialogType.value = 'edit'
  // 填充表单数据
  mapForm.id = row.id
  mapForm.mapId = row.mapId  // 添加 mapId
  mapForm.name = row.name
  mapForm.xMin = row.xmin
  mapForm.xMax = row.xmax
  mapForm.yMin = row.ymin
  mapForm.yMax = row.ymax
  mapForm.file = null
  dialogVisible.value = true
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

const handleDelete = (row) => {
  // ... (代码无变化)
   if (row.id === currentMapId.value) {
     ElMessage.warning('不能删除当前正在使用的地图')
     return
   }
  ElMessageBox.confirm(`确定要删除地图 "${row.name}" 吗？`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await axios.delete(`/api/maps/${row.id}`)
      ElMessage.success('删除成功')
      fetchMapList() // 重新获取列表和当前地图状态
    } catch (error) {
      console.error('删除失败:', error) // 添加日志
      ElMessage.error('删除失败')
    }
  }).catch(() => {
    // User cancelled
  })
}

// 批量删除
const handleBatchDelete = () => {
  if (!multipleSelection.value.length) {
    ElMessage.warning('请选择要删除的地图')
    return
  }

  // 检查是否包含当前使用的地图
  if (multipleSelection.value.some(item => item.id === currentMapId.value)) {
    ElMessage.warning('不能删除当前正在使用的地图')
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
      handleSearch() // 刷新列表
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
    
    const formData = new FormData()
    formData.append('mapId', mapForm.mapId)  // 添加 mapId
    formData.append('name', mapForm.name)
    formData.append('xMin', mapForm.xMin)
    formData.append('xMax', mapForm.xMax)
    formData.append('yMin', mapForm.yMin)
    formData.append('yMax', mapForm.yMax)
    
    if (dialogType.value === 'add') {
      if (!mapForm.file) {
        ElMessage.error('请选择要上传的地图文件')
        return
      }
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

// 添加当前地图选择相关的数据
const currentMapId = ref(null)

// 修改获取地图列表的方法 (已在顶部定义)

// 修改 currentMap 计算属性 (移除)
// const currentMap = computed(() => { ... })

// 修改切换当前地图的方法 (重命名为 handleSetCurrent)
// const handleMapChange = async (mapId) => { ... }

// 设置为当前地图
const handleSetCurrent = async (row) => {
  try {
    await axios.put(`/api/maps/current/${row.id}`)
    // 更新 Pinia store 中的数据 (如果其他地方需要)
    // await mapStore.fetchCurrentMap() 
    currentMapId.value = row.id // 直接更新本地状态以反映UI变化
    ElMessage.success(`已将 "${row.name}" 设置为当前地图`)
    // 可选：如果表格行内状态需要更新，可以局部更新或调用 fetchMapList 刷新
    // fetchMapList(); // 如果需要刷新整个列表状态
  } catch (error) {
    console.error('设置当前地图失败:', error)
    ElMessage.error('设置当前地图失败')
  }
}


// 页面加载时获取地图列表
onMounted(() => {
    fetchMapList()
})

// 移除调试信息和图片加载处理函数
// const debugInfo = reactive({ ... })
// const handleImageLoad = () => { ... }
// const handleImageError = (e) => { ... }
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
  margin: 20px 0;
  display: flex;
}

.control-wrapper {
  border-radius: 4px;
  padding: 16px;
  background-color: #fff;
  flex: 1;
}

.main-content {
  flex: 1;
  padding: 0 20px;
  overflow: hidden;
}

.map-table {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}

/* 删除分页容器样式 */
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.search-bar {
  margin-bottom: 16px;
}

.action-bar {
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

/* 移除表格滚动条样式 */
.el-table {
  --el-table-border-color: transparent;
  overflow-x: hidden;
}

.el-table__body-wrapper {
  overflow-x: hidden !important;
}

.operation-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-map-tag {
  margin-left: 4px;
}
</style>