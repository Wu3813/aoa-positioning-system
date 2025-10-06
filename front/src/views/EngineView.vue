<template>
  <div class="engine-view-container">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>引擎管理</h2>
        <!-- 搜索/过滤栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
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
          <el-table-column prop="name" label="引擎名称" width="150" fixed="left" show-overflow-tooltip sortable="custom" />
          <el-table-column label="状态" width="100" prop="status" fixed="left" sortable="custom">
            <template #default="scope">
              <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
                {{ scope.row.status === 1 ? '在线' : '离线' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="配置状态" width="120" prop="configStatus" sortable="custom">
            <template #default="scope">
              <el-tag :type="getConfigStatusType(scope.row.configStatus)">
                {{ getConfigStatusText(scope.row.configStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="标签数量" width="100" prop="tagCount" sortable="custom">
            <template #default="scope">
              <span>{{ scope.row.tagCount || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column label="基站数量" width="100" prop="stationCount" sortable="custom">
            <template #default="scope">
              <span>{{ scope.row.stationCount || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="managementUrl" label="管理IP" min-width="200" show-overflow-tooltip />
          <el-table-column prop="mapName" label="所属地图" width="120" show-overflow-tooltip sortable="custom" />
          <el-table-column label="最后配置时间" width="180" show-overflow-tooltip prop="lastConfigTime" sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.lastConfigTime) }}
            </template>
          </el-table-column>
          <el-table-column label="最后通讯时间" width="180" show-overflow-tooltip prop="lastCommunication" sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.lastCommunication) }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button-group class="operation-row">
                  <el-button type="default" size="small" @click="handleEdit(scope.row)">
                    编辑
                  </el-button>
                  <el-button type="default" size="small" @click="handleHealthCheck(scope.row)">
                    健康检查
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

    <!-- 添加/编辑引擎对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加引擎' : '编辑引擎'"
      width="1400px"
      @close="resetForm"
      destroy-on-close
      class="engine-dialog"
    >
      <div class="engine-dialog-content">
        <!-- 左侧：基本信息 -->
        <div class="dialog-left-panel">
          <div class="form-section">
            <h3>基本信息</h3>
            <el-form 
              :model="engineForm" 
              :rules="rules"
              ref="engineFormRef"
              label-width="100px"
              status-icon
            >
              <el-form-item label="引擎名称" prop="name">
                <el-input v-model="engineForm.name" placeholder="请输入引擎名称" />
              </el-form-item>
              
              <el-form-item label="管理IP" prop="managementUrl">
                <el-input v-model="engineForm.managementUrl" placeholder="请输入管理IP地址" />
              </el-form-item>
              
              <el-form-item label="所属地图" prop="mapId">
                <el-select v-model="engineForm.mapId" placeholder="请选择地图" style="width: 100%">
                  <el-option 
                    v-for="map in mapList" 
                    :key="map.mapId"
                    :label="map.name" 
                    :value="map.mapId"
                  />
                </el-select>
              </el-form-item>
              
              <el-form-item label="引擎状态">
                <el-tag :type="engineForm.status === 1 ? 'success' : 'danger'" size="large">
                  {{ engineForm.status === 1 ? '在线' : '离线' }}
                </el-tag>
                <span style="margin-left: 10px; color: #909399; font-size: 12px;">
                </span>
              </el-form-item>
              
              <el-form-item label="备注" prop="remark">
                <el-input 
                  v-model="engineForm.remark" 
                  type="textarea" 
                  :rows="3" 
                  placeholder="请输入备注信息"
                />
              </el-form-item>
            </el-form>
          </div>

          <!-- 配置状态显示 -->
          <div class="form-section">
            <h3>配置状态</h3>
            <div class="status-cards">
              <div class="status-card">
                <div class="status-label">配置状态</div>
                <el-tag :type="getConfigStatusType(configStatus.status)" size="large">
                  {{ getConfigStatusText(configStatus.status) }}
                </el-tag>
              </div>
              <div class="status-card">
                <div class="status-label">标签数量</div>
                <div class="status-value">{{ configStatus.tagCount || 0 }}</div>
              </div>
              <div class="status-card">
                <div class="status-label">基站数量</div>
                <div class="status-value">{{ configStatus.stationCount || 0 }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：配置管理 -->
        <div class="dialog-right-panel">
          <div class="config-section">
            <h3>基础配置</h3>
            <el-row :gutter="12">
              <el-col :span="6">
                <el-form-item label="日志级别">
                  <el-select v-model="configForm.log_level" placeholder="请选择日志级别" style="width: 100%">
                    <el-option label="trace" value="trace" />
                    <el-option label="debug" value="debug" />
                    <el-option label="info" value="info" />
                    <el-option label="warn" value="warn" />
                    <el-option label="error" value="error" />
                    <el-option label="critical" value="critical" />
                    <el-option label="off" value="off" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="配置API端口">
                  <el-input-number v-model="configForm.config_api_port" :min="1" :max="65535" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="UDP IQ端口">
                  <el-input-number v-model="configForm.udp_iq_port" :min="1" :max="65535" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="启用IQ校正">
                  <el-switch v-model="configForm.enable_iq_correction" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="POST URL">
              <el-input v-model="configForm.post_url" placeholder="请输入POST URL" />
            </el-form-item>
          </div>

          <div class="config-section ai-engine-config">
            <h3>AI引擎配置</h3>
            
            <!-- 模型路径 -->
            <el-form-item label="模型路径" class="model-path-item">
              <el-input v-model="configForm.ai_engine.model_path" placeholder="请输入模型路径" />
            </el-form-item>
            
            <!-- 参数配置 -->
            <el-row :gutter="10" class="ai-params-row">
              <el-col :span="8">
                <el-form-item label="序列超时(ms)">
                  <el-input-number v-model="configForm.ai_engine.sequence_timeout_ms" :min="1" :max="10000" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="最大线程数">
                  <el-input-number v-model="configForm.ai_engine.max_threads" :min="1" :max="100" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="最小样本数">
                  <el-input-number v-model="configForm.ai_engine.min_samples_per_locator" :min="1" :max="50" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            
            <!-- 模型操作按钮 -->
            <div class="model-actions">
              <el-upload
                ref="uploadRef"
                :action="uploadAction"
                :headers="uploadHeaders"
                :data="uploadData"
                :before-upload="beforeUpload"
                :on-success="onUploadSuccess"
                :on-error="onUploadError"
                :show-file-list="false"
                accept=".rknn"
                class="upload-button"
              >
                <el-button type="success">
                  <el-icon><Upload /></el-icon> 上传模型
                </el-button>
              </el-upload>
              <el-button type="warning" @click="handleCleanupModels" :loading="cleanupLoading">
                <el-icon><Delete /></el-icon> 清理模型
              </el-button>
            </div>
          </div>

          <div class="config-section">
            <h3>卡尔曼滤波器配置</h3>
            <el-row :gutter="10">
              <el-col :span="12">
                <el-form-item label="过程噪声">
                  <el-input-number v-model="configForm.kalman_filter.process_noise" :min="0" :max="1" :step="0.01" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="测量噪声">
                  <el-input-number v-model="configForm.kalman_filter.measurement_noise" :min="0" :max="1" :step="0.01" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

        </div>
      </div>
      
      <!-- 对话框底部按钮 -->
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
import { Search, Refresh, Plus, Delete, Edit, Upload, Download, Check } from '@element-plus/icons-vue'
import axios from 'axios'

const engineList = ref([])
const mapList = ref([])
const tagList = ref([])
const stationList = ref([])
const loading = ref(false)
const submitLoading = ref(false)
const syncLoading = ref(false)
const cleanupLoading = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('add')
const engineFormRef = ref(null)
const uploadRef = ref(null)
const tableMaxHeight = ref('calc(100vh - 320px)')
const resizeObserver = ref(null)
const healthCheckInterval = ref(null)

// 搜索表单
const searchForm = reactive({
  name: '',
  status: ''
})

// 表格多选
const multipleSelection = ref([])

// 引擎表单
const engineForm = reactive({
  id: null,
  name: '',
  managementUrl: '',
  mapId: null,
  status: 1,
  remark: ''
})

// 配置表单
const configForm = reactive({
  log_level: 'info',
  post_url: `http://${window.location.hostname}:8080/api/realtime/paths/batch`,
  target_tags: [],
  config_api_port: 9999,
  udp_iq_port: 777,
  ai_engine: {
    model_path: '',
    sequence_timeout_ms: 1000,
    max_threads: 30,
    min_samples_per_locator: 3
  },
  kalman_filter: {
    process_noise: 0.01,
    measurement_noise: 0.1
  },
  locator_config: {
    locator_count: 0,
    locators: []
  },
  enable_iq_correction: true
})

// 配置状态
const configStatus = reactive({
  status: 'unknown', // unknown, synced, unsynced, failed
  tagCount: 0,
  stationCount: 0,
  lastConfigTime: null
})

// 表单校验规则
const rules = {
  name: [
    { required: true, message: '请输入引擎名称', trigger: 'blur' }
  ],
  managementUrl: [
    { required: true, message: '请输入管理IP地址', trigger: 'blur' },
    { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: '请输入有效的IP地址', trigger: 'blur' }
  ],
  mapId: [
    { required: true, message: '请选择所属地图', trigger: 'change' }
  ]
}

// 构建完整的管理URL
const buildManagementUrl = (ipOrUrl) => {
  if (!ipOrUrl) return ''
  
  // 如果已经是完整的URL，直接返回
  if (ipOrUrl.startsWith('http://') || ipOrUrl.startsWith('https://')) {
    return ipOrUrl
  }
  
  // 如果是IP地址，使用配置中的端口构建完整的URL
  const port = configForm.config_api_port || 9999
  return `http://${ipOrUrl}:${port}`
}

// 文件上传相关计算属性
const uploadAction = computed(() => {
  const engine = engineList.value.find(e => e.id === engineForm.id)
  if (!engine) return ''
  const baseUrl = buildManagementUrl(engine.managementUrl)
  return `${baseUrl}/api/v1/model/upload`
})

const uploadHeaders = computed(() => {
  return {
    'Content-Type': 'multipart/form-data'
  }
})

const uploadData = computed(() => {
  return {}
})

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

// 定期健康检查所有引擎
const startPeriodicHealthCheck = () => {
  // 每30秒检查一次
  healthCheckInterval.value = setInterval(async () => {
    for (const engine of engineList.value) {
      try {
        await performHealthCheck(engine)
      } catch (error) {
        console.error(`引擎 ${engine.name} 健康检查失败:`, error)
        // 确保失败时也更新状态
        engine.status = 0
        engine.configStatus = 'failed'
      }
    }
  }, 30000)
}

// 停止定期健康检查
const stopPeriodicHealthCheck = () => {
  if (healthCheckInterval.value) {
    clearInterval(healthCheckInterval.value)
    healthCheckInterval.value = null
  }
}

// 获取引擎列表
const fetchEngines = async () => {
  loading.value = true
  try {
    const params = {}
    
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

// 获取标签列表
const fetchTags = async () => {
  try {
    const response = await axios.get('/api/tags')
    if (Array.isArray(response.data)) {
      tagList.value = response.data
    } else if (response.data && Array.isArray(response.data.content)) {
      tagList.value = response.data.content
    } else {
      tagList.value = []
    }
  } catch (error) {
    console.error('获取标签列表错误:', error)
    ElMessage.error('获取标签列表失败')
    tagList.value = []
  }
}

// 获取基站列表
const fetchStations = async () => {
  try {
    const response = await axios.get('/api/stations')
    if (Array.isArray(response.data)) {
      stationList.value = response.data
    } else if (response.data && Array.isArray(response.data.content)) {
      stationList.value = response.data.content
    } else {
      stationList.value = []
    }
  } catch (error) {
    console.error('获取基站列表错误:', error)
    ElMessage.error('获取基站列表失败')
    stationList.value = []
  }
}

// 获取配置状态类型
const getConfigStatusType = (status) => {
  switch (status) {
    case 'synced': return 'success'
    case 'unsynced': return 'warning'
    case 'failed': return 'danger'
    default: return 'info'
  }
}

// 获取配置状态文本
const getConfigStatusText = (status) => {
  switch (status) {
    case 'synced': return '已同步'
    case 'unsynced': return '未同步'
    case 'failed': return '同步失败'
    default: return '未知'
  }
}

// 搜索处理
const handleSearch = () => {
  fetchEngines()
}

// 重置搜索
const handleResetSearch = () => {
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
    name: '',
    managementUrl: '',
    mapId: null,
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
const handleEdit = async (row) => {
  dialogType.value = 'edit'
  const rowData = JSON.parse(JSON.stringify(row))
  Object.assign(engineForm, rowData)
  dialogVisible.value = true
  
  // 自动执行健康检查更新状态
  await performHealthCheck(row)
  
  // 自动加载配置数据
  await loadEngineConfig(row)
  
  // 同步配置状态到对话框显示
  configStatus.status = row.configStatus || 'unknown'
  configStatus.tagCount = row.tagCount || 0
  configStatus.stationCount = row.stationCount || 0
  
  setTimeout(() => {
    if (engineFormRef.value) {
      engineFormRef.value.clearValidate()
    }
  }, 0)
}

// 执行健康检查并更新状态
const performHealthCheck = async (row) => {
  try {
    const baseUrl = buildManagementUrl(row.managementUrl)
    const healthUrl = `${baseUrl}/api/v1/health`
    const response = await axios.get(healthUrl, { timeout: 5000 })
    
    const isHealthy = response.data && response.data.status === 'healthy'
    const newStatus = isHealthy ? 1 : 0
    
    // 如果状态发生变化，更新后端
    if (row.status !== newStatus) {
      await axios.put(`/api/engines/${row.id}/status`, { status: newStatus })
      row.status = newStatus
      engineForm.status = newStatus
    }
    
    // 检查配置状态
    try {
      const configUrl = `${baseUrl}/api/v1/config/current`
      const configResponse = await axios.get(configUrl, { timeout: 5000 })
      if (configResponse.data && configResponse.data.success) {
        row.configStatus = 'synced'
        configStatus.status = 'synced'
      } else {
        row.configStatus = 'failed'
        configStatus.status = 'failed'
      }
    } catch (configError) {
      console.error('配置检查错误:', configError)
      row.configStatus = 'failed'
      configStatus.status = 'failed'
    }
    
    return isHealthy
  } catch (error) {
    console.error('健康检查错误:', error)
    // 健康检查失败，设置为离线状态
    const newStatus = 0
    if (row.status !== newStatus) {
      try {
        await axios.put(`/api/engines/${row.id}/status`, { status: newStatus })
        row.status = newStatus
        engineForm.status = newStatus
      } catch (updateError) {
        console.error('更新状态失败:', updateError)
      }
    }
    
    // 健康检查失败时，配置状态也设为失败
    row.configStatus = 'failed'
    configStatus.status = 'failed'
    
    return false
  }
}

// 健康检查（手动触发）
const handleHealthCheck = async (row) => {
  const isHealthy = await performHealthCheck(row)
  
  if (isHealthy) {
    ElMessage.success(`引擎 "${row.name}" 健康检查通过`)
  } else {
    ElMessage.warning(`引擎 "${row.name}" 健康检查失败，已设置为离线状态`)
  }
}

// 加载引擎配置
const loadEngineConfig = async (engine) => {
  try {
    // 获取当前配置
    const baseUrl = buildManagementUrl(engine.managementUrl)
    const configUrl = `${baseUrl}/api/v1/config/current`
    const response = await axios.get(configUrl, { timeout: 5000 })
    
    if (response.data && response.data.success) {
      // 直接使用返回的配置数据，包括模型路径
      Object.assign(configForm, response.data.config)
      configStatus.status = 'synced'
      configStatus.lastConfigTime = new Date().toISOString()
      // 同步到列表中的引擎对象
      engine.configStatus = 'synced'
    } else {
      configStatus.status = 'failed'
      engine.configStatus = 'failed'
    }
  } catch (error) {
    console.error('加载配置错误:', error)
    configStatus.status = 'failed'
    engine.configStatus = 'failed'
    ElMessage.warning('无法加载引擎配置')
    return
  }
  
  // 自动构建配置并获取有效数量
  const counts = await buildConfigFromData()
  
  // 更新统计数据 - 使用实际的有效数量
  configStatus.tagCount = counts.validTagCount
  configStatus.stationCount = counts.validStationCount
  engine.tagCount = counts.validTagCount
  engine.stationCount = counts.validStationCount
}

// 从数据构建配置
const buildConfigFromData = async () => {
  // 构建目标标签 - 过滤空值并转换为大写
  const validTags = tagList.value
    .map(tag => tag.macAddress || tag.mac)
    .filter(mac => mac && mac.trim())
  
  configForm.target_tags = validTags.map(mac => mac.toUpperCase())
  
  // 构建定位器配置 - 过滤空值并转换为小写
  const validStations = stationList.value.filter(station => {
    const mac = station.macAddress || station.mac
    return mac && mac.trim()
  })
  
  configForm.locator_config.locator_count = validStations.length
  configForm.locator_config.locators = validStations.map(station => ({
    mac: (station.macAddress || station.mac).toLowerCase(),
    position: [station.coordinateX || 0, station.coordinateY || 0, station.coordinateZ || 0],
    orientation: [station.orientation || 0, 0, 0] // 目前只有方位角，其他方向设为0
  }))
  
  // 构建POST URL
  if (!configForm.post_url) {
    const hostname = window.location.hostname
    configForm.post_url = `http://${hostname}:8080/api/realtime/paths/batch`
  }
  
  // 返回实际的有效数量
  return {
    validTagCount: validTags.length,
    validStationCount: validStations.length
  }
}

// 同步配置
const handleSyncConfig = async (showMessage = true) => {
  syncLoading.value = true
  try {
    // 重新构建配置并获取有效数量
    const counts = await buildConfigFromData()
    
    // 发送配置到引擎
    const engine = engineList.value.find(e => e.id === engineForm.id)
    if (!engine) {
      if (showMessage) {
        ElMessage.error('未找到引擎信息')
      }
      throw new Error('未找到引擎信息')
    }
    
    const baseUrl = buildManagementUrl(engine.managementUrl)
    const configUrl = `${baseUrl}/api/v1/config/update`
    const response = await axios.post(configUrl, configForm, { timeout: 10000 })
    
    if (response.data && response.data.success) {
      if (showMessage) {
        ElMessage.success('配置同步成功')
      }
      configStatus.status = 'synced'
      configStatus.lastConfigTime = new Date().toISOString()
      // 同步到列表中的引擎对象
      engine.configStatus = 'synced'
      // 更新引擎的数量统计
      engine.tagCount = counts.validTagCount
      engine.stationCount = counts.validStationCount
    } else {
      if (showMessage) {
        ElMessage.error('配置同步失败')
      }
      configStatus.status = 'failed'
      engine.configStatus = 'failed'
      throw new Error('配置同步失败')
    }
  } catch (error) {
    console.error('同步配置错误:', error)
    if (showMessage) {
      ElMessage.error(`配置同步失败: ${error.message}`)
    }
    configStatus.status = 'failed'
    engine.configStatus = 'failed'
    throw error // 重新抛出错误，让调用者处理
  } finally {
    syncLoading.value = false
  }
}


// 文件上传前验证
const beforeUpload = (file) => {
  // 检查文件类型
  const isRknn = file.name.toLowerCase().endsWith('.rknn')
  if (!isRknn) {
    ElMessage.error('只能上传 .rknn 格式的模型文件')
    return false
  }
  
  // 检查文件大小 (限制为100MB)
  const isLt100M = file.size / 1024 / 1024 < 100
  if (!isLt100M) {
    ElMessage.error('模型文件大小不能超过 100MB')
    return false
  }
  
  // 检查是否有选中的引擎
  const engine = engineList.value.find(e => e.id === engineForm.id)
  if (!engine) {
    ElMessage.error('请先选择要上传的引擎')
    return false
  }
  
  ElMessage.info(`开始上传模型文件: ${file.name}`)
  return true
}

// 文件上传成功回调
const onUploadSuccess = (response, file) => {
  console.log('上传成功响应:', response)
  
  if (response && response.success) {
    ElMessage.success(`模型文件上传成功: ${response.filename}`)
    
    // 更新模型路径
    if (response.file_path) {
      configForm.ai_engine.model_path = response.file_path
    }
    
    // 如果返回了当前配置，更新配置表单
    if (response.current_config) {
      Object.assign(configForm, response.current_config)
    }
    
    // 更新配置状态
    configStatus.status = 'synced'
    configStatus.lastConfigTime = new Date().toISOString()
    
    // 同步到列表中的引擎对象
    const engine = engineList.value.find(e => e.id === engineForm.id)
    if (engine) {
      engine.configStatus = 'synced'
    }
  } else {
    ElMessage.error('模型文件上传失败: ' + (response?.message || '未知错误'))
  }
}

// 文件上传失败回调
const onUploadError = (error, file) => {
  console.error('上传失败:', error)
  ElMessage.error(`模型文件上传失败: ${error.message || '网络错误'}`)
}

// 清理模型
const handleCleanupModels = async () => {
  const engine = engineList.value.find(e => e.id === engineForm.id)
  if (!engine) {
    ElMessage.error('未找到引擎信息')
    return
  }
  
  // 确认对话框
  try {
    await ElMessageBox.confirm(
      '确定要清理未使用的模型文件吗？此操作将删除除当前使用模型外的所有模型文件。',
      '确认清理',
      {
        confirmButtonText: '确定清理',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return // 用户取消
  }
  
  cleanupLoading.value = true
  try {
    const baseUrl = buildManagementUrl(engine.managementUrl)
    const cleanupUrl = `${baseUrl}/api/v1/model/cleanup`
    const response = await axios.post(cleanupUrl, {}, { timeout: 15000 })
    
    if (response.data && response.data.success) {
      const { deleted_count, deleted_files, total_size_freed, current_model } = response.data
      
      // 构建成功消息
      let message = `模型清理完成，删除了 ${deleted_count} 个文件`
      if (total_size_freed) {
        const sizeMB = (total_size_freed / 1024 / 1024).toFixed(2)
        message += `，释放空间 ${sizeMB}MB`
      }
      
      ElMessage.success(message)
      
      // 如果返回了当前配置，更新配置表单
      if (response.data.current_config) {
        Object.assign(configForm, response.data.current_config)
      }
      
      // 更新配置状态
      configStatus.status = 'synced'
      configStatus.lastConfigTime = new Date().toISOString()
      
      // 同步到列表中的引擎对象
      engine.configStatus = 'synced'
      
      // 显示详细信息
      if (deleted_files && deleted_files.length > 0) {
        console.log('已删除的文件:', deleted_files)
      }
      
      if (current_model) {
        console.log('当前使用的模型:', current_model)
      }
    } else {
      ElMessage.error('模型清理失败: ' + (response.data?.message || '未知错误'))
    }
  } catch (error) {
    console.error('清理模型错误:', error)
    let errorMessage = '模型清理失败'
    
    if (error.response) {
      // 服务器返回错误
      errorMessage += ': ' + (error.response.data?.message || error.response.statusText)
    } else if (error.request) {
      // 网络错误
      errorMessage += ': 网络连接失败'
    } else {
      // 其他错误
      errorMessage += ': ' + error.message
    }
    
    ElMessage.error(errorMessage)
  } finally {
    cleanupLoading.value = false
  }
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
        // 1. 先保存引擎基本信息
        if (dialogType.value === 'add') {
          await axios.post('/api/engines', engineForm)
          ElMessage.success('添加成功')
        } else {
          await axios.put(`/api/engines/${engineForm.id}`, engineForm)
          ElMessage.success('更新成功')
        }
        
        // 2. 自动同步配置到引擎
        try {
          await handleSyncConfig(false) // 不显示额外的成功消息
          ElMessage.success('配置同步成功')
        } catch (syncError) {
          ElMessage.warning('引擎信息已保存，但配置同步失败: ' + syncError.message)
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
onMounted(async () => {
  await fetchEngines()
  fetchMaps()
  fetchTags()
  fetchStations()
  updateTableHeight()
  setupResizeObserver()
  startPeriodicHealthCheck()
})

// 组件卸载前清理
onBeforeUnmount(() => {
  stopPeriodicHealthCheck()
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
  flex-direction: column;
  gap: 1px;
  min-width: fit-content; /* 自适应内容宽度 */
  max-width: none; /* 移除最大宽度限制 */
}

.operation-row {
  display: flex;
  width: 100%;
}

.operation-buttons .el-button {
  flex: 1;
  font-size: 12px;
  padding: 4px 8px;
  min-width: fit-content; /* 自适应内容宽度 */
  white-space: nowrap;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.dialog-footer .el-button {
  min-width: 100px;
  height: 36px;
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

/* 引擎对话框样式 */
.engine-dialog {
  max-height: 90vh;
}

.engine-dialog-content {
  display: flex;
  gap: 16px;
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}

.dialog-left-panel {
  flex: 0 0 400px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dialog-right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e4e7ed;
}

.form-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 8px;
}

.status-cards {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.status-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 8px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.status-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.config-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e4e7ed;
}

.config-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 8px;
}

.config-actions {
  background: #f0f9ff;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #b3d8ff;
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.config-actions .el-button {
  min-width: 140px;
  height: 40px;
  font-weight: 500;
}

.config-actions .el-button .el-icon {
  margin-right: 6px;
}

/* AI引擎配置样式 */
.ai-engine-config {
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
}

.ai-engine-config h3 {
  color: #303133;
  border-bottom-color: #e4e7ed;
}

.model-path-item {
  margin-bottom: 10px;
}

.ai-params-row {
  margin-bottom: 12px;
}

/* 模型操作按钮样式 */
.model-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.model-actions .el-button {
  min-width: 120px;
  height: 36px;
  font-weight: 500;
}

.model-actions .el-button .el-icon {
  margin-right: 6px;
}

/* 上传按钮样式 */
.upload-button {
  display: inline-block;
}

.upload-button .el-button {
  min-width: 120px;
  height: 36px;
  font-weight: 500;
}

.upload-button .el-button .el-icon {
  margin-right: 6px;
}

/* 响应式布局 */
@media screen and (max-width: 1400px) {
  .engine-dialog-content {
    flex-direction: column;
    gap: 20px;
  }
  
  .dialog-left-panel {
    flex: none;
  }
  
  .dialog-right-panel {
    flex: none;
  }
}

@media screen and (max-width: 768px) {
  .engine-dialog {
    width: 95% !important;
    margin: 0 auto;
  }
  
  .engine-dialog-content {
    max-height: calc(90vh - 100px);
  }
  
  .form-section,
  .config-section {
    padding: 16px;
  }
  
  .config-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .config-actions .el-button {
    width: 100%;
    max-width: 200px;
  }
  
  .status-cards {
    gap: 8px;
  }
  
  .status-card {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  
  .ai-params-row .el-col {
    margin-bottom: 16px;
  }
  
  .model-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .model-actions .el-button {
    width: 100%;
    max-width: 200px;
  }
}
</style> 