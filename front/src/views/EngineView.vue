<template>
  <div class="engine-view-container">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>引擎管理</h2>
        <!-- 搜索/过滤栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
            <el-form-item label="引擎编号">
              <el-input v-model="searchForm.code" placeholder="请输入引擎编号" clearable />
            </el-form-item>
            <el-form-item label="引擎名称">
              <el-input v-model="searchForm.name" placeholder="请输入引擎名称" clearable />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 120px;">
                <el-option label="在线" :value="1" />
                <el-option label="离线" :value="0" />
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
          <el-button type="danger" @click="handleBatchDelete" :disabled="!multipleSelection.length">
            <el-icon><Delete /></el-icon> 批量删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <div class="engine-table-wrapper">
        <el-table 
          :data="filteredEngineList" 
          @selection-change="handleSelectionChange"
          v-loading="loading"
          height="calc(100vh - 320px)"
          border
          stripe
          class="engine-table"
          style="width: 100%;"
          @sort-change="handleSortChange"
        >
          <el-table-column type="selection" width="55" fixed="left" />
          <el-table-column label="序号" width="60" align="center" fixed="left">
            <template #default="scope">
              {{ scope.$index + 1 }}
            </template>
          </el-table-column>
          <el-table-column prop="code" label="引擎编号" width="120" fixed="left" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="name" label="引擎名称" width="150" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="managementUrl" label="管理URL" min-width="200" show-overflow-tooltip />
          <el-table-column prop="dataUrl" label="数据URL" min-width="200" show-overflow-tooltip />
          <el-table-column prop="mapName" label="所属地图" width="120" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="version" label="引擎版本" width="120" show-overflow-tooltip sortable="custom" />
          <el-table-column label="状态" width="100" prop="status" sortable="custom">
            <template #default="scope">
              <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
                {{ scope.row.status === 1 ? '在线' : '离线' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最后通讯时间" width="180" show-overflow-tooltip prop="lastCommunication" sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.lastCommunication) }}
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180" show-overflow-tooltip prop="createTime" sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button link type="primary" size="small" @click="handleEdit(scope.row)">
                  <el-icon><Edit /></el-icon> 修改
                </el-button>
                <el-button link type="danger" size="small" @click="handleDelete(scope.row)">
                  <el-icon><Delete /></el-icon> 删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 添加/编辑引擎对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加引擎' : '编辑引擎'"
      width="700px"
      @close="resetForm"
      destroy-on-close
    >
      <el-form 
        :model="engineForm" 
        :rules="rules"
        ref="engineFormRef"
        label-width="100px"
        status-icon
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="引擎编号" prop="code">
              <el-input v-model="engineForm.code" placeholder="请输入引擎编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="引擎名称" prop="name">
              <el-input v-model="engineForm.name" placeholder="请输入引擎名称" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="管理URL" prop="managementUrl">
              <el-input v-model="engineForm.managementUrl" placeholder="请输入管理URL" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据URL" prop="dataUrl">
              <el-input v-model="engineForm.dataUrl" placeholder="请输入数据URL" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属地图" prop="mapId">
              <el-select v-model="engineForm.mapId" placeholder="请选择地图" style="width: 100%">
                <el-option 
                  v-for="map in mapList" 
                  :key="map.id" 
                  :label="map.name" 
                  :value="map.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="引擎版本" prop="version">
              <el-input v-model="engineForm.version" placeholder="请输入引擎版本" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="引擎状态" prop="status">
              <el-select v-model="engineForm.status" placeholder="请选择状态" style="width: 100%">
                <el-option label="在线" :value="1" />
                <el-option label="离线" :value="0" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="备注" prop="remark">
          <el-input 
            v-model="engineForm.remark" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete, Edit } from '@element-plus/icons-vue'
import axios from 'axios'

const engineList = ref([])
const mapList = ref([])
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('add')
const engineFormRef = ref(null)
const tableMaxHeight = ref('calc(100vh - 320px)')
const resizeObserver = ref(null)

// 搜索表单
const searchForm = reactive({
  code: '',
  name: '',
  status: ''
})

// 表格多选
const multipleSelection = ref([])

// 引擎表单
const engineForm = reactive({
  id: null,
  code: '',
  name: '',
  managementUrl: '',
  dataUrl: '',
  mapId: null,
  version: '',
  status: 1,
  remark: ''
})

// 表单校验规则
const rules = {
  code: [
    { required: true, message: '请输入引擎编号', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]+$/, message: '引擎编号只能包含字母、数字、下划线和横线', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入引擎名称', trigger: 'blur' }
  ],
  managementUrl: [
    { required: true, message: '请输入管理URL', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/, message: '请输入有效的URL地址', trigger: 'blur' }
  ],
  dataUrl: [
    { required: true, message: '请输入数据URL', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/, message: '请输入有效的URL地址', trigger: 'blur' }
  ],
  mapId: [
    { required: true, message: '请选择所属地图', trigger: 'change' }
  ]
}

// 格式化日期时间
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '-'
  try {
    const date = new Date(dateTimeStr)
    if (isNaN(date.getTime())) return dateTimeStr
    
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date)
  } catch (e) {
    return dateTimeStr
  }
}

// 适应窗口大小调整表格高度
const setupResizeObserver = () => {
  if (window.ResizeObserver) {
    resizeObserver.value = new ResizeObserver(() => {
      updateTableHeight()
    })
    resizeObserver.value.observe(document.documentElement)
  } else {
    window.addEventListener('resize', updateTableHeight)
  }
}

const updateTableHeight = () => {
  const viewportHeight = window.innerHeight
  tableMaxHeight.value = `${viewportHeight - 320}px`
}

// 获取引擎列表
const fetchEngines = async () => {
  loading.value = true
  try {
    const params = {}
    
    if (searchForm.code && searchForm.code.trim()) {
      params.code = searchForm.code.trim()
    }
    if (searchForm.name && searchForm.name.trim()) {
      params.name = searchForm.name.trim()
    }
    if (searchForm.status !== '') {
      params.status = searchForm.status
    }
    
    const response = await axios.get('/api/engines', { params })
    
    // 直接使用返回的数据，后端返回的是数组
    if (Array.isArray(response.data)) {
      engineList.value = response.data
    } else {
      // 兼容处理，防止返回格式变化
      if (response.data && Array.isArray(response.data.content)) {
        engineList.value = response.data.content
      } else {
        engineList.value = []
      }
    }
  } catch (error) {
    console.error('获取引擎列表错误:', error)
    ElMessage.error('获取引擎列表失败: ' + (error.response?.data?.message || error.message || '未知错误'))
    engineList.value = []
  } finally {
    loading.value = false
  }
}

// 获取地图列表
const fetchMaps = async () => {
  try {
    const response = await axios.get('/api/maps')
    if (Array.isArray(response.data)) {
      mapList.value = response.data
    } else if (response.data && Array.isArray(response.data.content)) {
      mapList.value = response.data.content
    } else {
      mapList.value = []
    }
  } catch (error) {
    console.error('获取地图列表错误:', error)
    ElMessage.error('获取地图列表失败')
    mapList.value = []
  }
}

// 搜索处理
const handleSearch = () => {
  fetchEngines()
}

// 重置搜索
const handleResetSearch = () => {
  searchForm.code = ''
  searchForm.name = ''
  searchForm.status = ''
  fetchEngines()
}

// 选择变更处理
const handleSelectionChange = (selection) => {
  multipleSelection.value = selection
}

// 批量删除
const handleBatchDelete = () => {
  if (multipleSelection.value.length === 0) {
    ElMessage.warning('请至少选择一条记录')
    return
  }
  
  ElMessageBox.confirm(
    `确定要删除选中的 ${multipleSelection.value.length} 条记录吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const ids = multipleSelection.value.map(item => item.id)
      await axios.delete('/api/engines/batch', { data: ids })
      ElMessage.success('批量删除成功')
      fetchEngines()
    } catch (error) {
      console.error('批量删除引擎错误:', error)
      ElMessage.error('批量删除失败: ' + (error.response?.data?.message || error.message || '未知错误'))
    }
  }).catch(() => {
    // 取消删除，不做处理
  })
}

// 添加引擎
const handleAdd = () => {
  dialogType.value = 'add'
  Object.assign(engineForm, {
    id: null,
    code: '',
    name: '',
    managementUrl: '',
    dataUrl: '',
    mapId: null,
    version: '',
    status: 1,
    remark: ''
  })
  dialogVisible.value = true
  
  setTimeout(() => {
    if (engineFormRef.value) {
      engineFormRef.value.clearValidate()
    }
  }, 0)
}

// 编辑引擎
const handleEdit = (row) => {
  dialogType.value = 'edit'
  const rowData = JSON.parse(JSON.stringify(row))
  Object.assign(engineForm, rowData)
  dialogVisible.value = true
  
  setTimeout(() => {
    if (engineFormRef.value) {
      engineFormRef.value.clearValidate()
    }
  }, 0)
}

// 删除单个引擎
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除引擎 "${row.name}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await axios.delete(`/api/engines/${row.id}`)
      ElMessage.success('删除成功')
      fetchEngines()
    } catch (error) {
      console.error('删除引擎错误:', error)
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message || '未知错误'))
    }
  }).catch(() => {
    // 取消删除，不做处理
  })
}

// 提交表单
const handleSubmit = async () => {
  if (!engineFormRef.value) return
  
  await engineFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      try {
        if (dialogType.value === 'add') {
          await axios.post('/api/engines', engineForm)
          ElMessage.success('添加成功')
        } else {
          await axios.put(`/api/engines/${engineForm.id}`, engineForm)
          ElMessage.success('更新成功')
        }
        dialogVisible.value = false
        fetchEngines()
      } catch (error) {
        console.error('保存引擎错误:', error)
        ElMessage.error(
          (dialogType.value === 'add' ? '添加失败: ' : '更新失败: ') + 
          (error.response?.data?.message || error.message || '未知错误')
        )
      } finally {
        submitLoading.value = false
      }
    } else {
      return false
    }
  })
}

// 重置表单
const resetForm = () => {
  if (engineFormRef.value) {
    engineFormRef.value.resetFields()
  }
}

// 添加排序相关的变量
const sortOrder = ref({
  prop: '',
  order: ''
})

// 计算属性：根据排序条件处理引擎列表
const filteredEngineList = computed(() => {
  let list = [...engineList.value];
  
  // 如果有排序条件，则进行排序
  if (sortOrder.value.prop && sortOrder.value.order) {
    const { prop, order } = sortOrder.value;
    const isAsc = order === 'ascending';
    
    list.sort((a, b) => {
      let valueA = a[prop];
      let valueB = b[prop];
      
      // 特殊处理日期时间字段
      if (prop === 'lastCommunication' || prop === 'createTime') {
        valueA = valueA ? new Date(valueA).getTime() : 0;
        valueB = valueB ? new Date(valueB).getTime() : 0;
      }
      
      // 处理可能为空的值
      if (valueA === null || valueA === undefined) valueA = isAsc ? -Infinity : Infinity;
      if (valueB === null || valueB === undefined) valueB = isAsc ? -Infinity : Infinity;
      
      // 版本号特殊处理
      if (prop === 'version') {
        return compareVersions(valueA, valueB, isAsc);
      }
      
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

// 处理排序变化
const handleSortChange = ({ prop, order }) => {
  sortOrder.value = { prop, order };
}

// 版本号比较函数
const compareVersions = (v1, v2, isAsc) => {
  if (!v1 && !v2) return 0;
  if (!v1) return isAsc ? -1 : 1;
  if (!v2) return isAsc ? 1 : -1;
  
  const parts1 = v1.split('.').map(part => parseInt(part, 10) || 0);
  const parts2 = v2.split('.').map(part => parseInt(part, 10) || 0);
  
  // 确保两个数组长度相同
  while (parts1.length < parts2.length) parts1.push(0);
  while (parts2.length < parts1.length) parts2.push(0);
  
  // 逐段比较
  for (let i = 0; i < parts1.length; i++) {
    if (parts1[i] !== parts2[i]) {
      return isAsc 
        ? parts1[i] - parts2[i] 
        : parts2[i] - parts1[i];
    }
  }
  
  return 0;
}

// 组件挂载
onMounted(() => {
  fetchEngines()
  fetchMaps()
  updateTableHeight()
  setupResizeObserver()
})

// 组件卸载前清理
onBeforeUnmount(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
  } else {
    window.removeEventListener('resize', updateTableHeight)
  }
})
</script>

<style scoped>
.engine-view-container {
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

.engine-table-wrapper {
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

.engine-table {
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
  gap: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
  
  .engine-table-wrapper {
    padding: 10px;
  }
  
  .el-form-item {
    margin-bottom: 12px;
  }
}
</style>

<style>
/* 确保Element表格内部滚动正常工作 */
.el-table__body-wrapper {
  overflow-x: auto !important;
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