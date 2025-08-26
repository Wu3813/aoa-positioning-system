import { ElMessage } from 'element-plus'

export function createGeofenceMap(data, api, t) {
  // 处理地图预览图片加载
  const handlePreviewImageLoad = (event) => {
    const img = event.target
    data.imageInfo.width = img.naturalWidth
    data.imageInfo.height = img.naturalHeight
    
    data.previewLoading.value = false
    
    calculateImageDimensions()
  }

  // 计算图片在预览区域中的实际尺寸和位置
  const calculateImageDimensions = () => {
    if (!data.previewImage.value || !data.imageInfo.width || !data.imageInfo.height) return
    
    const container = data.previewImage.value.parentElement
    if (!container) return
    
    // 移除固定内边距，使用容器的实际尺寸
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    
    const imgRatio = data.imageInfo.width / data.imageInfo.height
    const containerRatio = containerWidth / containerHeight
    
    let displayWidth, displayHeight
    let offsetX = 0, offsetY = 0
    
    if (imgRatio > containerRatio) {
      // 图片更宽，以容器宽度为基准
      displayWidth = containerWidth
      displayHeight = containerWidth / imgRatio
      offsetY = (containerHeight - displayHeight) / 2
    } else {
      // 图片更高，以容器高度为基准
      displayHeight = containerHeight
      displayWidth = containerHeight * imgRatio
      offsetX = (containerWidth - displayWidth) / 2
    }
    
    // 更新图片显示信息
    data.imageInfo.display = {
      width: displayWidth,
      height: displayHeight,
      offsetX: offsetX,
      offsetY: offsetY,
      scaleX: data.imageInfo.width / displayWidth,
      scaleY: data.imageInfo.height / displayHeight
    }
    
    console.log('图片显示信息:', {
      原始尺寸: `${data.imageInfo.width} x ${data.imageInfo.height}`,
      显示尺寸: `${displayWidth.toFixed(2)} x ${displayHeight.toFixed(2)}`,
      缩放比例: `${data.imageInfo.display.scaleX.toFixed(4)} x ${data.imageInfo.display.scaleY.toFixed(4)}`,
      偏移量: `${offsetX.toFixed(2)} x ${offsetY.toFixed(2)}`
    })
  }

  // 设置围栏点模式
  const setPointMode = () => {
    if (!data.selectedMapImageUrl.value) {
      ElMessage.warning(t('geofence.selectMapFirst'))
      return
    }
    
    data.geofenceForm.points = []
    data.isSettingPoints.value = true
    ElMessage.info(t('geofence.clickSetPointsHint'))
  }

  // 完成围栏点设置
  const completePointSetting = () => {
    if (data.geofenceForm.points.length < 3) {
      ElMessage.warning(t('geofence.needThreePoints'))
      return
    }
    
    data.isSettingPoints.value = false
    ElMessage.success(t('geofence.pointSettingComplete', { count: data.geofenceForm.points.length }))
  }

  // 取消围栏点设置
  const cancelPointSetting = () => {
    data.geofenceForm.points = []
    data.isSettingPoints.value = false
    ElMessage.info(t('geofence.allPointsCleared'))
  }

  // 删除围栏点
  const removePoint = (index) => {
    data.geofenceForm.points.splice(index, 1)
    ElMessage.info(t('geofence.pointDeleted', { index: index + 1 }))
  }

  // 处理地图点击
  const handleMapClick = (event) => {
    if (!data.previewImage.value || !data.imageInfo.display || !data.selectedMapImageUrl.value || !data.isSettingPoints.value) {
      return
    }
    
    // 获取点击相对于容器的坐标
    const rect = event.currentTarget.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top
    
    // 获取图片的实际位置和尺寸（DOM元素尺寸）
    const imgElement = data.previewImage.value
    const imgRect = imgElement.getBoundingClientRect()
    const imgOffsetX = imgRect.left - rect.left
    const imgOffsetY = imgRect.top - rect.top
    const imgDisplayWidth = imgRect.width
    const imgDisplayHeight = imgRect.height
    
    // 检查点击是否在图片区域内（使用实际DOM位置）
    if (
      clickX < imgOffsetX || 
      clickX > imgOffsetX + imgDisplayWidth ||
      clickY < imgOffsetY || 
      clickY > imgOffsetY + imgDisplayHeight
    ) {
      console.log('点击在图片区域外', { 
        点击坐标: { x: clickX, y: clickY }, 
        图片DOM位置: { x: imgOffsetX, y: imgOffsetY },
        图片DOM尺寸: { width: imgDisplayWidth, height: imgDisplayHeight }
      })
      return
    }
    
    // 计算点击位置相对于图片的比例
    const relativeX = (clickX - imgOffsetX) / imgDisplayWidth
    const relativeY = (clickY - imgOffsetY) / imgDisplayHeight
    
    // 转换为图片上的实际像素坐标
    const imageX = Math.round(relativeX * data.imageInfo.width)
    const imageY = Math.round(relativeY * data.imageInfo.height)
    
    // 确保坐标在图片范围内
    const boundedImageX = Math.max(0, Math.min(data.imageInfo.width - 1, imageX))
    const boundedImageY = Math.max(0, Math.min(data.imageInfo.height - 1, imageY))
    
    console.log('点击位置:', { 
      显示坐标: { x: clickX, y: clickY }, 
      图片位置: { x: imgOffsetX, y: imgOffsetY },
      相对比例: { x: relativeX.toFixed(4), y: relativeY.toFixed(4) },
      转换后图片坐标: { x: boundedImageX, y: boundedImageY }
    })
    
    // 添加围栏点
    data.geofenceForm.points.push({ x: boundedImageX, y: boundedImageY })
    
    ElMessage.info(t('geofence.pointAdded', { 
      index: data.geofenceForm.points.length, 
      x: boundedImageX, 
      y: boundedImageY 
    }))
  }

  // 获取显示位置（图片坐标转换为显示坐标）
  const getDisplayPosition = (pixelX, pixelY) => {
    if (!data.imageInfo.display || !data.previewImage.value) return { x: 0, y: 0 }
    
    // 确保输入坐标在图片范围内
    const boundedPixelX = Math.max(0, Math.min(data.imageInfo.width - 1, pixelX || 0))
    const boundedPixelY = Math.max(0, Math.min(data.imageInfo.height - 1, pixelY || 0))
    
    // 获取图片DOM元素的实际位置和尺寸
    const imgElement = data.previewImage.value
    const imgRect = imgElement.getBoundingClientRect()
    const containerRect = imgElement.parentElement.getBoundingClientRect()
    const imgOffsetX = imgRect.left - containerRect.left
    const imgOffsetY = imgRect.top - containerRect.top
    
    // 计算坐标相对于原图的比例
    const relativeX = boundedPixelX / data.imageInfo.width
    const relativeY = boundedPixelY / data.imageInfo.height
    
    // 将比例应用到实际显示图片上
    const displayX = imgOffsetX + (relativeX * imgRect.width)
    const displayY = imgOffsetY + (relativeY * imgRect.height)
    
    return { x: displayX, y: displayY }
  }

  // 获取多边形点字符串
  const getPolygonPoints = () => {
    return data.geofenceForm.points.map(point => {
      const pos = getDisplayPosition(point.x, point.y)
      return `${pos.x},${pos.y}`
    }).join(' ')
  }

  // 更新地图预览
  const updateMapPreview = (mapId) => {
    if (!mapId) {
      data.selectedMapImageUrl.value = ''
      return
    }
    data.selectedMapImageUrl.value = api.getMapImageUrl(mapId)
  }

  return {
    handlePreviewImageLoad,
    calculateImageDimensions,
    setPointMode,
    completePointSetting,
    cancelPointSetting,
    removePoint,
    handleMapClick,
    getDisplayPosition,
    getPolygonPoints,
    updateMapPreview
  }
}
