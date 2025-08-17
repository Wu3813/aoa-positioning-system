import { onMounted, onBeforeUnmount } from 'vue'
import { createStationData } from './data'
import { createStationAPI } from './api'
import { createStationUI } from './ui'

export function useStationView() {
  // 创建数据管理
  const data = createStationData()
  
  // 创建API操作
  const api = createStationAPI(data)
  
  // 创建UI交互
  const ui = createStationUI(data, api)

  // 生命周期处理
  const onMountedHandler = async () => {
    await api.fetchMaps()  // 先获取地图数据
    api.fetchStations()    // 再获取基站数据
    
    // 设置表格高度和ResizeObserver
    data.updateTableHeight();
    data.setupResizeObserver();
    
    // 启动自动刷新
    ui.startAutoRefresh();
  }

  const onBeforeUnmountHandler = () => {
    // 清理ResizeObserver
    if (data.resizeObserver.value) {
      data.resizeObserver.value.disconnect();
    } else {
      window.removeEventListener('resize', data.updateTableHeight);
    }
    
    // 停止自动刷新
    ui.stopAutoRefresh();
  }

  return {
    // 响应式数据
    stationList: data.stationList,
    mapList: data.mapList,
    loading: data.loading,
    submitLoading: data.submitLoading,
    checkAllLoading: data.checkAllLoading,
    batchRefreshLoading: data.batchRefreshLoading,
    refreshingStations: data.refreshingStations,
    dialogVisible: data.dialogVisible,
    dialogType: data.dialogType,
    stationFormRef: data.stationFormRef,
    tableMaxHeight: data.tableMaxHeight,
    testingConnection: data.testingConnection,
    udpConnected: data.udpConnected,
    enablingBroadcast: data.enablingBroadcast,
    enablingScanning: data.enablingScanning,
    configDialogVisible: data.configDialogVisible,
    currentConfigStation: data.currentConfigStation,
    rssiValue: data.rssiValue,
    selectedScanConfig: data.selectedScanConfig,
    applyScanConfigLoading: data.applyScanConfigLoading,
    configRSSILoading: data.configRSSILoading,
    configTargetLoading: data.configTargetLoading,
    targetIp: data.targetIp,
    targetPort: data.targetPort,
    fileInput: data.fileInput,
    searchForm: data.searchForm,
    multipleSelection: data.multipleSelection,
    stationForm: data.stationForm,
    rules: data.rules,
    filteredStationList: data.filteredStationList,
    isRssiValid: data.isRssiValid,
    rssiErrorMessage: data.rssiErrorMessage,
    isTargetValid: data.isTargetValid,
    targetErrorMessage: data.targetErrorMessage,
    
    // 工具方法
    formatCoordinate: data.formatCoordinate,
    formatDateTime: data.formatDateTime,
    resetForm: data.resetForm,
    
    // UI方法
    handleSearch: ui.handleSearch,
    handleResetSearch: ui.handleResetSearch,
    handleSelectionChange: ui.handleSelectionChange,
    handleAdd: ui.handleAdd,
    handleEdit: ui.handleEdit,
    handleDelete: ui.handleDelete,
    handleSubmit: ui.handleSubmit,
    handleRefreshStation: ui.handleRefreshStation,
    handleCheckAllStatus: ui.handleCheckAllStatus,
    handleBatchRefresh: ui.handleBatchRefresh,
    handleBatchDelete: ui.handleBatchDelete,
    handleTestConnection: ui.handleTestConnection,
    handleEnableBroadcast: ui.handleEnableBroadcast,
    handleEnableScanning: ui.handleEnableScanning,
    handleFactoryReset: ui.handleFactoryReset,
    handleRestart: ui.handleRestart,
    handleLocate: ui.handleLocate,
    handleUpdate: ui.handleUpdate,
    handleConfig: ui.handleConfig,
    handleApplyScanConfig: ui.handleApplyScanConfig,
    handleConfigRSSI: ui.handleConfigRSSI,
    handleConfigTarget: ui.handleConfigTarget,
    handleSortChange: ui.handleSortChange,
    handleImportCoordinates: ui.handleImportCoordinates,
    handleFileChange: ui.handleFileChange,
    
    // 生命周期
    onMountedHandler,
    onBeforeUnmountHandler
  }
}
