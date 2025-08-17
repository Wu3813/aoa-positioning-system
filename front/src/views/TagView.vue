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
              >
                <template #suffix>
                  <el-tooltip content="输入格式如：84fd27eee603（12位十六进制，不含分隔符）" placement="top">
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
import { onMounted, onBeforeUnmount } from 'vue'
import { Search, Refresh, Plus, Delete, Edit, QuestionFilled } from '@element-plus/icons-vue'
import '@/assets/styles/tag-view.css'
import { useTagView } from './tagview-js'

// 使用组合式函数
const {
  // 响应式数据
  tagList,
  loading,
  submitLoading,
  dialogVisible,
  dialogType,
  tagFormRef,
  tableMaxHeight,
  searchForm,
  multipleSelection,
  tagForm,
  rules,
  filteredTagList,
  
  // 工具方法
  getBatteryStatus,
  formatCoordinate,
  formatDateTime,
  formatMacAddress,
  getMapNameById,
  resetForm,
  
  // UI方法
  handleSearch,
  handleResetSearch,
  handleSelectionChange,
  handleAdd,
  handleEdit,
  handleDelete,
  handleSubmit,
  handleSortChange,
  
  // 生命周期
  onMountedHandler,
  onBeforeUnmountHandler
} = useTagView()

// 组件挂载
onMounted(onMountedHandler)

// 组件卸载前清理
onBeforeUnmount(onBeforeUnmountHandler)
</script>

 