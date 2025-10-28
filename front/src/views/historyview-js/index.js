import { watch, onMounted, nextTick } from 'vue'
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
  
  // 创建UI交互处理器（先创建，因为 API 需要用到它的方法）
  const uiHandler = createUIHandler(data, mapStore, t, null, null, playbackHandler.stopPlayback)
  
  // 创建API操作（传入 uiHandler 以便访问 handleImageLoad）
  const api = createHistoryAPI(data, mapStore, t, { handleImageLoad: uiHandler.handleImageLoad })
  
  // 将 API 的方法绑定到 uiHandler（这是一个循环依赖的解决方案）
  uiHandler.apiHandleMapChange = api.handleMapChange
  uiHandler.apiHandleSearch = api.handleSearch

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
    
    // 延迟检查图片缓存，确保所有数据都已加载
    setTimeout(() => {
      if (data.mapImage.value && mapStore.selectedMap && !data.imageInfo.loaded) {
        const img = data.mapImage.value;
        if (img.complete && img.naturalWidth > 0) {
          console.log('[onMounted] 检测到缓存图片，手动初始化');
          uiHandler.handleImageLoad({ target: img });
        }
      }
    }, 100);
  }

  // 组件激活处理函数（从缓存恢复时）
  const onActivatedHandler = () => {
    console.log('HistoryView 激活，检查图片加载状态');
    console.log('当前状态:', {
      hasMapImage: !!data.mapImage.value,
      hasSelectedMap: !!mapStore.selectedMap,
      imageInfoLoaded: data.imageInfo.loaded,
      trajectoryDataLength: data.trajectoryData.value.length
    });
    
    // 使用 nextTick 确保 DOM 已经更新
    nextTick(() => {
      // 检查图片是否已经加载但 imageInfo.loaded 为 false
      // 这种情况发生在从其他页面切换回来时，图片从缓存加载不会触发 @load 事件
      if (data.mapImage.value && mapStore.selectedMap) {
        const img = data.mapImage.value;
        
        console.log('图片状态:', {
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          clientWidth: img.clientWidth,
          clientHeight: img.clientHeight
        });
        
        // 检查图片是否已完成加载（complete 为 true 且有尺寸）
        // 无论 imageInfo.loaded 的状态如何，都重新初始化以确保数据正确
        if (img.complete && img.naturalWidth > 0) {
          console.log('检测到图片已从缓存加载，强制重新初始化');
          
          // 强制重新初始化图片信息
          data.imageInfo.loaded = false;
          
          // 手动调用 handleImageLoad 来初始化
          uiHandler.handleImageLoad({ target: img });
          
          console.log('初始化完成后的状态:', {
            loaded: data.imageInfo.loaded,
            width: data.imageInfo.width,
            height: data.imageInfo.height,
            scaleX: data.imageInfo.scaleX,
            scaleY: data.imageInfo.scaleY
          });
        } else {
          console.warn('图片未完全加载，等待加载完成');
        }
      } else {
        console.warn('缺少必要的引用:', {
          mapImage: !!data.mapImage.value,
          selectedMap: !!mapStore.selectedMap
        });
      }
    });
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
    onMountedHandler,
    onActivatedHandler
  }
}
