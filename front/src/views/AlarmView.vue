<template>
  <div class="alarm-view-container">
    <!-- 1. 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>报警管理</h2>
        <!-- 搜索/过滤栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch" class="search-form">
            <div class="form-row">
              <el-form-item label="围栏名称">
                <el-input v-model="searchForm.name" placeholder="请输入围栏名称" clearable />
              </el-form-item>
              <el-form-item label="所属地图">
                <el-select v-model="searchForm.mapId" placeholder="请选择地图" clearable style="width: 200px;">
                  <el-option 
                    v-for="map in mapList" 
                    :key="map.mapId"
                    :label="map.name" 
                    :value="map.mapId"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="时间">
                <el-date-picker
                  v-model="searchForm.timeRange"
                  type="datetimerange"
                  range-separator="-"
                  start-placeholder="开始时间"
                  end-placeholder="结束时间"
                  :shortcuts="dateShortcuts"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 380px;"
                />
              </el-form-item>
              <el-form-item class="button-item">
                <el-button type="primary" @click="handleSearch">
                  <el-icon><Search /></el-icon> 查询
                </el-button>
                <el-button @click="handleResetSearch">
                  <el-icon><Refresh /></el-icon> 重置
                </el-button>
              </el-form-item>
            </div>
          </el-form>
        </div>
        <!-- 操作栏 -->
        <div class="action-bar">
          <el-button type="danger" @click="handleBatchDelete" :disabled="!multipleSelection.length">
            <el-icon><Delete /></el-icon> 批量删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 2. 主要内容区域 -->
    <div class="main-content">
      <!-- 表格 -->
              <div class="alarm-table-wrapper">
        <el-table 
          :data="filteredAlarmList" 
          style="width: 100%" 
          v-loading="loading"
          height="calc(100vh - 320px)"
          border
          stripe
          class="alarm-table"
          @sort-change="handleSortChange"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="40" fixed="left" />
          <el-table-column prop="time" label="时间" min-width="180" show-overflow-tooltip sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.time) }}
            </template>
          </el-table-column>
          <el-table-column prop="geofenceName" label="围栏名称" min-width="150" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="mapName" label="地图名称" min-width="150" show-overflow-tooltip sortable="custom" />
          <el-table-column label="报警标签" min-width="120" show-overflow-tooltip>
            <template #default="scope">
              {{ getTagNameByMac(scope.row.alarmTag) }}
            </template>
          </el-table-column>
          <el-table-column label="报警坐标" width="150">
            <template #default="scope">
              <div>X: {{ formatCoordinate(scope.row.x) }} m</div>
              <div>Y: {{ formatCoordinate(scope.row.y) }} m</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="100">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button-group class="operation-row">
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
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Delete } from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const loading = ref(false)
const alarmList = ref([])
const mapList = ref([])
const multipleSelection = ref([])
const tagList = ref([]) // 存储标签信息

// 搜索表单
const searchForm = reactive({
  name: '',
  mapId: null,
  timeRange: null,
})



// 排序
const sortConfig = ref({
  prop: 'time',  // 默认按时间排序
  order: 'descending'  // 默认降序，最新的在前面
})

// 日期快捷选项
const dateShortcuts = [
  {
    text: '最近一天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24)
      return [start, end]
    }
  },
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setMonth(start.getMonth() - 1)
      return [start, end]
    }
  }
]

// 计算属性 - 过滤后的报警列表
const filteredAlarmList = computed(() => {
  let list = [...alarmList.value]
  
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
const fetchAlarms = async () => {
  loading.value = true
  try {
    const params = {}
    
    if (searchForm.name) params.geofenceName = searchForm.name
    if (searchForm.mapId) params.mapId = searchForm.mapId
    
    if (searchForm.timeRange && searchForm.timeRange.length === 2) {
      params.startTime = searchForm.timeRange[0]
      params.endTime = searchForm.timeRange[1]
    }
    
    if (sortConfig.value.prop) {
      params.sort = `${sortConfig.value.prop},${sortConfig.value.order === 'descending' ? 'desc' : 'asc'}`
    }
    
    const response = await axios.get('/api/alarms', { params })
    
    if (response.data && response.data.content) {
      alarmList.value = response.data.content
    } else if (response.data && Array.isArray(response.data)) {
      alarmList.value = response.data
    } else if (response.data && response.data.success && response.data.data) {
      alarmList.value = Array.isArray(response.data.data) ? response.data.data : []
    } else {
      alarmList.value = []
    }

    console.log('报警列表获取成功:', alarmList.value)
  } catch (error) {
    console.error('获取报警列表错误:', error)
    ElMessage.error('获取报警列表失败: ' + (error.response?.data?.message || error.message))
    alarmList.value = []
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

// 获取所有标签
const fetchTags = async () => {
  try {
    const response = await axios.get('/api/tags')
    if (Array.isArray(response.data)) {
      tagList.value = response.data
    } else if (response.data && Array.isArray(response.data.content)) {
      tagList.value = response.data.content
    } else if (response.data && response.data.success && response.data.data) {
      tagList.value = Array.isArray(response.data.data) ? response.data.data : []
    } else {
      tagList.value = []
    }
    console.log('标签列表获取成功:', tagList.value)
  } catch (error) {
    console.error('获取标签列表错误:', error)
    ElMessage.error('获取标签列表失败')
    tagList.value = []
  }
}

// 根据MAC地址获取标签名称
const getTagNameByMac = (mac) => {
  if (!mac) return '-'
  const tag = tagList.value.find(t => t.macAddress === mac)
  return tag ? tag.name : mac
}

const handleSearch = () => {
  fetchAlarms()
}

const handleResetSearch = () => {
  searchForm.name = ''
  searchForm.mapId = null
  searchForm.timeRange = null
  fetchAlarms()
}

const handleSortChange = ({ prop, order }) => {
  sortConfig.value.prop = prop
  sortConfig.value.order = order
  fetchAlarms()
}

// 格式化坐标数据
const formatCoordinate = (value) => {
  if (value === null || value === undefined) return '-';
  return parseFloat(value).toFixed(3);
}

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

// 行选择变化处理
const handleSelectionChange = (selection) => {
  multipleSelection.value = selection
}

// 删除单条报警记录
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除该报警记录吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await axios.delete(`/api/alarms/${row.id}`)
    if (response.data.success) {
      ElMessage.success('删除成功')
      fetchAlarms()
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除报警记录错误:', error)
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

// 批量删除报警记录
const handleBatchDelete = async () => {
  if (multipleSelection.value.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${multipleSelection.value.length} 条报警记录吗？此操作不可恢复！`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const promises = multipleSelection.value.map(item => 
      axios.delete(`/api/alarms/${item.id}`)
    )
    
    await Promise.all(promises)
    ElMessage.success('批量删除成功')
    fetchAlarms()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除错误:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

// 生命周期
onMounted(async () => {
  await Promise.all([
    fetchMaps(),     // 获取地图数据
    fetchTags()      // 获取标签数据
  ])
  fetchAlarms()      // 再获取报警数据
})
</script>

<style scoped>
.alarm-view-container {
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

.alarm-table-wrapper {
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

.alarm-table {
  width: 100%;
  flex: 1;
  overflow: auto;
}

.search-bar {
  margin-top: 15px;
  flex-shrink: 0;
}

.search-form {
  width: 100%;
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

.form-row {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  width: 100%;
}

.button-item {
  margin-right: 0;
  margin-left: auto;
  white-space: nowrap;
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