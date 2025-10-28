import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

export function createUIHandler(data, mapStore, t, handleMapChange, handleSearch, stopPlayback) {
  const router = useRouter()
  
  // 创建一个对象来存储后期绑定的方法
  const handlers = {
    apiHandleMapChange: handleMapChange,
    apiHandleSearch: handleSearch
  }

  // 前往地图管理页面
  const goToMapManagement = () => {
    router.push('/home/maps')
  }

  // 图片加载处理
  const handleImageLoad = (e) => {
    const img = e.target
    if (!img) {
      console.error('handleImageLoad: 没有图片元素')
      return
    }
    
    console.log('=== handleImageLoad 开始 ===')
    console.log('图片自然尺寸:', img.naturalWidth, 'x', img.naturalHeight)
    console.log('图片显示尺寸:', img.clientWidth, 'x', img.clientHeight)
    
    // 验证图片尺寸
    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      console.error('图片尺寸无效，等待重新加载')
      return
    }
    
    data.imageInfo.width = img.naturalWidth
    data.imageInfo.height = img.naturalHeight
    
    if (mapStore.selectedMap?.width && mapStore.selectedMap?.height) {
      console.log('使用地图配置的尺寸:', mapStore.selectedMap.width, 'x', mapStore.selectedMap.height)
      data.imageInfo.width = mapStore.selectedMap.width
      data.imageInfo.height = mapStore.selectedMap.height
    }
    
    const displayWidth = img.clientWidth || img.naturalWidth
    const displayHeight = img.clientHeight || img.naturalHeight
    
    // 避免除以零
    if (data.imageInfo.width === 0 || data.imageInfo.height === 0) {
      console.error('图片配置尺寸无效')
      return
    }
    
    data.imageInfo.scaleX = displayWidth / data.imageInfo.width
    data.imageInfo.scaleY = displayHeight / data.imageInfo.height
    
    console.log('缩放比例:', data.imageInfo.scaleX, 'x', data.imageInfo.scaleY)
    console.log('地图配置:', {
      originX: mapStore.selectedMap?.originX,
      originY: mapStore.selectedMap?.originY,
      scale: mapStore.selectedMap?.scale
    })
    
    // 设置为已加载 - 这将触发 SVG 渲染
    data.imageInfo.loaded = true
    console.log('✓ 图片加载完成，imageInfo.loaded = true')
    console.log('=== handleImageLoad 结束 ===')
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
    if (!points || points.length === 0) {
      console.log('getTracePoints: 没有点数据')
      return ''
    }
    
    console.log('getTracePoints: 处理', points.length, '个点')
    console.log('地图信息:', {
      selectedMap: mapStore.selectedMap,
      pixelsPerMeter: mapStore.pixelsPerMeter,
      originX: mapStore.selectedMap?.originX,
      originY: mapStore.selectedMap?.originY
    })
    
    const result = points
      .map((p, index) => {
        const pixelX = mapStore.meterToPixelX(p.x)
        const pixelY = mapStore.meterToPixelY(p.y)
        
        if (index === 0) {
          console.log('第一个点:', {
            原始: { x: p.x, y: p.y },
            像素: { x: pixelX, y: pixelY }
          })
        }
        
        if (isNaN(pixelX) || isNaN(pixelY)) {
          console.warn('坐标转换失败:', p, '结果:', { pixelX, pixelY })
          return null
        }
        
        return `${pixelX},${pixelY}`
      })
      .filter(p => p !== null)
      .join(' ')
    
    console.log('生成的轨迹点字符串长度:', result.length)
    
    return result
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
        const mapChangeHandler = handlers.apiHandleMapChange || handleMapChange;
        if (mapChangeHandler) {
          await mapChangeHandler(data.selectedMapId.value);
        }
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
        const searchHandler = handlers.apiHandleSearch || handleSearch;
        if (searchHandler) {
          await searchHandler();
        }
        
        // 恢复播放位置
        if (state.currentPlayIndex && data.trajectoryData.value.length > 0) {
          data.currentPlayIndex.value = Math.min(state.currentPlayIndex, data.trajectoryData.value.length - 1);
        }
      }
    } catch (error) {
      console.error('恢复状态失败:', error);
    }
  };

  const result = {
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
    restoreState,
    // 支持后期绑定的属性
    get apiHandleMapChange() {
      return handlers.apiHandleMapChange;
    },
    set apiHandleMapChange(value) {
      handlers.apiHandleMapChange = value;
    },
    get apiHandleSearch() {
      return handlers.apiHandleSearch;
    },
    set apiHandleSearch(value) {
      handlers.apiHandleSearch = value;
    }
  };
  
  return result;
}
