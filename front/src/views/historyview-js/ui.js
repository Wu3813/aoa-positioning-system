import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

export function createUIHandler(data, mapStore, t, handleMapChange, handleSearch, stopPlayback) {
  const router = useRouter()

  // 前往地图管理页面
  const goToMapManagement = () => {
    router.push('/home/maps')
  }

  // 图片加载处理
  const handleImageLoad = (e) => {
    const img = e.target
    if (img) {
      data.imageInfo.width = img.naturalWidth
      data.imageInfo.height = img.naturalHeight
      
      if (mapStore.selectedMap?.width && mapStore.selectedMap?.height) {
        data.imageInfo.width = mapStore.selectedMap.width
        data.imageInfo.height = mapStore.selectedMap.height
      }
      
      const displayWidth = img.clientWidth
      const displayHeight = img.clientHeight
      data.imageInfo.scaleX = displayWidth / data.imageInfo.width
      data.imageInfo.scaleY = displayHeight / data.imageInfo.height
      
      data.imageInfo.loaded = true
    }
  }

  // 重置搜索
  const handleResetSearch = () => {
    data.searchForm.deviceId = ''
    data.searchForm.dateRange = []
    data.trajectoryData.value = []
    data.selectedTag.value = null
    stopPlayback()
    
    // 清除保存的状态
    localStorage.removeItem('historyView_state')
    
    ElMessage.info(t('history.resetComplete'))
  }

  // 表格行点击
  const handleRowClick = (row, column, event) => {
    const index = data.trajectoryData.value.findIndex(item => item === row)
    if (index !== -1) {
      data.currentPlayIndex.value = index
    }
  }

  // 表格行样式
  const getRowClassName = ({ row, rowIndex }) => {
    return rowIndex === data.currentPlayIndex.value ? 'current-row' : ''
  }

  // 时间格式化
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // 坐标格式化，保留两位小数
  const formatCoordinate = (value) => {
    if (value === null || value === undefined) return ''
    return Number(value).toFixed(2)
  }

  // 格式化进度条提示
  const formatSliderTooltip = (val) => {
    if (data.trajectoryData.value[val]) {
      return formatTime(data.trajectoryData.value[val].timestamp)
    }
    return val
  }

  // 获取轨迹点字符串
  const getTracePoints = (points) => {
    if (!points || points.length === 0) return ''
    
    return points
      .map(p => {
        const pixelX = mapStore.meterToPixelX(p.x)
        const pixelY = mapStore.meterToPixelY(p.y)
        
        if (isNaN(pixelX) || isNaN(pixelY)) return null
        
        return `${pixelX},${pixelY}`
      })
      .filter(p => p !== null)
      .join(' ')
  }

  // 获取时间跨度
  const getTimeSpan = () => {
    if (data.trajectoryData.value.length < 2) return 0
    const start = new Date(data.trajectoryData.value[0].timestamp)
    const end = new Date(data.trajectoryData.value[data.trajectoryData.value.length - 1].timestamp)
    return end.getTime() - start.getTime()
  }

  // 格式化持续时间
  const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}${t('history.hours')}${minutes % 60}${t('history.minutes')}`
    } else if (minutes > 0) {
      return `${minutes}${t('history.minutes')}${seconds % 60}${t('history.seconds')}`
    } else {
      return `${seconds}${t('history.seconds')}`
    }
  }

  // 导出CSV
  const handleExportCSV = () => {
    if (data.trajectoryData.value.length === 0) {
      ElMessage.warning(t('history.noDataToExport'))
      return
    }
    
    data.exportLoading.value = true
    
    try {
      // 构建CSV数据
      const headers = [t('history.serialNumber'), t('history.time'), t('history.xCoordinate'), t('history.yCoordinate')]
      const csvContent = [
        headers.join(','),
        ...data.trajectoryData.value.map((item, index) => [
          index + 1,
          formatTime(item.timestamp),
          formatCoordinate(item.x),
          formatCoordinate(item.y)
        ].join(','))
      ].join('\n')
      
      // 创建下载链接
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${t('history.trajectoryData')}_${data.selectedTag.value?.name || data.searchForm.deviceId}_${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      
      ElMessage.success(t('history.exportSuccess'))
    } catch (error) {
      console.error('导出失败:', error)
      ElMessage.error(t('history.exportFailed'))
    } finally {
      data.exportLoading.value = false
    }
  }

  // 保存状态到localStorage
  const saveState = () => {
    if (!data.searchForm.deviceId && !data.searchForm.dateRange?.length) return;
    
    try {
      const stateToSave = {
        selectedMapId: data.selectedMapId.value,
        deviceId: data.searchForm.deviceId,
        dateRange: data.searchForm.dateRange ? [
          data.searchForm.dateRange[0]?.getTime(),
          data.searchForm.dateRange[1]?.getTime()
        ] : null,
        currentPlayIndex: data.currentPlayIndex.value,
        playbackSpeed: data.playbackSpeed.value
      };
      localStorage.setItem('historyView_state', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('保存状态失败:', error);
    }
  };

  // 从localStorage恢复状态
  const restoreState = async () => {
    try {
      const savedState = localStorage.getItem('historyView_state');
      if (!savedState) return;
      
      const state = JSON.parse(savedState);
      
      // 恢复地图选择
      if (state.selectedMapId) {
        data.selectedMapId.value = state.selectedMapId;
        await handleMapChange(data.selectedMapId.value);
      }
      
      // 恢复时间范围
      if (state.dateRange && state.dateRange.length === 2) {
        data.searchForm.dateRange = [
          new Date(state.dateRange[0]),
          new Date(state.dateRange[1])
        ];
      }
      
      // 恢复设备选择
      if (state.deviceId) {
        data.searchForm.deviceId = state.deviceId;
      }
      
      // 恢复播放速度
      if (state.playbackSpeed) {
        data.playbackSpeed.value = state.playbackSpeed;
      }
      
      // 如果有足够信息，自动执行查询
      if (data.searchForm.deviceId && data.searchForm.dateRange?.length === 2) {
        await handleSearch();
        
        // 恢复播放位置
        if (state.currentPlayIndex && data.trajectoryData.value.length > 0) {
          data.currentPlayIndex.value = Math.min(state.currentPlayIndex, data.trajectoryData.value.length - 1);
        }
      }
    } catch (error) {
      console.error('恢复状态失败:', error);
    }
  };

  return {
    goToMapManagement,
    handleImageLoad,
    handleResetSearch,
    handleRowClick,
    getRowClassName,
    formatTime,
    formatCoordinate,
    formatSliderTooltip,
    getTracePoints,
    getTimeSpan,
    formatDuration,
    handleExportCSV,
    saveState,
    restoreState
  }
}
