<template>
  <div class="station-view-container">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>基站管理</h2>
        <!-- 搜索/过滤栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
            <el-form-item label="基站编号">
              <el-input v-model="searchForm.code" placeholder="请输入基站编号" clearable />
            </el-form-item>
            <el-form-item label="基站名称">
              <el-input v-model="searchForm.name" placeholder="请输入基站名称" clearable />
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
      <div class="station-table-wrapper">
        <el-table 
          :data="stationList" 
          @selection-change="handleSelectionChange"
          v-loading="loading"
          height="calc(100vh - 320px)"
          border
          stripe
          class="station-table"
          style="width: 100%;"
        >
          <el-table-column type="selection" width="55" fixed="left" />
          <el-table-column label="序号" width="60" align="center" fixed="left">
            <template #default="scope">
              {{ scope.$index + 1 }}
            </template>
          </el-table-column>
          <el-table-column prop="code" label="基站编号" width="120" fixed="left" show-overflow-tooltip />
          <el-table-column prop="name" label="基站名称" width="150" show-overflow-tooltip />
          <el-table-column prop="macAddress" label="MAC地址" width="150" show-overflow-tooltip />
          <el-table-column prop="ipAddress" label="IP地址" width="130" show-overflow-tooltip />
          <el-table-column prop="model" label="基站型号" width="120" show-overflow-tooltip />
          <el-table-column prop="firmwareVersion" label="固件版本" width="120" show-overflow-tooltip />
          <el-table-column prop="mapName" label="所属地图" width="120" show-overflow-tooltip />
          <el-table-column label="坐标位置" width="180">
            <template #default="scope">
              <div>X: {{ formatCoordinate(scope.row.positionX) }} m</div>
              <div>Y: {{ formatCoordinate(scope.row.positionY) }} m</div>
              <div>Z: {{ formatCoordinate(scope.row.positionZ) }} m</div>
            </template>
          </el-table-column>
          <el-table-column prop="orientation" label="方位角" width="100">
            <template #default="scope">
              {{ formatCoordinate(scope.row.orientation) }}°
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
                {{ scope.row.status === 1 ? '在线' : '离线' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最后通讯时间" width="180" show-overflow-tooltip>
            <template #default="scope">
              {{ formatDateTime(scope.row.lastCommunication) }}
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180" show-overflow-tooltip>
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

    <!-- 添加/编辑基站对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加基站' : '编辑基站'"
      width="700px"
      @close="resetForm"
      destroy-on-close
    >
      <el-form 
        :model="stationForm" 
        :rules="rules"
        ref="stationFormRef"
        label-width="100px"
        status-icon
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="基站编号" prop="code">
              <el-input v-model="stationForm.code" placeholder="请输入基站编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="基站名称" prop="name">
              <el-input v-model="stationForm.name" placeholder="请输入基站名称" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="MAC地址" prop="macAddress">
              <el-input v-model="stationForm.macAddress" placeholder="请输入MAC地址" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="IP地址" prop="ipAddress">
              <el-input v-model="stationForm.ipAddress" placeholder="请输入IP地址" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="基站型号" prop="model">
              <el-input v-model="stationForm.model" placeholder="请输入基站型号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="固件版本" prop="firmwareVersion">
              <el-input v-model="stationForm.firmwareVersion" placeholder="请输入固件版本" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属地图" prop="mapId">
              <el-select v-model="stationForm.mapId" placeholder="请选择地图" style="width: 100%">
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
            <el-form-item label="方位角" prop="orientation">
              <el-input-number 
                v-model="stationForm.orientation" 
                :min="0" 
                :max="359.99" 
                :precision="2"
                style="width: 100%"
                placeholder="请输入方位角(0-360度)"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="基站坐标">
              <el-col :span="7">
                <el-form-item prop="positionX">
                  <el-input-number
                    v-model="stationForm.positionX"
                    :precision="3"
                    :step="0.1"
                    placeholder="X坐标"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="1" class="text-center">X</el-col>
              <el-col :span="7">
                <el-form-item prop="positionY">
                  <el-input-number
                    v-model="stationForm.positionY"
                    :precision="3"
                    :step="0.1"
                    placeholder="Y坐标"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="1" class="text-center">Y</el-col>
              <el-col :span="7">
                <el-form-item prop="positionZ">
                  <el-input-number
                    v-model="stationForm.positionZ"
                    :precision="3"
                    :step="0.1"
                    placeholder="Z坐标"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="1" class="text-center">Z</el-col>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="基站状态" prop="status">
              <el-select v-model="stationForm.status" placeholder="请选择状态" style="width: 100%">
                <el-option label="在线" :value="1" />
                <el-option label="离线" :value="0" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="备注" prop="remark">
          <el-input 
            v-model="stationForm.remark" 
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
import { ref, reactive, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete, Edit } from '@element-plus/icons-vue'
import axios from 'axios'

const stationList = ref([])
const mapList = ref([])
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('add')
const stationFormRef = ref(null)
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

// 基站表单
const stationForm = reactive({
  id: null,
  code: '',
  name: '',
  macAddress: '',
  ipAddress: '',
  model: '',
  firmwareVersion: '',
  mapId: null,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  orientation: 0,
  status: 1,
  remark: ''
})

// 表单校验规则
const rules = {
  code: [
    { required: true, message: '请输入基站编号', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]+$/, message: '基站编号只能包含字母、数字、下划线和横线', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入基站名称', trigger: 'blur' }
  ],
  macAddress: [
    { required: true, message: '请输入MAC地址', trigger: 'blur' },
    { pattern: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, message: 'MAC地址格式不正确', trigger: 'blur' }
  ],
  ipAddress: [
    { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'IP地址格式不正确', trigger: 'blur' }
  ],
  mapId: [
    { required: true, message: '请选择所属地图', trigger: 'change' }
  ],
  positionX: [
    { required: true, message: '请输入X坐标', trigger: 'blur' }
  ],
  positionY: [
    { required: true, message: '请输入Y坐标', trigger: 'blur' }
  ],
  positionZ: [
    { required: true, message: '请输入Z坐标', trigger: 'blur' }
  ]
}

// 格式化坐标数据
const formatCoordinate = (value) => {
  if (value === null || value === undefined) return '-';
  return parseFloat(value).toFixed(3);
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

// 适应窗口大小调整表格高度
const setupResizeObserver = () => {
  if (window.ResizeObserver) {
    resizeObserver.value = new ResizeObserver(() => {
      updateTableHeight();
    });
    resizeObserver.value.observe(document.documentElement);
  } else {
    window.addEventListener('resize', updateTableHeight);
  }
}

const updateTableHeight = () => {
  const viewportHeight = window.innerHeight;
  tableMaxHeight.value = `${viewportHeight - 320}px`;
}

// 获取基站列表
const fetchStations = async () => {
  loading.value = true;
  try {
    const params = {};
    
    // 只有当搜索关键词存在且不为空时才添加到查询参数中
    if (searchForm.code && searchForm.code.trim()) {
      params.code = searchForm.code.trim();
    }
    if (searchForm.name && searchForm.name.trim()) {
      params.name = searchForm.name.trim();
    }
    if (searchForm.status !== '') {
      params.status = searchForm.status;
    }
    
    const response = await axios.get('/api/stations', { params });
    
    // 处理数据
    if (response.data && Array.isArray(response.data.content)) {
      stationList.value = response.data.content;
    } else if (Array.isArray(response.data)) {
      stationList.value = response.data;
    } else {
      stationList.value = [];
    }
  } catch (error) {
    console.error('获取基站列表错误:', error);
    ElMessage.error('获取基站列表失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    stationList.value = []; // 出错时设置为空数组
  } finally {
    loading.value = false;
  }
}

// 获取地图列表（用于选择基站所属地图）
const fetchMaps = async () => {
  try {
    const response = await axios.get('/api/maps');
    if (Array.isArray(response.data)) {
      mapList.value = response.data;
    } else if (response.data && Array.isArray(response.data.content)) {
      mapList.value = response.data.content;
    } else {
      mapList.value = [];
    }
  } catch (error) {
    console.error('获取地图列表错误:', error);
    ElMessage.error('获取地图列表失败');
    mapList.value = [];
  }
}

// 搜索处理
const handleSearch = () => {
  fetchStations();
}

// 重置搜索
const handleResetSearch = () => {
  searchForm.code = '';
  searchForm.name = '';
  searchForm.status = '';
  fetchStations();
}

// 选择变更处理
const handleSelectionChange = (selection) => {
  multipleSelection.value = selection;
}

// 批量删除
const handleBatchDelete = () => {
  if (multipleSelection.value.length === 0) {
    ElMessage.warning('请至少选择一条记录');
    return;
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
      const ids = multipleSelection.value.map(item => item.id);
      await axios.delete('/api/stations/batch', { data: ids });
      ElMessage.success('批量删除成功');
      fetchStations(); // 重新加载基站列表
    } catch (error) {
      console.error('批量删除基站错误:', error);
      ElMessage.error('批量删除失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    }
  }).catch(() => {
    // 取消删除，不做处理
  });
}

// 添加基站
const handleAdd = () => {
  dialogType.value = 'add';
  Object.assign(stationForm, {
    id: null,
    code: '',
    name: '',
    macAddress: '',
    ipAddress: '',
    model: '',
    firmwareVersion: '',
    mapId: null,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    orientation: 0,
    status: 1,
    remark: ''
  });
  dialogVisible.value = true;
  
  // 异步设置表单引用，确保DOM已更新
  setTimeout(() => {
    if (stationFormRef.value) {
      stationFormRef.value.clearValidate();
    }
  }, 0);
}

// 编辑基站
const handleEdit = (row) => {
  dialogType.value = 'edit';
  // 深拷贝以避免直接修改表格数据
  const rowData = JSON.parse(JSON.stringify(row));
  Object.assign(stationForm, rowData);
  dialogVisible.value = true;
  
  // 异步设置表单引用，确保DOM已更新
  setTimeout(() => {
    if (stationFormRef.value) {
      stationFormRef.value.clearValidate();
    }
  }, 0);
}

// 删除单个基站
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除基站 "${row.name}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await axios.delete(`/api/stations/${row.id}`);
      ElMessage.success('删除成功');
      fetchStations(); // 重新加载基站列表
    } catch (error) {
      console.error('删除基站错误:', error);
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    }
  }).catch(() => {
    // 取消删除，不做处理
  });
}

// 提交表单
const handleSubmit = async () => {
  if (!stationFormRef.value) return;
  
  await stationFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        if (dialogType.value === 'add') {
          // 添加基站
          await axios.post('/api/stations', stationForm);
          ElMessage.success('添加成功');
        } else {
          // 更新基站
          await axios.put(`/api/stations/${stationForm.id}`, stationForm);
          ElMessage.success('更新成功');
        }
        dialogVisible.value = false;
        fetchStations(); // 重新加载基站列表
      } catch (error) {
        console.error('保存基站错误:', error);
        ElMessage.error(
          (dialogType.value === 'add' ? '添加失败: ' : '更新失败: ') + 
          (error.response?.data?.message || error.message || '未知错误')
        );
      } finally {
        submitLoading.value = false;
      }
    } else {
      return false;
    }
  });
}

// 重置表单
const resetForm = () => {
  if (stationFormRef.value) {
    stationFormRef.value.resetFields();
  }
}

// 组件挂载
onMounted(() => {
  fetchStations();
  fetchMaps();
  updateTableHeight();
  setupResizeObserver();
})

// 组件卸载前清理
onBeforeUnmount(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  } else {
    window.removeEventListener('resize', updateTableHeight);
  }
})
</script>

<style scoped>
.station-view-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
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
  display: flex;
  padding: 0 20px;
  overflow: hidden;
  margin-bottom: 20px;
}

.station-table-wrapper {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.station-table {
  width: 100%;
}

.search-bar {
  margin-top: 15px;
}

.action-bar {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.operation-buttons {
  display: flex;
  gap: 8px;
}

.text-center {
  display: flex;
  justify-content: center;
  align-items: center;
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
  
  .station-table-wrapper {
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