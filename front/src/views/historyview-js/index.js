import { watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMapStore } from '@/stores/map'
import { createHistoryData } from './data'
import { createHistoryAPI } from './api'
import { createPlaybackHandler } from './playback'
import { createUIHandler } from './ui'

export function useHistoryView() {
  const mapStore = useMapStore()
  const { t } = useI18n()

  // 创建数据管理
  const data = createHistoryData()
  
  // 创建回放处理器
  const playbackHandler = createPlaybackHandler(data, t)
  
  // 创建API操作
  const api = createHistoryAPI(data, mapStore, t)
  
  // 创建UI交互处理器
  const uiHandler = createUIHandler(data, mapStore, t, api.handleMapChange, api.handleSearch, playbackHandler.stopPlayback)

  // 监听回放速度变化
  watch(data.playbackSpeed, () => {
    if (data.isPlaying.value) {
      playbackHandler.pausePlayback()
      playbackHandler.startPlayback()
    }
  })

  // 监听地图变化
  watch(() => mapStore.selectedMap, () => {
    data.imageInfo.loaded = false
    data.imageInfo.width = 0
    data.imageInfo.height = 0
    data.imageInfo.scaleX = 1
    data.imageInfo.scaleY = 1
  }, { deep: true })

  // 监听表单变化，保存状态
  watch(() => [data.searchForm.deviceId, data.searchForm.dateRange, data.selectedMapId.value], () => {
    uiHandler.saveState();
  }, { deep: true });

  // 监听回放状态变化
  watch(() => [data.currentPlayIndex.value, data.playbackSpeed.value], () => {
    // 只有在有轨迹数据时才保存这些状态
    if (data.trajectoryData.value.length > 0) {
      uiHandler.saveState();
    }
  }, { deep: true });

  // 组件挂载处理函数
  const onMountedHandler = async () => {
    await api.fetchMapList();
    await uiHandler.restoreState();
  }

  return {
    // 响应式数据
    mapList: data.mapList,
    selectedMapId: data.selectedMapId,
    mapImage: data.mapImage,
    imageInfo: data.imageInfo,
    tagList: data.tagList,
    selectedTag: data.selectedTag,
    searchForm: data.searchForm,
    searchLoading: data.searchLoading,
    exportLoading: data.exportLoading,
    trajectoryData: data.trajectoryData,
    isPlaying: data.isPlaying,
    currentPlayIndex: data.currentPlayIndex,
    playbackSpeed: data.playbackSpeed,
    displayTrajectory: data.displayTrajectory,
    currentPoint: data.currentPoint,
    
    // 地图相关
    mapStore,
    
    // 方法
    fetchMapList: api.fetchMapList,
    fetchTagList: api.fetchTagList,
    handleMapChange: api.handleMapChange,
    goToMapManagement: uiHandler.goToMapManagement,
    handleImageLoad: uiHandler.handleImageLoad,
    handleSearch: api.handleSearch,
    handleResetSearch: uiHandler.handleResetSearch,
    startPlayback: playbackHandler.startPlayback,
    pausePlayback: playbackHandler.pausePlayback,
    stopPlayback: playbackHandler.stopPlayback,
    handleProgressChange: playbackHandler.handleProgressChange,
    handleRowClick: uiHandler.handleRowClick,
    getRowClassName: uiHandler.getRowClassName,
    formatTime: uiHandler.formatTime,
    formatCoordinate: uiHandler.formatCoordinate,
    formatSliderTooltip: uiHandler.formatSliderTooltip,
    getTracePoints: uiHandler.getTracePoints,
    getTimeSpan: uiHandler.getTimeSpan,
    formatDuration: uiHandler.formatDuration,
    handleExportCSV: uiHandler.handleExportCSV,
    saveState: uiHandler.saveState,
    restoreState: uiHandler.restoreState,
    
    // lifecycle
    onMountedHandler
  }
}
