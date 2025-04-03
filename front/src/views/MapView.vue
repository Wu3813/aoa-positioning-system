<template>
  <div class="map-container">
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>地图管理</h2>
        <div class="control-content">
          <div class="control-buttons">
            <el-button type="primary" @click="handleAdd">添加地图</el-button>
            <div class="map-select">
              <span>当前地图：</span>
              <el-select v-model="currentMapId" placeholder="请选择地图" @change="handleMapChange">
                <el-option
                  v-for="map in mapList"
                  :key="map.id"
                  :label="map.name"
                  :value="map.id"
                />
              </el-select>
            </div>
          </div>
          <!-- 添加地图预览 -->
          <div class="map-preview" v-if="currentMapId">
            <div class="preview-title">当前地图预览：</div>
            <div class="preview-content">
              <img 
                :src="currentMapUrl" 
                alt="地图预览" 
                class="preview-image"
                @error="handleImageError"
                @load="handleImageLoad"
              />
              <!-- 添加测试信息显示 -->
              <div class="debug-info" v-if="debugInfo">
                <p>图片URL: {{ currentMapUrl }}</p>
                <p>加载状态: {{ debugInfo.loadStatus }}</p>
                <p>错误信息: {{ debugInfo.error || '无' }}</p>
              </div>
              <div class="preview-info">
                <p>名称：{{ currentMap?.name }}</p>
                <p>范围：X: {{ currentMap?.xmin }}m ~ {{ currentMap?.xmax }}m, Y: {{ currentMap?.ymin }}m ~ {{ currentMap?.ymax }}m</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="map-table">
        <el-table :data="mapList" style="width: 100%">
          <el-table-column prop="name" label="地图名称" width="180" />
          <el-table-column label="范围" width="300">
            <template #default="scope">
              X: {{ scope.row.xmin }}m ~ {{ scope.row.xmax }}m,
              Y: {{ scope.row.ymin }}m ~ {{ scope.row.ymax }}m
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180" />
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.id === currentMapId ? 'success' : 'info'">
                {{ scope.row.id === currentMapId ? '使用中' : '未使用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作">
            <template #default="scope">
              <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
              <el-button 
                size="small" 
                type="danger" 
                @click="handleDelete(scope.row)"
                :disabled="scope.row.id === currentMapId"
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 添加对话框部分 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加地图' : '编辑地图'"
      width="500px"
    >
      <el-form
        ref="mapFormRef"
        :model="mapForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="地图名称" prop="name">
          <el-input v-model="mapForm.name" placeholder="请输入地图名称" />
        </el-form-item>
        
        <el-form-item label="地图文件" prop="file">
          <el-upload
            class="map-upload"
            action="#"
            :auto-upload="false"
            :show-file-list="true"
            :on-change="handleFileChange"
            accept=".jpg,.jpeg,.png"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                只能上传 jpg/png 文件
              </div>
            </template>
          </el-upload>
        </el-form-item>
        
        <el-form-item label="X轴范围">
          <el-col :span="11">
            <el-form-item prop="xMin">
              <el-input-number v-model="mapForm.xMin" :precision="1" :step="0.5" placeholder="最小值" />
            </el-form-item>
          </el-col>
          <el-col :span="2" class="text-center">~</el-col>
          <el-col :span="11">
            <el-form-item prop="xMax">
              <el-input-number v-model="mapForm.xMax" :precision="1" :step="0.5" placeholder="最大值" />
            </el-form-item>
          </el-col>
        </el-form-item>
        
        <el-form-item label="Y轴范围">
          <el-col :span="11">
            <el-form-item prop="yMin">
              <el-input-number v-model="mapForm.yMin" :precision="1" :step="0.5" placeholder="最小值" />
            </el-form-item>
          </el-col>
          <el-col :span="2" class="text-center">~</el-col>
          <el-col :span="11">
            <el-form-item prop="yMax">
              <el-input-number v-model="mapForm.yMax" :precision="1" :step="0.5" placeholder="最大值" />
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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 删除默认地图导入
// import defaultMap from '../assets/default-map.jpg'

const mapList = ref([])
const dialogVisible = ref(false)
const dialogType = ref('add')
const mapFormRef = ref(null)

const mapForm = reactive({
  name: '',
  file: null,
  xMin: -6,
  xMax: 6,
  yMin: -2,
  yMax: 10
})

const rules = {
  name: [{ required: true, message: '请输入地图名称', trigger: 'blur' }],
  file: [{ required: true, message: '请上传地图文件', trigger: 'change' }],
  xMin: [{ required: true, message: '请输入X轴最小值', trigger: 'blur' }],
  xMax: [{ required: true, message: '请输入X轴最大值', trigger: 'blur' }],
  yMin: [{ required: true, message: '请输入Y轴最小值', trigger: 'blur' }],
  yMax: [{ required: true, message: '请输入Y轴最大值', trigger: 'blur' }]
}

const handleFileChange = (file) => {
  mapForm.file = file.raw
}

const handleAdd = () => {
  dialogType.value = 'add'
  mapForm.name = ''
  mapForm.file = null
  mapForm.xMin = -6
  mapForm.xMax = 6
  mapForm.yMin = -2
  mapForm.yMax = 10
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogType.value = 'edit'
  Object.assign(mapForm, row)
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除地图 ${row.name} 吗？`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await axios.delete(`/api/maps/${row.id}`)
      ElMessage.success('删除成功')
      fetchMapList()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

// 修改 currentMapUrl 计算属性
const currentMapUrl = computed(() => {
  const baseUrl = 'http://localhost:8080'  // 从配置文件可以看到开发环境端口是8080
  const path = currentMap.value ? `/api/maps/${currentMap.value.id}/image` : ''
  return currentMap.value ? baseUrl + path : ''
})

// 修改 handleSubmit 方法
const handleSubmit = async () => {
  if (!mapFormRef.value) return
  
  try {
    await mapFormRef.value.validate()
    
    const formData = new FormData()
    formData.append('name', mapForm.name)
    formData.append('xMin', mapForm.xMin)
    formData.append('xMax', mapForm.xMax)
    formData.append('yMin', mapForm.yMin)
    formData.append('yMax', mapForm.yMax)
    
    if (dialogType.value === 'add') {
      if (!mapForm.file) {
        ElMessage.error('请选择地图文件')
        return
      }
      formData.append('file', mapForm.file)
      await axios.post('/api/maps', formData)
      ElMessage.success('添加成功')
    } else {
      // 编辑时如果有新文件才添加
      if (mapForm.file) {
        formData.append('file', mapForm.file)
      }
      await axios.put(`/api/maps/${mapForm.id}`, formData)
      ElMessage.success('编辑成功')
    }
    
    dialogVisible.value = false
    fetchMapList()
  } catch (error) {
    console.error('Error:', error)
    ElMessage.error(dialogType.value === 'add' ? '添加失败' : '编辑失败')
  }
}

// 添加当前地图选择相关的数据
const currentMapId = ref(null)

// 修改获取地图列表的方法
const fetchMapList = async () => {
  try {
    // 先获取地图列表
    const mapsResponse = await axios.get('/api/maps')
    mapList.value = mapsResponse.data
    
    try {
      // 再尝试获取当前地图
      const currentMapResponse = await axios.get('/api/maps/current')
      currentMapId.value = currentMapResponse.data?.id || null
    } catch (error) {
      // 如果没有当前地图，使用列表中的第一个
      currentMapId.value = mapList.value[0]?.id || null
      // 如果有地图，则设置第一个为当前地图
      if (currentMapId.value) {
        await axios.put(`/api/maps/current/${currentMapId.value}`)
      }
    }
  } catch (error) {
    ElMessage.error('获取地图列表失败')
  }
}

// 修改 currentMap 计算属性
const currentMap = computed(() => {
  return mapList.value.find(map => map.id === currentMapId.value)
})

// 修改切换当前地图的方法
const mapStore = useMapStore()

// 修改 handleMapChange 方法
const handleMapChange = async (mapId) => {
  try {
    await axios.put(`/api/maps/current/${mapId}`)
    await mapStore.fetchCurrentMap() // 更新 store 中的数据
    ElMessage.success('切换地图成功')
  } catch (error) {
    console.error('切换地图失败:', error)
    ElMessage.error('切换地图失败')
  }
}

// 页面加载时获取地图列表
fetchMapList()

// 添加调试信息
const debugInfo = reactive({
  loadStatus: '未加载',
  error: null
})

// 添加图片加载处理函数
const handleImageLoad = () => {
  console.log('图片加载成功')
  debugInfo.loadStatus = '加载成功'
  debugInfo.error = null
}

const handleImageError = (e) => {
  console.error('图片加载失败:', e)
  debugInfo.loadStatus = '加载失败'
  debugInfo.error = e.type
  ElMessage.error('图片加载失败')
}
</script>

<!-- 添加上传组件到模板部分 -->
<style scoped>
.map-container {
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
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 16px;
  background-color: #fff;
  flex: 1;
}

.control-buttons {
  display: flex;
  align-items: center;
  gap: 20px;
}

.map-select {
  display: flex;
  align-items: center;
  gap: 10px;
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
  border: 1px solid #dcdfe6;
}

:deep(.el-select) {
  width: 200px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.control-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 40px;
  margin-top: 16px;
}

.map-preview {
  min-width: 300px;
  border-left: 1px solid #dcdfe6;
  padding-left: 20px;
}

.preview-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-image {
  width: 100%;
  height: 200px;
  object-fit: contain;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #f5f7fa;
}

.preview-info {
  font-size: 14px;
  color: #606266;
}

.preview-info p {
  margin: 4px 0;
  display: flex;
}

.preview-info p:nth-child(2) {
  margin-left: 0;
  padding-left: 3.5em;
  text-indent: -3.5em;
}

/* 调整控制面板的最小高度以适应预览图 */
.control-wrapper {
  min-height: 320px;
}

/* 调整按钮和选择器的布局 */
.control-buttons {
  flex: 1;
}

.text-center {
  text-align: center;
  line-height: 32px;
}

.map-upload {
  :deep(.el-upload) {
    width: 100%;
  }
  
  :deep(.el-upload-list) {
    width: 100%;
  }
}

.debug-info {
  margin-top: 8px;
  padding: 8px;
  background-color: #f8f9fa;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.debug-info p {
  margin: 4px 0;
}
</style>