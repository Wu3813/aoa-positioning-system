<template>
  <div class="station-view-container" :lang="locale">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>{{ $t('station.title') }}</h2>
        <!-- 搜索/过滤栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch" class="search-form">
            <el-form-item :label="$t('station.searchCode')" class="search-form-item">
              <el-input v-model="searchForm.code" :placeholder="$t('station.searchCodePlaceholder')" clearable />
            </el-form-item>
            <el-form-item :label="$t('station.searchName')" class="search-form-item">
              <el-input v-model="searchForm.name" :placeholder="$t('station.searchNamePlaceholder')" clearable />
            </el-form-item>
            <el-form-item :label="$t('station.searchStatus')" class="search-form-item">
              <el-select v-model="searchForm.status" :placeholder="$t('station.searchStatusPlaceholder')" clearable class="status-select">
                <el-option :label="$t('station.online')" :value="1" />
                <el-option :label="$t('station.offline')" :value="0" />
                <el-option :label="$t('station.initializing')" :value="2" />
              </el-select>
            </el-form-item>
            <el-form-item class="search-form-item">
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon> {{ $t('station.query') }}
              </el-button>
              <el-button @click="handleResetSearch">
                <el-icon><Refresh /></el-icon> {{ $t('station.reset') }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        <!-- 操作栏 -->
        <div class="action-bar">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> {{ $t('station.add') }}
          </el-button>
          <el-button type="success" @click="handleCheckAllStatus" :loading="checkAllLoading">
            <el-icon><Refresh /></el-icon> {{ $t('station.checkAllStatus') }}
          </el-button>
          <el-button type="warning" @click="handleBatchRefresh" :disabled="!multipleSelection.length" :loading="batchRefreshLoading">
            <el-icon><Refresh /></el-icon> {{ $t('station.batchRefresh') }}
          </el-button>
          <el-button type="danger" @click="handleBatchDelete" :disabled="!multipleSelection.length">
            <el-icon><Delete /></el-icon> {{ $t('station.batchDelete') }}
          </el-button>
          <el-button type="primary" @click="handleImportCoordinates">
            <el-icon><Upload /></el-icon> {{ $t('station.importCoordinates') }}
          </el-button>
          <input
            type="file"
            ref="fileInput"
            style="display: none"
            accept=".json"
            @change="handleFileChange"
          />
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
          <el-table-column prop="code" :label="$t('station.stationCode')" width="120" fixed="left" show-overflow-tooltip sortable="custom" />
          <el-table-column :label="$t('station.searchStatus')" width="100" fixed="left" sortable="custom" prop="status" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.status === 2" type="info">{{ $t('station.initializing') }}</el-tag>
              <el-tag v-else-if="scope.row.status === 1" type="success">{{ $t('station.online') }}</el-tag>
              <el-tag v-else type="danger">{{ $t('station.offline') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('station.scanFunction')" width="110" fixed="left" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.scanEnabled === null" type="info" size="small">{{ $t('station.unknown') }}</el-tag>
              <el-tag v-else-if="scope.row.scanEnabled" type="success" size="small">{{ $t('station.scanEnabled') }}</el-tag>
              <el-tag v-else type="warning" size="small">{{ $t('station.scanDisabled') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" :label="$t('station.stationName')" width="160" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="macAddress" :label="$t('station.macAddress')" width="150" show-overflow-tooltip sortable="custom">
            <template #default="scope">
              {{ scope.row.macAddress ? scope.row.macAddress.toLowerCase() : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="ipAddress" :label="$t('station.ipAddress')" width="130" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="model" :label="$t('station.model')" width="130" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="firmwareVersion" :label="$t('station.firmwareVersion')" width="130" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="mapName" :label="$t('station.mapName')" width="130" show-overflow-tooltip sortable="custom" />
          <el-table-column :label="$t('station.acceleration')" width="200">
            <template #default="scope">
              <div>X: {{ scope.row.positionX || '-' }}</div>
              <div>Y: {{ scope.row.positionY || '-' }}</div>
              <div>Z: {{ scope.row.positionZ || '-' }}</div>
            </template>
          </el-table-column>
          <el-table-column :label="$t('station.orientation')" width="110" sortable="custom">
            <template #default="scope">
              {{ formatCoordinate(scope.row.orientation) }}°
            </template>
          </el-table-column>
          <el-table-column :label="$t('station.coordinates')" width="200" align="center">
            <template #default="scope">
              <div>X: {{ formatCoordinate(scope.row.coordinateX) }}</div>
              <div>Y: {{ formatCoordinate(scope.row.coordinateY) }}</div>
              <div>Z: {{ formatCoordinate(scope.row.coordinateZ) }}</div>
            </template>
          </el-table-column>
          <el-table-column :label="$t('station.lastCommunication')" width="180" show-overflow-tooltip sortable="custom" prop="lastCommunication">
            <template #default="scope">
              {{ formatDateTime(scope.row.lastCommunication) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('station.createTime')" width="180" show-overflow-tooltip sortable="custom" prop="createTime">
            <template #default="scope">
              {{ formatDateTime(scope.row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" :label="$t('station.remark')" min-width="200" show-overflow-tooltip />
          <el-table-column :label="$t('station.operation')" width="400" fixed="right">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button-group class="operation-row">
                  <el-button type="default" size="small" @click="handleRefreshStation(scope.row)" :loading="refreshingStations.includes(scope.row.id)">
                    {{ $t('station.refresh') }}
                  </el-button>
                  <el-button type="default" size="small" @click="handleEdit(scope.row)">
                    {{ $t('station.basicConfig') }}
                  </el-button>
                  <el-button type="default" size="small" @click="handleConfig(scope.row)">
                    {{ $t('station.paramConfig') }}
                  </el-button>
                  
                  <el-button type="default" size="small" @click="handleRestart(scope.row)">
                    {{ $t('station.restart') }}
                  </el-button>
                </el-button-group>
                <el-button-group class="operation-row">
                  <el-button type="default" size="small" @click="handleLocate(scope.row)">
                    {{ $t('station.locate') }}
                  </el-button>
                  <el-button type="default" size="small" @click="handleUpdate(scope.row)">
                    {{ $t('station.firmwareUpdate') }}
                  </el-button>
                  <el-button type="default" size="small" @click="handleFactoryReset(scope.row)">
                    {{ $t('station.factoryReset') }}
                  </el-button>
                  <el-button type="default" size="small" @click="handleDelete(scope.row)">
                    {{ $t('station.delete') }}
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
      :title="dialogType === 'add' ? $t('station.addStation') : $t('station.editStation')"
      width="750px"
      @close="resetForm"
      destroy-on-close
      class="station-dialog"
    >
      <el-form 
        :model="stationForm" 
        :rules="rules"
        ref="stationFormRef"
        :label-width="getLabelWidth()"
        status-icon
        class="station-form"
      >
        <!-- 基本可编辑信息 -->
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('station.stationCode')" prop="code">
              <el-input v-model="stationForm.code" :placeholder="$t('station.stationCodePlaceholder')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('station.stationName')" prop="name">
              <el-input v-model="stationForm.name" :placeholder="$t('station.stationNamePlaceholder')" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item :label="$t('station.ipAddress')" prop="ipAddress">
          <el-input v-model="stationForm.ipAddress" :placeholder="$t('station.ipAddressPlaceholder')" style="width: 100%" />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('station.mapName')" prop="mapId">
              <el-select v-model="stationForm.mapId" :placeholder="$t('station.mapPlaceholder')" style="width: 100%">
                <el-option 
                  v-for="map in mapList" 
                  :key="map.mapId"
                  :label="map.name" 
                  :value="map.mapId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('station.orientation')" prop="orientation">
              <el-input-number 
                v-model="stationForm.orientation" 
                :min="0" 
                :max="359.99" 
                :precision="2"
                style="width: 100%"
                :placeholder="$t('station.orientationPlaceholder')"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item :label="$t('station.coordinatesTitle')">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-input-number
                v-model="stationForm.coordinateX"
                :precision="3"
                :placeholder="$t('station.xCoordinatePlaceholder')"
                style="width: 100%"
              >
                <template #prepend>{{ $t('station.xAxis') }}</template>
              </el-input-number>
            </el-col>
            <el-col :span="8">
              <el-input-number
                v-model="stationForm.coordinateY"
                :precision="3"
                :placeholder="$t('station.yCoordinatePlaceholder')"
                style="width: 100%"
              >
                <template #prepend>{{ $t('station.yAxis') }}</template>
              </el-input-number>
            </el-col>
            <el-col :span="8">
              <el-input-number
                v-model="stationForm.coordinateZ"
                :precision="3"
                :placeholder="$t('station.zCoordinatePlaceholder')"
                style="width: 100%"
              >
                <template #prepend>{{ $t('station.zAxis') }}</template>
              </el-input-number>
            </el-col>
          </el-row>
        </el-form-item>
        
        <el-form-item :label="$t('station.remark')" prop="remark">
          <el-input 
            v-model="stationForm.remark" 
            type="textarea" 
            :rows="3" 
            :placeholder="$t('station.remarkPlaceholder')"
          />
        </el-form-item>
        
        <!-- 基站基本信息 -->
        <el-divider>{{ $t('station.stationBasicInfo') }}</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('station.macAddress')">
              <el-input v-model="stationForm.macAddress" :placeholder="$t('station.macAddressPlaceholder')" readonly disabled :formatter="val => val ? val.toLowerCase() : ''" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('station.model')">
              <el-input v-model="stationForm.model" :placeholder="$t('station.modelPlaceholder')" readonly disabled />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('station.firmwareVersion')">
              <el-input v-model="stationForm.firmwareVersion" :placeholder="$t('station.firmwareVersionPlaceholder')" readonly disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('station.scanFunction')">
              <el-input 
                :value="stationForm.scanEnabled === null ? $t('station.unknown') : (stationForm.scanEnabled ? $t('station.scanEnabled') : $t('station.scanDisabled'))" 
                :placeholder="$t('station.macAddressPlaceholder')" 
                readonly 
                disabled
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item :label="$t('station.accelerationTitle')">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-input
                v-model="stationForm.positionX"
                :placeholder="$t('station.xAxisPlaceholder')"
                readonly
                disabled
              >
                <template #prepend>{{ $t('station.xAxis') }}</template>
              </el-input>
            </el-col>
            <el-col :span="8">
              <el-input
                v-model="stationForm.positionY"
                :placeholder="$t('station.yAxisPlaceholder')"
                readonly
                disabled
              >
                <template #prepend>{{ $t('station.yAxis') }}</template>
              </el-input>
            </el-col>
            <el-col :span="8">
              <el-input
                v-model="stationForm.positionZ"
                :placeholder="$t('station.zAxisPlaceholder')"
                readonly
                disabled
              >
                <template #prepend>{{ $t('station.zAxis') }}</template>
              </el-input>
            </el-col>
          </el-row>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="success" @click="handleTestConnection" :loading="testingConnection">
            {{ $t('station.testConnection') }}
          </el-button>
          <el-button 
            type="primary" 
            @click="handleEnableBroadcast" 
            :disabled="!udpConnected"
            :loading="enablingBroadcast"
          >
            {{ $t('station.enableBroadcast') }}
          </el-button>
          <el-button 
            type="warning" 
            @click="handleEnableScanning" 
            :disabled="!udpConnected"
            :loading="enablingScanning"
          >
            {{ $t('station.enableScanning') }}
          </el-button>
          <div style="flex: 1"></div>
          <el-button @click="dialogVisible = false">{{ $t('station.cancel') }}</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">{{ $t('station.confirm') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 配置基站对话框 -->
    <el-dialog
      v-model="configDialogVisible"
      :title="`${$t('station.paramConfigTitle')} - ${currentConfigStation?.name || ''}`"
      width="400px"
      destroy-on-close
      class="config-dialog"
    >
      <div class="config-container">
        <div class="config-section">
          <h4 class="section-title">{{ $t('station.scanConfigTitle') }}</h4>
          <div class="config-row-inline">
            <span class="item-label">{{ $t('station.scanConfig') }}：</span>
            <el-select 
              v-model="selectedScanConfig" 
              :placeholder="$t('station.scanConfigPlaceholder')"
              size="small"
              class="config-select"
            >
              <el-option :label="$t('station.config1')" value="config1" />
              <el-option :label="$t('station.config2')" value="config2" />
            </el-select>
            <el-button 
              type="primary" 
              @click="handleApplyScanConfig" 
              :loading="applyScanConfigLoading"
              :disabled="!selectedScanConfig"
              size="small"
            >
              {{ $t('station.apply') }}
            </el-button>
          </div>
          <div class="config-hint-inline">
            <span class="hint-text">{{ $t('station.config1Desc') }}</span>
          </div>
          <div class="config-hint-inline">
            <span class="hint-text">{{ $t('station.config2Desc') }}</span>
          </div>
        </div>
        
        <div class="config-section">
          <h4 class="section-title">{{ $t('station.rssiConfigTitle') }}</h4>
          <div class="config-row-inline">
            <span class="item-label">{{ $t('station.rssiThreshold') }}</span>
            <el-input-number
              v-model="rssiValue"
              :min="-100"
              :max="-40"
              :step="1"
              size="small"
              class="config-input"
              :placeholder="$t('station.rssiPlaceholder')"
            />
            <el-button 
              type="primary" 
              @click="handleConfigRSSI" 
              :loading="configRSSILoading" 
              :disabled="!isRssiValid"
              size="small"
            >
              {{ $t('station.save') }}
            </el-button>
          </div>
          <div class="config-hint-inline">
            <span class="hint-text">{{ $t('station.rssiRange') }}</span>
            <span v-if="rssiErrorMessage" class="error-text">{{ rssiErrorMessage }}</span>
          </div>
        </div>
        
        <div class="config-section">
          <h4 class="section-title">{{ $t('station.engineConfigTitle') }}</h4>
          <div class="config-row-inline">
            <span class="item-label">{{ $t('station.engineIP') }}</span>
            <el-input 
              v-model="targetIp" 
              :placeholder="$t('station.ipPlaceholder')"
              size="small"
              class="config-input"
            />
          </div>
          <div class="config-row-inline">
            <span class="item-label">{{ $t('station.port') }}</span>
            <el-input-number 
              v-model="targetPort" 
              :min="1" 
              :max="65535" 
              :step="1"
              size="small"
              class="config-input"
              :placeholder="$t('station.portPlaceholder')"
            />
            <el-button 
              type="primary" 
              @click="handleConfigTarget" 
              :loading="configTargetLoading"
              :disabled="!isTargetValid"
              size="small"
            >
              {{ $t('station.save') }}
            </el-button>
          </div>
          <div class="config-hint-inline">
            <span class="hint-text">{{ $t('station.portRange') }}</span>
            <span v-if="targetErrorMessage" class="error-text">{{ targetErrorMessage }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, computed } from 'vue'
import { Search, Refresh, Plus, Delete, Edit, Connection, Upload } from '@element-plus/icons-vue'
import { useStationView } from './stationview-js/index'
import { useI18n } from 'vue-i18n'

// 使用国际化
const { locale } = useI18n()

// 使用基站管理组合式函数
const {
  // 响应式数据
  stationList,
  mapList,
  loading,
  submitLoading,
  checkAllLoading,
  batchRefreshLoading,
  refreshingStations,
  dialogVisible,
  dialogType,
  stationFormRef,
  tableMaxHeight,
  testingConnection,
  udpConnected,
  enablingBroadcast,
  enablingScanning,
  configDialogVisible,
  currentConfigStation,
  rssiValue,
  selectedScanConfig,
  applyScanConfigLoading,
  configRSSILoading,
  configTargetLoading,
  targetIp,
  targetPort,
  fileInput,
  searchForm,
  multipleSelection,
  stationForm,
  rules,
  filteredStationList,
  isRssiValid,
  rssiErrorMessage,
  isTargetValid,
  targetErrorMessage,
  
  // 工具方法
  formatCoordinate,
  formatDateTime,
  resetForm,
  
  // UI方法
  handleSearch,
  handleResetSearch,
  handleSelectionChange,
  handleAdd,
  handleEdit,
  handleDelete,
  handleSubmit,
  handleRefreshStation,
  handleCheckAllStatus,
  handleBatchRefresh,
  handleBatchDelete,
  handleTestConnection,
  handleEnableBroadcast,
  handleEnableScanning,
  handleFactoryReset,
  handleRestart,
  handleLocate,
  handleUpdate,
  handleConfig,
  handleApplyScanConfig,
  handleConfigRSSI,
  handleConfigTarget,
  handleSortChange,
  handleImportCoordinates,
  handleFileChange,
  
  // 生命周期
  onMountedHandler,
  onBeforeUnmountHandler
} = useStationView()

// 根据语言动态调整标签宽度
const getLabelWidth = () => {
  return locale.value === 'en-US' ? '140px' : '100px'
}

// 组件挂载
onMounted(() => {
  onMountedHandler()
})

// 组件卸载前清理
onBeforeUnmount(() => {
  onBeforeUnmountHandler()
})
</script>

<style scoped>
@import '../assets/styles/station-view.css';
</style>
