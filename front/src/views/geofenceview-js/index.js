import { onMounted, onBeforeUnmount, watch } from 'vue'
import { createGeofenceData } from './data'
import { createGeofenceAPI } from './api'
import { createGeofenceUI } from './ui'
import { createGeofenceMap } from './map'

export function useGeofenceView() {
  // 创建数据管理
  const data = createGeofenceData()
  
  // 创建API操作
  const api = createGeofenceAPI(data)
  
  // 创建UI交互
  const ui = createGeofenceUI(data, api)
  
  // 创建地图处理
  const map = createGeofenceMap(data, api)

  // 监听地图选择变化
  watch(() => data.geofenceForm.mapId, (newMapId) => {
    map.updateMapPreview(newMapId)
    // 切换地图时清除已设置的点
    if (data.isSettingPoints.value) {
      data.geofenceForm.points = []
    }
  })

  // 生命周期处理
  const onMountedHandler = async () => {
    await api.fetchMaps()  // 先获取地图数据
    api.fetchGeofences()   // 再获取围栏数据
    
    // 窗口大小变化时重新计算
    window.addEventListener('resize', map.calculateImageDimensions)
  }

  const onBeforeUnmountHandler = () => {
    window.removeEventListener('resize', map.calculateImageDimensions)
  }

  return {
    // 响应式数据
    loading: data.loading,
    geofenceList: data.geofenceList,
    mapList: data.mapList,
    multipleSelection: data.multipleSelection,
    searchForm: data.searchForm,
    sortConfig: data.sortConfig,
    dialogVisible: data.dialogVisible,
    dialogType: data.dialogType,
    submitLoading: data.submitLoading,
    previewLoading: data.previewLoading,
    isSettingPoints: data.isSettingPoints,
    geofenceFormRef: data.geofenceFormRef,
    geofenceForm: data.geofenceForm,
    formRules: data.formRules,
    previewContainer: data.previewContainer,
    previewImage: data.previewImage,
    selectedMapImageUrl: data.selectedMapImageUrl,
    imageInfo: data.imageInfo,
    filteredGeofenceList: data.filteredGeofenceList,
    
    // 工具方法
    formatDateTime: data.formatDateTime,
    resetForm: data.resetForm,
    
    // API方法
    fetchGeofences: api.fetchGeofences,
    fetchMaps: api.fetchMaps,
    getMapImageUrl: api.getMapImageUrl,
    
    // UI方法
    handleSearch: ui.handleSearch,
    handleResetSearch: ui.handleResetSearch,
    handleAdd: ui.handleAdd,
    handleEdit: ui.handleEdit,
    handleToggleEnabled: ui.handleToggleEnabled,
    handleDelete: ui.handleDelete,
    handleSelectionChange: ui.handleSelectionChange,
    handleEnableAll: ui.handleEnableAll,
    handleDisableAll: ui.handleDisableAll,
    handleBatchDelete: ui.handleBatchDelete,
    handleSortChange: ui.handleSortChange,
    updateMapPreview: map.updateMapPreview,
    handleSubmit: ui.handleSubmit,
    
    // 地图方法
    handlePreviewImageLoad: map.handlePreviewImageLoad,
    calculateImageDimensions: map.calculateImageDimensions,
    setPointMode: map.setPointMode,
    completePointSetting: map.completePointSetting,
    cancelPointSetting: map.cancelPointSetting,
    removePoint: map.removePoint,
    handleMapClick: map.handleMapClick,
    getDisplayPosition: map.getDisplayPosition,
    getPolygonPoints: map.getPolygonPoints,
    
    // 生命周期
    onMountedHandler,
    onBeforeUnmountHandler
  }
}
