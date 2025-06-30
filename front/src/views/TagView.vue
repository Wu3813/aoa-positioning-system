<template>
  <div class="tag-view-container">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>标签管理</h2>
        <!-- 搜索/过滤栏 - 调整布局以保持一行 -->
        <div class="search-bar">
         <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">

            <el-form-item label="标签名称" class="search-item">
              <el-input v-model="searchForm.name" placeholder="请输入标签名称" clearable style="width: 150px;"/>
            </el-form-item>

            <el-form-item label="状态" class="search-item">
              <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 120px;"> 
                <el-option label="在线" :value="1" />
                <el-option label="离线" :value="0" />
              </el-select>
            </el-form-item>
            <el-form-item class="search-buttons">
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
      <div class="tag-table-wrapper">
        <el-table 
          :data="filteredTagList" 
          @selection-change="handleSelectionChange"
          v-loading="loading"
          height="calc(100vh - 320px)"
          border
          stripe
          class="tag-table"
          style="width: 100%;"
          row-key="id"
          @sort-change="handleSortChange" 
        >
          <el-table-column type="selection" width="55" fixed="left" />
          <el-table-column prop="name" label="标签名称" width="150" fixed="left" show-overflow-tooltip sortable="custom" />
          <el-table-column label="状态" width="100" fixed="left">
            <template #default="scope">
              <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
                {{ scope.row.status === 1 ? '在线' : '离线' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="电量" width="100" prop="batteryLevel" sortable="custom" fixed="left">
            <template #default="scope">
              <el-progress 
                :percentage="scope.row.batteryLevel || 0" 
                :status="getBatteryStatus(scope.row.batteryLevel)"
                :stroke-width="10"
              />
            </template>
          </el-table-column>
          <el-table-column label="RSSI" width="100" prop="rssi" sortable="custom" fixed="left">
            <template #default="scope">
              {{ scope.row.rssi || '-' }} dBm
            </template>
          </el-table-column>
          <el-table-column label="MAC地址" width="150" show-overflow-tooltip sortable="custom" prop="macAddress">
            <template #default="scope">
              {{ formatMacAddress(scope.row.macAddress) }}
            </template>
          </el-table-column>
          <el-table-column label="坐标位置" width="150">
            <template #default="scope">
              <div>X: {{ formatCoordinate(scope.row.positionX) }} m</div>
              <div>Y: {{ formatCoordinate(scope.row.positionY) }} m</div>
            </template>
          </el-table-column>
          <el-table-column prop="model" label="标签型号" width="120" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="firmwareVersion" label="固件版本" width="120" show-overflow-tooltip sortable="custom" />
          <el-table-column label="所属地图" width="120" show-overflow-tooltip sortable="custom">
            <template #default="scope">
              {{ getMapNameById(scope.row.mapId) }}
            </template>
          </el-table-column>

          <el-table-column label="最后可见时间" width="180" show-overflow-tooltip prop="lastSeen" sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.lastSeen) }}
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180" show-overflow-tooltip prop="createTime" sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
          <el-table-column label="操作" width="140" fixed="right">
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

    <!-- 添加/编辑标签对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加标签' : '编辑标签'"
      width="700px"
      @close="resetForm"
      destroy-on-close
    >
      <el-form 
        :model="tagForm" 
        :rules="rules"
        ref="tagFormRef"
        label-width="100px"
        status-icon
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="标签名称" prop="name">
              <el-input v-model="tagForm.name" placeholder="请输入标签名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="MAC地址" prop="macAddress">
              <el-input 
                v-model="tagForm.macAddress" 
                placeholder="请输入12位十六进制字符，不要包含冒号或连字符"
                maxlength="12"
                style="text-transform: uppercase;"
              >
                <template #suffix>
                  <el-tooltip content="输入格式如：84FD27EEE603（12位十六进制，不含分隔符）" placement="top">
                    <el-icon style="color: #909399; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="标签型号" prop="model">
              <el-input v-model="tagForm.model" placeholder="请输入标签型号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="固件版本" prop="firmwareVersion">
              <el-input v-model="tagForm.firmwareVersion" placeholder="请输入固件版本" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 移除地图选择，改为自动从JSON数据获取 -->
        
        <el-form-item label="备注" prop="remark">
          <el-input 
            v-model="tagForm.remark" 
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
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, watch, computed } from 'vue' /* 添加 watch */
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete, Edit, QuestionFilled } from '@element-plus/icons-vue'
import axios from 'axios'

const tagList = ref([])
const mapCache = ref(new Map()) // 地图缓存
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('add')
const tagFormRef = ref(null)
const tableMaxHeight = ref('calc(100vh - 320px)')
const resizeObserver = ref(null)

// 搜索表单
const searchForm = reactive({
  name: '',
  status: ''
})

// 表格多选
const multipleSelection = ref([])

// 标签表单
const tagForm = reactive({
  id: null,
  name: '',
  macAddress: '',
  model: '',
  firmwareVersion: '',
  remark: ''
})

// 表单校验规则
const rules = {
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' }
  ],
  macAddress: [
    { required: true, message: '请输入MAC地址', trigger: 'blur' },
    { pattern: /^[0-9A-Fa-f]{12}$/, message: 'MAC地址格式不正确，请输入12位十六进制字符（如：84FD27EEE603），不要包含冒号或连字符', trigger: 'blur' }
  ],
  model: [
    { required: true, message: '请输入标签型号', trigger: 'blur' }
  ],
  firmwareVersion: [
    { required: true, message: '请输入固件版本', trigger: 'blur' }
  ]
}

// 获取电池状态样式
const getBatteryStatus = (batteryLevel) => {
  if (!batteryLevel) return '';
  if (batteryLevel <= 20) return 'exception';
  if (batteryLevel <= 50) return 'warning';
  return 'success';
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

// 格式化MAC地址显示（添加冒号）
const formatMacAddress = (macAddress) => {
  if (!macAddress) return '-';
  if (macAddress.length === 12) {
    // 将12位连续格式转换为标准格式 (例: 84FD27EEE603 -> 84:FD:27:EE:E6:03)
    return macAddress.replace(/(.{2})/g, '$1:').slice(0, -1);
  }
  return macAddress; // 如果已经是标准格式或其他格式，直接返回
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

// 获取标签列表
const fetchTags = async () => {
  loading.value = true;
  try {
    const params = {};
    

    if (searchForm.name && searchForm.name.trim()) {
      params.name = searchForm.name.trim();
    }

    if (searchForm.status !== '') {
      params.status = searchForm.status;
    }
    
    const response = await axios.get('/api/tags', { params });
    
    // 与 StationView.vue 保持一致
    if (response.data && Array.isArray(response.data.content)) {
      tagList.value = response.data.content;
    } else if (Array.isArray(response.data)) {
      tagList.value = response.data;
    } else {
      tagList.value = [];
    }
  } catch (error) {
    console.error('获取标签列表错误:', error);
    ElMessage.error('获取标签列表失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    tagList.value = [];
  } finally {
    loading.value = false;
  }
}

// 获取地图列表并缓存
const fetchMapsToCache = async () => {
  try {
    const response = await axios.get('/api/maps');
    const maps = Array.isArray(response.data) ? response.data : 
                 (response.data && Array.isArray(response.data.content)) ? response.data.content : [];
    
    // 清空旧缓存并重新填充
    mapCache.value.clear();
    maps.forEach(map => {
      mapCache.value.set(map.mapId, map.name);
    });
  } catch (error) {
    console.error('获取地图列表错误:', error);
  }
}

// 搜索处理
const handleSearch = () => {
  fetchTags();
}

// 重置搜索
const handleResetSearch = () => {
  searchForm.name = '';
  searchForm.status = '';
  fetchTags();
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
      await axios.delete('/api/tags/batch', { data: ids });
      ElMessage.success('批量删除成功');
      fetchTags();
    } catch (error) {
      console.error('批量删除标签错误:', error);
      ElMessage.error('批量删除失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    }
  }).catch(() => {
    // 取消删除，不做处理
  });
}

// 获取地图名称的工具方法（从缓存中获取）
const getMapNameById = (mapId) => {
  if (!mapId) return '-';
  return mapCache.value.get(mapId) || '未知地图';
};

// MAC地址输入格式化
const formatMacInput = (value) => {
  if (!value) return '';
  // 移除所有非十六进制字符，并转换为大写
  return value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().substring(0, 12);
};

// 监听MAC地址输入变化
watch(() => tagForm.macAddress, (newValue) => {
  if (newValue) {
    tagForm.macAddress = formatMacInput(newValue);
  }
});

// 添加标签
const handleAdd = () => {
  dialogType.value = 'add';
  Object.assign(tagForm, {
    id: null,
    name: '',
    macAddress: '',
    model: '',
    firmwareVersion: '',
    remark: ''
  });
  dialogVisible.value = true;
  
  // 使用 nextTick 确保 DOM 更新后再清空校验
  nextTick(() => {
    if (tagFormRef.value) {
      tagFormRef.value.clearValidate();
    }
  });
}

// 编辑标签
const handleEdit = (row) => {
  dialogType.value = 'edit';
  // 只复制用户可以编辑的字段
  Object.assign(tagForm, {
    id: row.id,
    name: row.name || '',
    macAddress: row.macAddress || '',
    model: row.model || '',
    firmwareVersion: row.firmwareVersion || '',
    remark: row.remark || ''
  });
  dialogVisible.value = true;
  
  // 使用 nextTick 确保 DOM 更新后再清空校验
  nextTick(() => {
    if (tagFormRef.value) {
      tagFormRef.value.clearValidate();
    }
  });
}

// 删除单个标签
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除标签 "${row.name}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await axios.delete(`/api/tags/${row.id}`);
      ElMessage.success('删除成功');
      fetchTags();
    } catch (error) {
      console.error('删除标签错误:', error);
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    }
  }).catch(() => {
    // 取消删除，不做处理
  });
}

// 提交表单
const handleSubmit = async () => {
  if (!tagFormRef.value) return;
  
  await tagFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        // 只需要提交mapId，后端不再存储mapName
        
        if (dialogType.value === 'add') {
          await axios.post('/api/tags', tagForm);
          ElMessage.success('添加成功');
        } else {
          await axios.put(`/api/tags/${tagForm.id}`, tagForm);
          ElMessage.success('更新成功');
        }
        dialogVisible.value = false;
        fetchTags();
      } catch (error) {
        console.error('保存标签错误:', error);
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
  if (tagFormRef.value) {
    tagFormRef.value.resetFields();
  }
}

// 更新标签状态（如果需要单独更新状态和位置信息）
const updateTagStatus = async (id, tagStatus) => {
  try {
    await axios.put(`/api/tags/${id}/status`, tagStatus);
    ElMessage.success('状态更新成功');
    fetchTags(); // 重新加载标签列表
  } catch (error) {
    console.error('更新标签状态错误:', error);
    ElMessage.error('状态更新失败: ' + (error.response?.data?.message || error.message || '未知错误'));
  }
}

// 添加排序相关的变量
const sortOrder = ref({
  prop: '',
  order: ''
})

// 计算属性：根据排序条件处理标签列表
const filteredTagList = computed(() => {
  let list = [...tagList.value];
  
  // 如果有排序条件，则进行排序
  if (sortOrder.value.prop && sortOrder.value.order) {
    const { prop, order } = sortOrder.value;
    const isAsc = order === 'ascending';
    
    list.sort((a, b) => {
      let valueA = a[prop];
      let valueB = b[prop];
      
      // 特殊处理日期时间字段
      if (prop === 'lastSeen' || prop === 'createTime') {
        valueA = valueA ? new Date(valueA).getTime() : 0;
        valueB = valueB ? new Date(valueB).getTime() : 0;
      }
      
      // 特殊处理MAC地址
      if (prop === 'macAddress') {
        // 移除冒号或连字符，统一比较
        valueA = valueA ? valueA.replace(/[:-]/g, '') : '';
        valueB = valueB ? valueB.replace(/[:-]/g, '') : '';
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

// 处理排序变化
const handleSortChange = ({ prop, order }) => {
  sortOrder.value = { prop, order };
}

// 定时器引用
const refreshTimer = ref(null);

// 自动刷新数据
const startAutoRefresh = () => {
  // 每3秒刷新一次标签数据
  refreshTimer.value = setInterval(() => {
    // 只有在对话框关闭且没有正在加载时才刷新
    if (!dialogVisible.value && !loading.value) {
      fetchTags();
    }
  }, 3000); // 3秒 = 3000毫秒
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
}

// 组件挂载
onMounted(() => {
  fetchTags();
  fetchMapsToCache(); // 获取地图列表到缓存
  updateTableHeight();
  setupResizeObserver();
  startAutoRefresh(); // 启动自动刷新
})

// 组件卸载前清理
onBeforeUnmount(() => {
  stopAutoRefresh(); // 停止自动刷新
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  } else {
    window.removeEventListener('resize', updateTableHeight);
  }
})
</script>

<style scoped>
.tag-view-container {
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

.tag-table-wrapper {
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

.tag-table {
  width: 100%;
  height: 100%;
}

.search-bar {
  margin-top: 15px;
  flex-shrink: 0;
}

/* 调整搜索栏内联表单样式 */
.search-form-inline .el-form-item {
  margin-bottom: 0; /* 移除内联表单项的下边距 */
  margin-right: 10px; /* 调整右边距 */
}
.search-form-inline .search-buttons {
  margin-right: 0; /* 按钮组不需要右边距 */
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
  
  .tag-table-wrapper {
    padding: 10px;
  }
  
  .el-form-item {
    margin-bottom: 12px;
  }
  /* 响应式时允许搜索项换行 */
  .search-form-inline .el-form-item {
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