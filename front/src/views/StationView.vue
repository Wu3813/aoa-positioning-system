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
                <el-option label="初始化" :value="2" />
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
          <el-button type="success" @click="handleCheckAllStatus" :loading="checkAllLoading">
            <el-icon><Refresh /></el-icon> 检查所有状态
          </el-button>
          <el-button type="warning" @click="handleBatchRefresh" :disabled="!multipleSelection.length" :loading="batchRefreshLoading">
            <el-icon><Refresh /></el-icon> 批量刷新
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
          :data="filteredStationList" 
          @selection-change="handleSelectionChange"
          v-loading="loading"
          height="calc(100vh - 320px)"
          border
          stripe
          class="station-table"
          style="width: 100%;"
          @sort-change="handleSortChange"
        >
          <el-table-column type="selection" width="35" fixed="left" />
          <el-table-column prop="code" label="基站编号" width="105" fixed="left" show-overflow-tooltip sortable="custom" />
          <el-table-column label="状态" width="90" fixed="left" sortable="custom" prop="status" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.status === 2" type="info">初始化</el-tag>
              <el-tag v-else-if="scope.row.status === 1" type="success">在线</el-tag>
              <el-tag v-else type="danger">离线</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="扫描状态" width="85" fixed="left" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.scanEnabled === null" type="info" size="small">未知</el-tag>
              <el-tag v-else-if="scope.row.scanEnabled" type="success" size="small">开启</el-tag>
              <el-tag v-else type="warning" size="small">关闭</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="基站名称" width="150" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="macAddress" label="MAC地址" width="150" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="ipAddress" label="IP地址" width="130" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="model" label="基站型号" width="120" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="firmwareVersion" label="固件版本" width="120" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="mapName" label="所属地图" width="120" show-overflow-tooltip sortable="custom" />
          <el-table-column label="三轴加速度" width="200">
            <template #default="scope">
              <div>X: {{ scope.row.positionX || '-' }}</div>
              <div>Y: {{ scope.row.positionY || '-' }}</div>
              <div>Z: {{ scope.row.positionZ || '-' }}</div>
            </template>
          </el-table-column>
          <el-table-column label="方位角" width="100" sortable="custom">
            <template #default="scope">
              {{ formatCoordinate(scope.row.orientation) }}°
            </template>
          </el-table-column>
          <el-table-column label="坐标(m)" width="200" align="center">
            <template #default="scope">
              <div>X: {{ formatCoordinate(scope.row.coordinateX) }}</div>
              <div>Y: {{ formatCoordinate(scope.row.coordinateY) }}</div>
              <div>Z: {{ formatCoordinate(scope.row.coordinateZ) }}</div>
            </template>
          </el-table-column>
          <el-table-column label="最后通讯时间" width="180" show-overflow-tooltip sortable="custom" prop="lastCommunication">
            <template #default="scope">
              {{ formatDateTime(scope.row.lastCommunication) }}
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180" show-overflow-tooltip sortable="custom" prop="createTime">
            <template #default="scope">
              {{ formatDateTime(scope.row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
          <el-table-column label="操作" width="280" fixed="right">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button-group class="operation-row">
                  <el-button type="default" size="small" @click="handleRefreshStation(scope.row)" :loading="refreshingStations.includes(scope.row.id)">
                    刷新
                  </el-button>
                  <el-button type="default" size="small" @click="handleEdit(scope.row)">
                    修改
                  </el-button>
                  <el-button type="default" size="small" @click="handleConfig(scope.row)">
                    配置
                  </el-button>
                  
                  <el-button type="default" size="small" @click="handleRestart(scope.row)">
                    重启
                  </el-button>
                </el-button-group>
                <el-button-group class="operation-row">
                  <el-button type="default" size="small" @click="handleLocate(scope.row)">
                    查找基站
                  </el-button>
                  <el-button type="default" size="small" @click="handleUpdate(scope.row)">
                    固件升级
                  </el-button>
                  <el-button type="default" size="small" @click="handleFactoryReset(scope.row)">
                    恢复出厂
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
        <!-- 基本可编辑信息 -->
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
        
        <el-form-item label="IP地址" prop="ipAddress">
          <el-input v-model="stationForm.ipAddress" placeholder="请输入IP地址" style="width: 100%" />
        </el-form-item>
        
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
        
        <el-form-item label="基站坐标(m)">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-input-number
                v-model="stationForm.coordinateX"
                :precision="3"
                placeholder="请输入X坐标"
                style="width: 100%"
              >
                <template #prepend>X轴</template>
              </el-input-number>
            </el-col>
            <el-col :span="8">
              <el-input-number
                v-model="stationForm.coordinateY"
                :precision="3"
                placeholder="请输入Y坐标"
                style="width: 100%"
              >
                <template #prepend>Y轴</template>
              </el-input-number>
            </el-col>
            <el-col :span="8">
              <el-input-number
                v-model="stationForm.coordinateZ"
                :precision="3"
                placeholder="请输入Z坐标"
                style="width: 100%"
              >
                <template #prepend>Z轴</template>
              </el-input-number>
            </el-col>
          </el-row>
        </el-form-item>
        
        <el-form-item label="备注" prop="remark">
          <el-input 
            v-model="stationForm.remark" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入备注信息"
          />
        </el-form-item>
        
        <!-- 基站基本信息 -->
        <el-divider>基站基本信息</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="MAC地址">
              <el-input v-model="stationForm.macAddress" placeholder="自动获取" readonly disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="基站型号">
              <el-input v-model="stationForm.model" placeholder="自动获取" readonly disabled />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="固件版本">
              <el-input v-model="stationForm.firmwareVersion" placeholder="自动获取" readonly disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="扫描功能">
              <el-input 
                :value="stationForm.scanEnabled === null ? '未知' : (stationForm.scanEnabled ? '开启' : '关闭')" 
                placeholder="自动获取" 
                readonly 
                disabled
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="三轴加速度">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-input
                v-model="stationForm.positionX"
                placeholder="自动获取"
                readonly
                disabled
              >
                <template #prepend>X轴</template>
              </el-input>
            </el-col>
            <el-col :span="8">
              <el-input
                v-model="stationForm.positionY"
                placeholder="自动获取"
                readonly
                disabled
              >
                <template #prepend>Y轴</template>
              </el-input>
            </el-col>
            <el-col :span="8">
              <el-input
                v-model="stationForm.positionZ"
                placeholder="自动获取"
                readonly
                disabled
              >
                <template #prepend>Z轴</template>
              </el-input>
            </el-col>
          </el-row>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="success" @click="handleTestConnection" :loading="testingConnection">
            信息获取测试
          </el-button>
          <el-button 
            type="primary" 
            @click="handleEnableBroadcast" 
            :disabled="!udpConnected"
            :loading="enablingBroadcast"
          >
            开启标签广播数据上报
          </el-button>
          <el-button 
            type="warning" 
            @click="handleEnableScanning" 
            :disabled="!udpConnected"
            :loading="enablingScanning"
          >
            开启扫描
          </el-button>
          <div style="flex: 1"></div>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 配置基站对话框 -->
    <el-dialog
      v-model="configDialogVisible"
      :title="`配置基站 - ${currentConfigStation?.name || ''}`"
      width="300px"
      destroy-on-close
    >
      <div class="config-container">
        <div class="config-section">
          <h4 class="section-title">预设配置</h4>
          <div class="config-buttons-row">
            <el-button 
              type="primary" 
              @click="handleConfig1" 
              :loading="config1Loading"
              size="small"
            >
              配置1
            </el-button>
            <el-button 
              type="primary" 
              @click="handleConfig2" 
              :loading="config2Loading"
              size="small"
            >
              配置2
            </el-button>
          </div>
        </div>
        
        <div class="config-section">
          <h4 class="section-title">RSSI配置</h4>
          <div class="config-row-inline">
            <span class="item-label">RSSI值：</span>
            <el-input-number
              v-model="rssiValue"
              :min="-100"
              :max="-40"
              :step="1"
              size="small"
              style="width: 90px"
              placeholder="RSSI"
            />
            <el-button 
              type="primary" 
              @click="handleConfigRSSI" 
              :loading="configRSSILoading" 
              :disabled="!isRssiValid"
              size="small"
            >
              保存
            </el-button>
          </div>
          <div class="config-hint-inline">
            <span class="hint-text">范围：-100 至 -40 dBm</span>
            <span v-if="rssiErrorMessage" class="error-text">{{ rssiErrorMessage }}</span>
          </div>
        </div>
        
        <div class="config-section">
          <h4 class="section-title">目标IP端口配置</h4>
          <div class="config-row-inline">
            <span class="item-label">目标IP：</span>
            <el-input 
              v-model="targetIp" 
              placeholder="IP地址"
              size="small"
              style="width: 90px"
            />
          </div>
          <div class="config-row-inline">
            <span class="item-label">端口号：</span>
            <el-input-number 
              v-model="targetPort" 
              :min="1" 
              :max="65535" 
              :step="1"
              size="small"
              style="width: 90px"
              placeholder="端口"
            />
            <el-button 
              type="primary" 
              @click="handleConfigTarget" 
              :loading="configTargetLoading"
              :disabled="!isTargetValid"
              size="small"
            >
              保存
            </el-button>
          </div>
          <div class="config-hint-inline">
            <span class="hint-text">端口范围：1-65535（不能是8833）</span>
            <span v-if="targetErrorMessage" class="error-text">{{ targetErrorMessage }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete, Edit, Connection } from '@element-plus/icons-vue'
import axios from 'axios'

const stationList = ref([])
const mapList = ref([])
const loading = ref(false)
const submitLoading = ref(false)
const checkAllLoading = ref(false)
const batchRefreshLoading = ref(false)
const refreshingStations = ref([]) // 正在刷新的基站ID列表
const dialogVisible = ref(false)
const dialogType = ref('add')
const stationFormRef = ref(null)
const tableMaxHeight = ref('calc(100vh - 320px)')
const resizeObserver = ref(null)
const autoRefreshTimer = ref(null) // 添加自动刷新定时器引用
const testingConnection = ref(false) // 测试连接状态
const udpConnected = ref(false) // UDP连接成功状态
const enablingBroadcast = ref(false) // 开启标签广播状态
const enablingScanning = ref(false) // 开启扫描状态
const configDialogVisible = ref(false)
const currentConfigStation = ref(null)
const rssiValue = ref(-80)
const config1Loading = ref(false)
const config2Loading = ref(false)
const configRSSILoading = ref(false)
const configTargetLoading = ref(false)
const targetIp = ref('')
const targetPort = ref(null)

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
  positionX: '',
  positionY: '',
  positionZ: '',
  orientation: 0,
  coordinateX: null,
  coordinateY: null,
  coordinateZ: null,
  status: 2,
  scanEnabled: null,
  remark: ''
})

// 表单校验规则 - 只校验可编辑字段
const rules = {
  code: [
    { required: true, message: '请输入基站编号', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]+$/, message: '基站编号只能包含字母、数字、下划线和横线', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入基站名称', trigger: 'blur' }
  ],
  ipAddress: [
    { required: true, message: '请输入IP地址', trigger: 'blur' },
    { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'IP地址格式不正确', trigger: 'blur' }
  ],
  mapId: [
    { required: true, message: '请选择所属地图', trigger: 'change' }
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
    
    // 添加时间戳避免缓存
    params._t = new Date().getTime();
    
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

// 刷新单个基站状态
const handleRefreshStation = async (row) => {
  refreshingStations.value.push(row.id);
  try {
    const response = await axios.post(`/api/stations/${row.id}/refresh`);
    if (response.data.success && response.data.data) {
      // 无论成功还是失败，都更新基站数据
      const index = stationList.value.findIndex(station => station.id === row.id);
      if (index !== -1) {
        Object.assign(stationList.value[index], response.data.data);
      }
      
      // 根据基站状态显示不同的消息
      if (response.data.data.status === 1) {
        ElMessage.success('基站信息刷新成功');
      } else {
        ElMessage.warning('状态已更新');
      }
    } else {
      ElMessage.warning(response.data.message || '刷新失败');
    }
  } catch (error) {
    console.error('刷新基站状态错误:', error);
    ElMessage.error('刷新失败: ' + (error.response?.data?.message || error.message || '网络错误'));
  } finally {
    const index = refreshingStations.value.indexOf(row.id);
    if (index > -1) {
      refreshingStations.value.splice(index, 1);
    }
  }
}

// 检查所有基站状态
const handleCheckAllStatus = async () => {
  checkAllLoading.value = true;
  try {
    const response = await axios.post('/api/stations/check-all-status');
    if (response.data.success) {
      ElMessage.success(response.data.message);
      // 稍等片刻确保后端更新完成，然后重新加载基站列表
      setTimeout(async () => {
        await fetchStations();
      }, 500); // 延迟500ms确保数据库更新完成
    } else {
      ElMessage.warning(response.data.message || '检查失败');
    }
  } catch (error) {
    console.error('检查所有基站状态错误:', error);
    ElMessage.error('检查失败: ' + (error.response?.data?.message || error.message || '网络错误'));
  } finally {
    checkAllLoading.value = false;
  }
}

// 批量刷新选中的基站
const handleBatchRefresh = async () => {
  if (multipleSelection.value.length === 0) {
    ElMessage.warning('请至少选择一个基站');
    return;
  }
  
  batchRefreshLoading.value = true;
  try {
    const ids = multipleSelection.value.map(station => station.id);
    const response = await axios.post('/api/stations/batch/refresh', { ids });
    
    if (response.data.success) {
      ElMessage.success(response.data.message);
      // 重新加载基站列表以显示最新状态
      await fetchStations();
    } else {
      ElMessage.warning(response.data.message || '批量刷新失败');
    }
  } catch (error) {
    console.error('批量刷新基站错误:', error);
    ElMessage.error('批量刷新失败: ' + (error.response?.data?.message || error.message || '网络错误'));
  } finally {
    batchRefreshLoading.value = false;
  }
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
  udpConnected.value = false; // 重置UDP连接状态
  Object.assign(stationForm, {
    id: null,
    code: '',
    name: '',
    macAddress: '',
    ipAddress: '',
    model: '',
    firmwareVersion: '',
    mapId: null,
    positionX: '',
    positionY: '',
    positionZ: '',
    orientation: 0,
    coordinateX: null,
    coordinateY: null,
    coordinateZ: null,
    status: 2,
    scanEnabled: null,
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
  udpConnected.value = false; // 重置UDP连接状态
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

// 测试连接
const handleTestConnection = async () => {
  if (!stationForm.ipAddress || !stationForm.ipAddress.trim()) {
    ElMessage.warning('请先输入IP地址');
    return;
  }
  
  testingConnection.value = true;
  try {
    const response = await axios.post('/api/stations/test-connection', { 
      ipAddress: stationForm.ipAddress.trim() 
    });
    
    if (response.data.success) {
      ElMessage.success('UDP连接测试成功，自动获取基站信息');
      udpConnected.value = true; // 设置UDP连接成功状态
      
      // 自动填充获取到的信息
      const data = response.data.data;
      if (data) {
        if (data.macAddress) stationForm.macAddress = data.macAddress;
        if (data.model) stationForm.model = data.model;
        if (data.firmwareVersion) stationForm.firmwareVersion = data.firmwareVersion;
        if (data.scanEnabled !== undefined) stationForm.scanEnabled = data.scanEnabled;
        
        // 填充加速度数据
        if (data.accelerationInfo) {
          if (data.accelerationInfo.accelerationX) stationForm.positionX = data.accelerationInfo.accelerationX;
          if (data.accelerationInfo.accelerationY) stationForm.positionY = data.accelerationInfo.accelerationY;
          if (data.accelerationInfo.accelerationZ) stationForm.positionZ = data.accelerationInfo.accelerationZ;
        }
      }
    } else {
      ElMessage.warning(response.data.message || 'UDP连接测试失败，请检查IP地址或网络连接');
      udpConnected.value = false; // 连接失败时重置状态
    }
  } catch (error) {
    console.error('测试连接错误:', error);
    ElMessage.error('UDP连接测试失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    udpConnected.value = false; // 连接失败时重置状态
  } finally {
    testingConnection.value = false;
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!stationFormRef.value) return;
  
  await stationFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        // 为空的硬件信息字段填充占位数据
        const submitData = { ...stationForm };
        
        // 判断是否获取到硬件信息，如果没有则设置为初始化状态
        const hasHardwareInfo = submitData.macAddress && 
                               submitData.macAddress.trim() !== '' && 
                               submitData.macAddress !== '待获取';
        
        if (!submitData.macAddress || submitData.macAddress.trim() === '') {
          submitData.macAddress = '待获取';
        }
        if (!submitData.model || submitData.model.trim() === '') {
          submitData.model = '待获取';
        }
        if (!submitData.firmwareVersion || submitData.firmwareVersion.trim() === '') {
          submitData.firmwareVersion = '待获取';
        }
        if (!submitData.positionX || submitData.positionX === '') {
          submitData.positionX = '0';
        }
        if (!submitData.positionY || submitData.positionY === '') {
          submitData.positionY = '0';
        }
        if (!submitData.positionZ || submitData.positionZ === '') {
          submitData.positionZ = '0';
        }
        
        // 如果是添加操作且没有获取到硬件信息，设置为初始化状态
        if (dialogType.value === 'add' && !hasHardwareInfo) {
          submitData.status = 2; // 初始化状态
        }
        
        if (dialogType.value === 'add') {
          // 添加基站
          await axios.post('/api/stations', submitData);
          ElMessage.success('添加成功');
        } else {
          // 更新基站
          await axios.put(`/api/stations/${submitData.id}`, submitData);
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

// 添加排序相关的变量
const sortOrder = ref({
  prop: '',
  order: ''
})

// 计算属性：根据排序条件处理基站列表
const filteredStationList = computed(() => {
  let list = [...stationList.value];
  
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
      
      // 特殊处理IP地址
      if (prop === 'ipAddress') {
        return compareIPAddresses(valueA, valueB, isAsc);
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

// IP地址排序辅助函数
const compareIPAddresses = (ipA, ipB, isAsc) => {
  // 处理空值
  if (!ipA && !ipB) return 0;
  if (!ipA) return isAsc ? -1 : 1;
  if (!ipB) return isAsc ? 1 : -1;

  // 将IP地址转换为数值进行比较
  const ipToNumber = (ip) => {
    if (!ip) return 0;
    const parts = ip.split('.');
    if (parts.length !== 4) return 0;
    
    return parts.reduce((acc, part, i) => {
      return acc + (parseInt(part, 10) * Math.pow(256, 3 - i));
    }, 0);
  };

  const numA = ipToNumber(ipA);
  const numB = ipToNumber(ipB);
  
  return isAsc ? numA - numB : numB - numA;
};

// 处理排序变化
const handleSortChange = ({ prop, order }) => {
  sortOrder.value = { prop, order };
}

// 组件挂载
onMounted(() => {
  fetchStations();
  fetchMaps();
  updateTableHeight();
  setupResizeObserver();
  startAutoRefresh();
})

// 组件卸载前清理
onBeforeUnmount(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  } else {
    window.removeEventListener('resize', updateTableHeight);
  }
  stopAutoRefresh();
})

// 添加自动刷新机制
const startAutoRefresh = () => {
  autoRefreshTimer.value = setInterval(async () => {
    await fetchStations();
  }, 30000); // 每30秒刷新一次
}

// 停止自动刷新机制
const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value);
    autoRefreshTimer.value = null;
  }
}

// 开启标签广播数据上报
const handleEnableBroadcast = async () => {
  if (!stationForm.ipAddress || !stationForm.ipAddress.trim()) {
    ElMessage.warning('请先输入IP地址');
    return;
  }
  
  enablingBroadcast.value = true;
  try {
    const response = await axios.post('/api/stations/enable-broadcast', {
      ipAddress: stationForm.ipAddress.trim()
    });
    
    if (response.data.success) {
      ElMessage.success('标签广播数据上报开启成功');
    } else {
      ElMessage.warning(response.data.message || '开启标签广播数据上报失败');
    }
  } catch (error) {
    console.error('开启标签广播数据上报错误:', error);
    ElMessage.error('开启标签广播数据上报失败: ' + (error.response?.data?.message || error.message || '网络错误'));
  } finally {
    enablingBroadcast.value = false;
  }
}

// 开启扫描
const handleEnableScanning = async () => {
  if (!stationForm.ipAddress || !stationForm.ipAddress.trim()) {
    ElMessage.warning('请先输入IP地址');
    return;
  }
  
  enablingScanning.value = true;
  try {
    const response = await axios.post('/api/stations/enable-scanning', {
      ipAddress: stationForm.ipAddress.trim()
    });
    
    if (response.data.success) {
      ElMessage.success('扫描开启成功');
    } else {
      ElMessage.warning(response.data.message || '开启扫描失败');
    }
  } catch (error) {
    console.error('开启扫描错误:', error);
    ElMessage.error('开启扫描失败: ' + (error.response?.data?.message || error.message || '网络错误'));
  } finally {
    enablingScanning.value = false;
  }
}

// 恢复出厂设置
const handleFactoryReset = (row) => {
  ElMessageBox.confirm(
    `确定要恢复基站 "${row.name}" 的出厂设置吗？此操作不可逆！`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const response = await axios.post('/api/stations/factory-reset', {
        ipAddress: row.ipAddress
      });
      
      if (response.data.success) {
        ElMessage.success(response.data.message);
      } else {
        ElMessage.warning(response.data.message || '恢复出厂设置失败');
      }
    } catch (error) {
      console.error('恢复出厂设置错误:', error);
      ElMessage.error('恢复出厂设置失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    }
  }).catch(() => {
    // 取消操作，不做处理
  });
}

// 重启基站
const handleRestart = (row) => {
  ElMessageBox.confirm(
    `确定要重启基站 "${row.name}" 吗？`,
    '确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const response = await axios.post('/api/stations/restart', {
        ipAddress: row.ipAddress
      });
      
      if (response.data.success) {
        ElMessage.success(response.data.message);
      } else {
        ElMessage.warning(response.data.message || '基站重启失败');
      }
    } catch (error) {
      console.error('基站重启错误:', error);
      ElMessage.error('基站重启失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    }
  }).catch(() => {
    // 取消操作，不做处理
  });
}

// 定位基站
const handleLocate = (row) => {
  ElMessageBox.confirm(
    `确定要定位基站 "${row.name}" 吗？基站灯将闪烁100次。`,
    '确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    }
  ).then(async () => {
    try {
      const response = await axios.post('/api/stations/locate', {
        ipAddress: row.ipAddress
      });
      
      if (response.data.success) {
        ElMessage.success(response.data.message);
      } else {
        ElMessage.warning(response.data.message || '基站定位失败');
      }
    } catch (error) {
      console.error('基站定位错误:', error);
      ElMessage.error('基站定位失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    }
  }).catch(() => {
    // 取消操作，不做处理
  });
}

// 更新基站
const handleUpdate = (row) => {
  ElMessage.info(`更新基站功能暂未实现 - 基站: ${row.name}`);
  // TODO: 实现更新基站功能
}

// 配置基站
const handleConfig = (row) => {
  currentConfigStation.value = row
  rssiValue.value = row.rssi || -80 // 使用基站当前的RSSI值，如果没有则使用默认值-80
  targetIp.value = row.targetIp || '' // 使用基站当前的目标IP，如果没有则为空
  targetPort.value = row.targetPort || null // 使用基站当前的目标端口，如果没有则为null
  configDialogVisible.value = true
}

// 配置1
const handleConfig1 = async () => {
  const row = currentConfigStation.value
  config1Loading.value = true
  try {
    const response = await axios.post('/api/stations/config1', {
      ipAddress: row.ipAddress
    });
    
    if (response.data.success) {
      ElMessage.success(response.data.message);
      configDialogVisible.value = false
    } else {
      ElMessage.warning(response.data.message || '基站配置1失败');
    }
  } catch (error) {
    console.error('基站配置1错误:', error);
    ElMessage.error('基站配置1失败: ' + (error.response?.data?.message || error.message || '网络错误'));
  } finally {
    config1Loading.value = false
  }
}

// 配置2
const handleConfig2 = async () => {
  const row = currentConfigStation.value
  config2Loading.value = true
  try {
    const response = await axios.post('/api/stations/config2', {
      ipAddress: row.ipAddress
    });
    
    if (response.data.success) {
      ElMessage.success(response.data.message);
      configDialogVisible.value = false
    } else {
      ElMessage.warning(response.data.message || '基站配置2失败');
    }
  } catch (error) {
    console.error('基站配置2错误:', error);
    ElMessage.error('基站配置2失败: ' + (error.response?.data?.message || error.message || '网络错误'));
  } finally {
    config2Loading.value = false
  }
}

// 配置RSSI
const handleConfigRSSI = async () => {
  const row = currentConfigStation.value
  
  // 最后检查（虽然按钮应该已经被禁用）
  if (!isRssiValid.value) {
    ElMessage.warning('请输入有效的RSSI值（-100到-40dBm的整数）')
    return
  }
  
  configRSSILoading.value = true
  try {
    const response = await axios.post('/api/stations/config-rssi', {
      ipAddress: row.ipAddress,
      rssi: rssiValue.value
    });
    
    if (response.data.success) {
      ElMessage.success(response.data.message);
      configDialogVisible.value = false
      // 刷新基站列表以显示最新的RSSI值
      await fetchStations()
    } else {
      ElMessage.warning(response.data.message || '基站配置RSSI失败');
    }
  } catch (error) {
    console.error('基站配置RSSI错误:', error);
    ElMessage.error('基站配置RSSI失败: ' + (error.response?.data?.message || error.message || '网络错误'));
  } finally {
    configRSSILoading.value = false
  }
}

// RSSI值验证计算属性
const isRssiValid = computed(() => {
  return rssiValue.value !== null && 
         rssiValue.value !== undefined && 
         rssiValue.value >= -100 && 
         rssiValue.value <= -40 &&
         Number.isInteger(rssiValue.value)
})

// RSSI错误信息计算属性
const rssiErrorMessage = computed(() => {
  if (rssiValue.value === null || rssiValue.value === undefined) {
    return ''
  }
  if (rssiValue.value < -100) {
    return 'RSSI值不能小于-100dBm'
  }
  if (rssiValue.value > -40) {
    return 'RSSI值不能大于-40dBm'
  }
  if (!Number.isInteger(rssiValue.value)) {
    return 'RSSI值必须为整数'
  }
  return ''
})

// 验证IP地址格式的辅助函数
const isValidIpAddress = (ip) => {
  if (!ip || ip.trim() === '') {
    return false
  }
  
  const parts = ip.split('.')
  if (parts.length !== 4) {
    return false
  }
  
  return parts.every(part => {
    const num = parseInt(part, 10)
    return !isNaN(num) && num >= 0 && num <= 255
  })
}

// 目标IP端口验证计算属性
const isTargetValid = computed(() => {
  return isValidIpAddress(targetIp.value) && 
         targetPort.value !== null && 
         targetPort.value !== undefined && 
         targetPort.value >= 1 && 
         targetPort.value <= 65535 &&
         targetPort.value !== 8833 &&
         Number.isInteger(targetPort.value)
})

// 目标IP端口错误信息计算属性
const targetErrorMessage = computed(() => {
  if (!targetIp.value && !targetPort.value) {
    return ''
  }
  
  if (targetIp.value && !isValidIpAddress(targetIp.value)) {
    return '目标IP地址格式不正确'
  }
  
  if (targetPort.value !== null && targetPort.value !== undefined) {
    if (targetPort.value < 1) {
      return '端口不能小于1'
    }
    if (targetPort.value > 65535) {
      return '端口不能大于65535'
    }
    if (targetPort.value === 8833) {
      return '端口不能是8833'
    }
    if (!Number.isInteger(targetPort.value)) {
      return '端口必须为整数'
    }
  }
  
  return ''
})

// 配置目标IP端口
const handleConfigTarget = async () => {
  const row = currentConfigStation.value
  
  // 最后检查（虽然按钮应该已经被禁用）
  if (!isTargetValid.value) {
    ElMessage.warning('请输入有效的目标IP地址和端口')
    return
  }
  
  configTargetLoading.value = true
  try {
    const response = await axios.post('/api/stations/config-target', {
      ipAddress: row.ipAddress,
      targetIp: targetIp.value,
      targetPort: targetPort.value
    });
    
    if (response.data.success) {
      ElMessage.success(response.data.message);
      configDialogVisible.value = false
      // 刷新基站列表以显示最新数据
      await fetchStations()
    } else {
      ElMessage.warning(response.data.message || '基站配置目标IP端口失败');
    }
  } catch (error) {
    console.error('基站配置目标IP端口错误:', error);
    ElMessage.error('基站配置目标IP端口失败: ' + (error.response?.data?.message || error.message || '网络错误'));
  } finally {
    configTargetLoading.value = false
  }
}
</script>

<style scoped>
.station-view-container {
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

.station-table-wrapper {
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

.station-table {
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
  max-width: 270px;
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
  align-items: center;
  gap: 10px;
}

.config-container {
  padding: 0;
}

.config-section {
  margin-bottom: 12px;
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-buttons-row {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.config-row-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.item-label {
  width: 85px;
  font-weight: 500;
  color: #606266;
  font-size: 13px;
  flex-shrink: 0;
  text-align: right;
}

.config-hint-inline {
  margin-left: 91px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 3px;
}

.hint-text {
  font-size: 11px;
  color: #909399;
  line-height: 1.2;
}

.error-text {
  color: #f56c6c;
  font-size: 11px;
}

.section-title {
  margin: 0 0 8px 0 !important;
  color: #303133;
  font-size: 13px;
  font-weight: 600;
  padding-bottom: 3px;
  border-bottom: 1px solid #e6e8eb;
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
