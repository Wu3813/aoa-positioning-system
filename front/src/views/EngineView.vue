<template>
  <div class="engine-view-container" :lang="locale">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>{{ $t('engine.title') }}</h2>
        <!-- 搜索/过滤栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
            <el-form-item :label="$t('engine.searchName')">
              <el-input v-model="searchForm.name" :placeholder="$t('engine.searchNamePlaceholder')" clearable />
            </el-form-item>
            <el-form-item :label="$t('engine.searchStatus')">
              <el-select v-model="searchForm.status" :placeholder="$t('engine.searchStatusPlaceholder')" clearable style="width: 120px;">
                <el-option :label="$t('engine.online')" :value="1" />
                <el-option :label="$t('engine.offline')" :value="0" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon> {{ $t('engine.query') }}
              </el-button>
              <el-button @click="handleResetSearch">
                <el-icon><Refresh /></el-icon> {{ $t('engine.reset') }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        <!-- 操作栏 -->
        <div class="action-bar">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> {{ $t('engine.add') }}
          </el-button>
          <el-button type="danger" @click="handleBatchDelete" :disabled="!multipleSelection.length">
            <el-icon><Delete /></el-icon> {{ $t('engine.batchDelete') }}
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
          <el-table-column prop="name" :label="$t('engine.engineName')" width="150" fixed="left" show-overflow-tooltip sortable="custom" />
          <el-table-column :label="$t('engine.status')" width="100" prop="status" fixed="left" sortable="custom">
            <template #default="scope">
              <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
                {{ scope.row.status === 1 ? $t('engine.online') : $t('engine.offline') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('engine.tagCount')" width="100" prop="tagCount" sortable="custom">
            <template #default="scope">
              <span>{{ scope.row.tagCount || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('engine.stationCount')" width="100" prop="stationCount" sortable="custom">
            <template #default="scope">
              <span>{{ scope.row.stationCount || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="managementUrl" :label="$t('engine.managementUrl')" min-width="200" show-overflow-tooltip />
          <el-table-column prop="mapName" :label="$t('engine.mapName')" width="120" show-overflow-tooltip sortable="custom" />
          <el-table-column :label="$t('engine.lastConfigTime')" width="180" show-overflow-tooltip prop="lastConfigTime" sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.lastConfigTime) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('engine.lastCommunication')" width="180" show-overflow-tooltip prop="lastCommunication" sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.lastCommunication) }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" :label="$t('engine.remark')" min-width="200" show-overflow-tooltip />
          <el-table-column :label="$t('engine.operation')" width="220" fixed="right">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button-group class="operation-row">
                  <el-button type="default" size="small" @click="handleEdit(scope.row)">
                    {{ $t('engine.edit') }}
                  </el-button>
                  <el-button type="default" size="small" @click="handleHealthCheck(scope.row)">
                    {{ $t('engine.healthCheck') }}
                  </el-button>
                  <el-button type="default" size="small" @click="handleDelete(scope.row)">
                    {{ $t('engine.delete') }}
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
      :title="dialogType === 'add' ? $t('engine.addEngine') : $t('engine.editEngine')"
      :width="locale === 'en-US' ? '1500px' : '1400px'"
      @close="resetForm"
      destroy-on-close
      class="engine-dialog"
    >
      <div class="engine-dialog-content">
        <!-- 左侧：基本信息 -->
        <div class="dialog-left-panel">
          <div class="form-section">
            <h3>{{ $t('engine.basicInfo') }}</h3>
            <el-form 
              :model="engineForm" 
              :rules="rules"
              ref="engineFormRef"
              :label-width="locale === 'en-US' ? '140px' : '100px'"
              status-icon
            >
              <el-form-item :label="$t('engine.name')" prop="name">
                <el-input v-model="engineForm.name" :placeholder="$t('engine.namePlaceholder')" />
              </el-form-item>
              
              <el-form-item :label="$t('engine.managementUrl')" prop="managementUrl">
                <el-input v-model="engineForm.managementUrl" :placeholder="$t('engine.managementUrlPlaceholder')" />
              </el-form-item>
              
              <el-form-item :label="$t('engine.mapName')" prop="mapId">
                <el-select v-model="engineForm.mapId" :placeholder="$t('engine.mapPlaceholder')" style="width: 100%">
                  <el-option 
                    v-for="map in mapList" 
                    :key="map.mapId"
                    :label="map.name" 
                    :value="map.mapId"
                  />
                </el-select>
              </el-form-item>
              
              <el-form-item :label="$t('engine.engineStatus')">
                <el-tag :type="engineForm.status === 1 ? 'success' : 'danger'" size="large">
                  {{ engineForm.status === 1 ? $t('engine.online') : $t('engine.offline') }}
                </el-tag>
                <span style="margin-left: 10px; color: #909399; font-size: 12px;">
                </span>
              </el-form-item>
              
              <el-form-item :label="$t('engine.remark')" prop="remark">
                <el-input 
                  v-model="engineForm.remark" 
                  type="textarea" 
                  :rows="3" 
                  :placeholder="$t('engine.remarkPlaceholder')"
                />
              </el-form-item>
            </el-form>
          </div>

        </div>

        <!-- 右侧：配置管理 -->
        <div class="dialog-right-panel">
          <div class="config-section">
            <h3>{{ $t('engine.basicConfig') }}</h3>
            <el-row :gutter="12">
              <el-col :span="6">
                <el-form-item :label="$t('engine.logLevel')">
                  <el-select v-model="configForm.log_level" :placeholder="$t('engine.logLevelPlaceholder')" style="width: 100%">
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
                <el-form-item :label="$t('engine.configApiPort')">
                  <el-input-number v-model="configForm.config_api_port" :min="1" :max="65535" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item :label="$t('engine.udpIqPort')">
                  <el-input-number v-model="configForm.udp_iq_port" :min="1" :max="65535" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item :label="$t('engine.enableIqCorrection')">
                  <el-switch v-model="configForm.enable_iq_correction" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item :label="$t('engine.postUrl')">
              <el-input v-model="configForm.post_url" :placeholder="$t('engine.postUrlPlaceholder')" />
            </el-form-item>
          </div>

          <div class="config-section ai-engine-config">
            <h3>{{ $t('engine.aiEngineConfig') }}</h3>
            
            <!-- 当前模型路径（只读） -->
            <el-form-item :label="$t('engine.currentModel')" class="current-model-item">
              <el-input 
                v-model="configForm.current_model_path" 
                :placeholder="$t('engine.currentModelPlaceholder')" 
                readonly
                disabled
              >
                <template #suffix>
                  <el-icon><Check /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            
            <!-- 新模型路径选择 -->
            <el-form-item :label="$t('engine.changeModel')" class="model-path-item">
              <el-input v-model="configForm.ai_engine.model_path" :placeholder="$t('engine.modelPathPlaceholder')" />
            </el-form-item>
            
            <!-- 参数配置 -->
            <el-row :gutter="10" class="ai-params-row">
              <el-col :span="8">
                <el-form-item :label="$t('engine.sequenceTimeoutMs')">
                  <el-input-number v-model="configForm.ai_engine.sequence_timeout_ms" :min="1" :max="10000" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item :label="$t('engine.maxThreads')">
                  <el-input-number v-model="configForm.ai_engine.max_threads" :min="1" :max="100" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item :label="$t('engine.minSamplesPerLocator')">
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
                  <el-icon><Upload /></el-icon> {{ $t('engine.uploadModel') }}
                </el-button>
              </el-upload>
              <el-button type="warning" @click="handleCleanupModels" :loading="cleanupLoading">
                <el-icon><Delete /></el-icon> {{ $t('engine.cleanupModels') }}
              </el-button>
            </div>
          </div>

          <div class="config-section classic-engine-config">
            <h3>{{ $t('engine.classicEngineConfig') }}</h3>
            <el-row :gutter="10">
              <el-col :span="8">
                <el-form-item :label="$t('engine.movingSequenceCount')">
                  <el-input-number v-model="configForm.classic_engine.moving_sequence_count" :min="1" :max="20" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item :label="$t('engine.movingTriggerSequenceCount')">
                  <el-input-number v-model="configForm.classic_engine.moving_trigger_sequence_count" :min="1" :max="10" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item :label="$t('engine.numAngleThreads')">
                  <el-input-number v-model="configForm.classic_engine.num_angle_threads" :min="1" :max="10" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="10">
              <el-col :span="8">
                <el-form-item :label="$t('engine.numPositionThreads')">
                  <el-input-number v-model="configForm.classic_engine.num_position_threads" :min="1" :max="10" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item :label="$t('engine.staticWindowKeepSize')">
                  <el-input-number v-model="configForm.classic_engine.static_window_keep_size" :min="10" :max="100" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item :label="$t('engine.staticWindowMaxSize')">
                  <el-input-number v-model="configForm.classic_engine.static_window_max_size" :min="20" :max="200" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <div class="config-section">
            <h3>{{ $t('engine.kalmanFilterConfig') }}</h3>
            <el-row :gutter="10">
              <el-col :span="12">
                <el-form-item :label="$t('engine.processNoise')">
                  <el-input-number v-model="configForm.kalman_filter.process_noise" :min="0" :max="1" :step="0.01" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('engine.measurementNoise')">
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
          <el-button @click="dialogVisible = false">{{ $t('engine.cancel') }}</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">{{ $t('engine.confirm') }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { Search, Refresh, Plus, Delete, Edit, Upload, Check } from '@element-plus/icons-vue'
import { useEngineView } from './engineview-js'
import { useI18n } from 'vue-i18n'

// 使用国际化
const { locale } = useI18n()

// 使用拆分后的引擎视图逻辑
const {
  // 响应式数据
  engineList,
  mapList,
  tagList,
  stationList,
  loading,
  submitLoading,
  cleanupLoading,
  dialogVisible,
  dialogType,
  engineFormRef,
  uploadRef,
  searchForm,
  multipleSelection,
  engineForm,
  configForm,
  rules,
  uploadAction,
  uploadHeaders,
  uploadData,
  filteredEngineList,
  
  // 工具方法
  formatDateTime,
  resetForm,
  
  // UI方法
  handleSearch,
  handleResetSearch,
  handleSelectionChange,
  handleBatchDelete,
  handleAdd,
  handleEdit,
  handleHealthCheck,
  handleDelete,
  handleSubmit,
  handleSortChange,
  beforeUpload,
  onUploadSuccess,
  onUploadError,
  handleCleanupModels,
  
  // 生命周期
  onMountedHandler,
  onBeforeUnmountHandler
} = useEngineView()

// 组件挂载
onMounted(onMountedHandler)

// 组件卸载前清理
onBeforeUnmount(onBeforeUnmountHandler)
</script>

<style>
@import '../assets/styles/engine-view.css';
</style> 