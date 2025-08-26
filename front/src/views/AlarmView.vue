<template>
  <div class="alarm-view-container">
    <!-- 1. 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>{{ $t('alarms.title') }}</h2>
        <!-- 搜索/过滤栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch" class="search-form">
            <div class="form-row">
              <el-form-item :label="$t('alarms.searchName')">
                <el-input v-model="searchForm.name" :placeholder="$t('alarms.searchNamePlaceholder')" clearable style="width: 150px;" />
              </el-form-item>
              <el-form-item :label="$t('alarms.searchMap')">
                <el-select v-model="searchForm.mapId" :placeholder="$t('alarms.searchMapPlaceholder')" clearable style="width: 150px;">
                  <el-option 
                    v-for="map in mapList" 
                    :key="map.mapId"
                    :label="map.name" 
                    :value="map.mapId"
                  />
                </el-select>
              </el-form-item>
              <el-form-item :label="$t('alarms.timeRange')">
                <el-date-picker
                  v-model="searchForm.timeRange"
                  type="datetimerange"
                  range-separator="-"
                  :start-placeholder="$t('alarms.startTime')"
                  :end-placeholder="$t('alarms.endTime')"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  :shortcuts="dateShortcuts"
                  style="width: 380px;"
                />
              </el-form-item>
              <el-form-item class="button-item">
                <el-button type="primary" @click="handleSearch">
                  <el-icon><Search /></el-icon> {{ $t('alarms.query') }}
                </el-button>
                <el-button @click="handleResetSearch">
                  <el-icon><Refresh /></el-icon> {{ $t('alarms.reset') }}
                </el-button>
              </el-form-item>
            </div>
          </el-form>
        </div>
        <!-- 操作栏 -->
        <div class="action-bar">
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
        >
          <el-table-column prop="time" :label="$t('alarms.time')" min-width="180" show-overflow-tooltip sortable="custom">
            <template #default="scope">
              {{ formatDateTime(scope.row.time) }}
            </template>
          </el-table-column>
          <el-table-column prop="geofenceName" :label="$t('alarms.geofenceName')" min-width="150" show-overflow-tooltip sortable="custom" />
          <el-table-column prop="mapName" :label="$t('alarms.mapName')" min-width="150" show-overflow-tooltip sortable="custom" />
          <el-table-column :label="$t('alarms.alarmTag')" min-width="120" show-overflow-tooltip>
            <template #default="scope">
              {{ getTagNameByMac(scope.row.alarmTag) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('alarms.alarmCoordinates')" width="150">
            <template #default="scope">
              <div>X: {{ formatCoordinate(scope.row.x) }} {{ $t('common.meter') }}</div>
              <div>Y: {{ formatCoordinate(scope.row.y) }} {{ $t('common.meter') }}</div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useAlarmData } from './alarmview-js/index.js'

// 使用报警数据管理
const {
  loading,
  alarmList,
  mapList,
  tagList,
  searchForm,
  sortConfig,
  dateShortcuts,
  filteredAlarmList,
  getAlarms,
  getMaps,
  getTags,
  getTagNameByMac,
  handleSearch,
  handleResetSearch,
  handleSortChange,
  formatCoordinate,
  formatDateTime,
  initData
} = useAlarmData()

// 生命周期
onMounted(async () => {
  await initData()
})
</script>

<style scoped>
@import '../assets/styles/alarm-view.css';
</style> 