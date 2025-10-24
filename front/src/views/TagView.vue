<template>
  <div class="tag-view-container">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>{{ $t('tags.title') }}</h2>
        <!-- 搜索/过滤栏 - 调整布局以保持一行 -->
        <div class="search-bar">
         <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch" class="search-form-inline">

            <el-form-item :label="$t('tags.searchName')" class="search-item">
              <el-input v-model="searchForm.name" :placeholder="$t('tags.searchNamePlaceholder')" clearable style="width: 180px;"/>
            </el-form-item>

            <el-form-item :label="$t('tags.status')" class="search-item">
              <el-select v-model="searchForm.status" :placeholder="$t('tags.searchStatusPlaceholder')" clearable style="width: 140px;"> 
                <el-option :label="$t('tags.online')" :value="1" />
                <el-option :label="$t('tags.offline')" :value="0" />
              </el-select>
            </el-form-item>
            <el-form-item class="search-buttons">
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon> {{ $t('tags.query') }}
              </el-button>
              <el-button @click="handleResetSearch">
                <el-icon><Refresh /></el-icon> {{ $t('tags.reset') }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        <!-- 操作栏 -->
        <div class="action-bar">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> {{ $t('tags.add') }}
          </el-button>
          <el-button type="success" @click="handleBatchImport">
            <el-icon><Upload /></el-icon> {{ $t('tags.batchImport') }}
          </el-button>
          <el-button type="info" @click="handleDownloadTemplate">
            <el-icon><Download /></el-icon> {{ $t('tags.downloadTemplate') }}
          </el-button>
          <el-button type="danger" @click="handleBatchDelete" :disabled="!multipleSelection.length">
            <el-icon><Delete /></el-icon> {{ $t('tags.batchDelete') }}
          </el-button>
          <input
            type="file"
            ref="fileInput"
            style="display: none"
            accept=".json,.csv"
            @change="handleFileChange"
          />
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
          <el-table-column prop="name" :label="$t('tags.tagName')" width="180" fixed="left" show-overflow-tooltip sortable="custom" />
          <el-table-column :label="$t('tags.status')" width="120" fixed="left" prop="status" sortable="custom">
            <template #default="scope">
              <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
                {{ scope.row.status === 1 ? $t('tags.online') : $t('tags.offline') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('tags.batteryLevel')" width="120" prop="batteryLevel" sortable="custom" fixed="left">
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
          <el-table-column :label="$t('tags.macAddress')" width="160" show-overflow-tooltip sortable="custom" prop="macAddress">
            <template #default="scope">
              {{ formatMacAddress(scope.row.macAddress) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('tags.coordinates')" width="160">
            <template #default="scope">
              <div>X: {{ formatCoordinate(scope.row.positionX) }} m</div>
              <div>Y: {{ formatCoordinate(scope.row.positionY) }} m</div>
            </template>
          </el-table-column>
          <el-table-column prop="model" :label="$t('tags.model')" width="140" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="firmwareVersion" :label="$t('tags.firmwareVersion')" width="140" show-overflow-tooltip sortable="custom" />
          <el-table-column :label="$t('tags.mapName')" width="120" show-overflow-tooltip sortable="custom">
            <template #default="scope">
              {{ getMapNameById(scope.row.mapId) }}
            </template>
          </el-table-column>

          <el-table-column :label="$t('tags.lastSeen')" width="200" show-overflow-tooltip prop="lastSeen" sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.lastSeen) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('tags.createTime')" width="200" show-overflow-tooltip prop="createTime" sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" :label="$t('tags.remark')" min-width="200" show-overflow-tooltip />
          <el-table-column :label="$t('tags.operation')" width="160" fixed="right">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button-group class="operation-row">
                  <el-button type="default" size="small" @click="handleEdit(scope.row)">
                    {{ $t('tags.edit') }}
                  </el-button>
                  <el-button type="default" size="small" @click="handleDelete(scope.row)">
                    {{ $t('tags.delete') }}
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
      :title="dialogType === 'add' ? $t('tags.addTag') : $t('tags.editTag')"
      width="700px"
      @close="resetForm"
      destroy-on-close
    >
      <el-form 
        :model="tagForm" 
        :rules="rules"
        ref="tagFormRef"
        label-width="140px"
        status-icon
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('tags.name')" prop="name">
              <el-input v-model="tagForm.name" :placeholder="$t('tags.namePlaceholder')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('tags.macAddress')" prop="macAddress">
              <el-input 
                v-model="tagForm.macAddress" 
                :placeholder="$t('tags.macAddressPlaceholder')"
                maxlength="12"
              >
                <template #suffix>
                  <el-tooltip :content="$t('tags.macAddressTip')" placement="top">
                    <el-icon style="color: #909399; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('tags.model')" prop="model">
              <el-input v-model="tagForm.model" :placeholder="$t('tags.modelPlaceholder')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('tags.firmwareVersion')" prop="firmwareVersion">
              <el-input v-model="tagForm.firmwareVersion" :placeholder="$t('tags.firmwareVersionPlaceholder')" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 移除地图选择，改为自动从JSON数据获取 -->
        
        <el-form-item :label="$t('tags.remark')" prop="remark">
          <el-input 
            v-model="tagForm.remark" 
            type="textarea" 
            :rows="3" 
            :placeholder="$t('tags.remarkPlaceholder')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">{{ $t('tags.cancel') }}</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">{{ $t('tags.confirm') }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { Search, Refresh, Plus, Delete, Edit, QuestionFilled, Upload, Download } from '@element-plus/icons-vue'
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
  fileInput,
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
  handleBatchDelete,
  handleBatchImport,
  handleDownloadTemplate,
  handleFileChange,
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

 