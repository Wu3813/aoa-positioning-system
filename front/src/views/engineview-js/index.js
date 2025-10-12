import { onMounted, onBeforeUnmount } from 'vue'
import { createEngineData } from './data'
import { createEngineAPI } from './api'
import { createEngineUI } from './ui'

export function useEngineView() {
  // 创建数据管理
  const data = createEngineData()
  
  // 创建API操作
  const api = createEngineAPI(data)
  
  // 创建UI交互
  const ui = createEngineUI(data, api)

  // 生命周期处理
  const onMountedHandler = async () => {
    await api.fetchEngines()
    api.fetchMaps()
    api.fetchTags()
    api.fetchStations()
    data.setupResizeObserver()
    ui.startPeriodicHealthCheck()
  }

  const onBeforeUnmountHandler = () => {
    // 停止定期健康检查
    ui.stopPeriodicHealthCheck()
    
    // 清理ResizeObserver
    if (data.resizeObserver.value) {
      data.resizeObserver.value.disconnect()
    } else {
      window.removeEventListener('resize', data.updateTableHeight)
    }
  }

  return {
    // 响应式数据
    engineList: data.engineList,
    mapList: data.mapList,
    tagList: data.tagList,
    stationList: data.stationList,
    loading: data.loading,
    submitLoading: data.submitLoading,
    cleanupLoading: data.cleanupLoading,
    dialogVisible: data.dialogVisible,
    dialogType: data.dialogType,
    engineFormRef: data.engineFormRef,
    uploadRef: data.uploadRef,
    searchForm: data.searchForm,
    multipleSelection: data.multipleSelection,
    engineForm: data.engineForm,
    configForm: data.configForm,
    rules: data.rules,
    uploadAction: data.uploadAction,
    uploadHeaders: data.uploadHeaders,
    uploadData: data.uploadData,
    filteredEngineList: data.filteredEngineList,
    
    // 工具方法
    formatDateTime: data.formatDateTime,
    resetForm: data.resetForm,
    
    // UI方法
    handleSearch: ui.handleSearch,
    handleResetSearch: ui.handleResetSearch,
    handleSelectionChange: ui.handleSelectionChange,
    handleBatchDelete: ui.handleBatchDelete,
    handleAdd: ui.handleAdd,
    handleEdit: ui.handleEdit,
    handleHealthCheck: ui.handleHealthCheck,
    handleDelete: ui.handleDelete,
    handleSubmit: ui.handleSubmit,
    handleSortChange: ui.handleSortChange,
    beforeUpload: ui.beforeUpload,
    onUploadSuccess: ui.onUploadSuccess,
    onUploadError: ui.onUploadError,
    handleCleanupModels: ui.handleCleanupModels,
    
    // 生命周期
    onMountedHandler,
    onBeforeUnmountHandler
  }
}

