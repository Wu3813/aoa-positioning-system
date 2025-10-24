// 渲染相关
export const createRenderHandler = (data) => {
  // 坐标转换缓存
  const coordinateCache = new Map()
  const CACHE_SIZE_LIMIT = 1000 // 限制缓存大小
  
  // 坐标转换函数 - 将原始像素坐标转换为显示尺寸坐标（带缓存）
  const convertToDisplayX = (x) => {
    return x * data.imageInfo.scaleX;
  }

  const convertToDisplayY = (y) => {
    return y * data.imageInfo.scaleY;
  }

  // 带缓存的坐标转换函数
  const convertToDisplayCached = (x, y) => {
    const key = `${x},${y}`
    if (coordinateCache.has(key)) {
      return coordinateCache.get(key)
    }
    
    // 如果缓存太大，清理一半
    if (coordinateCache.size > CACHE_SIZE_LIMIT) {
      const keys = Array.from(coordinateCache.keys())
      for (let i = 0; i < keys.length / 2; i++) {
        coordinateCache.delete(keys[i])
      }
    }
    
    const result = {
      x: convertToDisplayX(x),
      y: convertToDisplayY(y)
    }
    coordinateCache.set(key, result)
    return result
  }

  // 清理坐标缓存
  const clearCoordinateCache = () => {
    coordinateCache.clear()
  }

  // 动画相关配置
  const ANIMATION_CONFIG = {
    duration: 500, // 进一步减少动画时间，提高响应速度
    easing: 'easeOutCubic', // 使用更简单的缓动函数
    minDistance: 2, // 减少最小移动距离，让动画更敏感
    maxDistance: 100, // 减少最大移动距离
    // 简化弹性配置
    springConfig: {
      tension: 0.5,
      friction: 0.8,
      mass: 1.0
    }
  }

  // 简化的缓动函数 - 只保留最常用的
  const easingFunctions = {
    linear: t => t,
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutQuart: t => 1 - Math.pow(1 - t, 4),
    easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    // 简化的弹性动画
    spring: t => {
      // 使用简化的弹性公式，避免复杂的数学计算
      return 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 2);
    }
  }

  // 计算两点间距离
  const calculateDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }

  // 简化的传感器动画状态初始化
  const initSensorAnimation = (sensor) => {
    if (!sensor.animationState) {
      sensor.animationState = {
        targetX: 0,
        targetY: 0,
        currentX: 0,
        currentY: 0,
        startX: 0,
        startY: 0,
        startTime: 0,
        duration: ANIMATION_CONFIG.duration,
        isAnimating: false,
        easing: ANIMATION_CONFIG.easing
      }
    }
  }

  // 简化的传感器动画目标位置更新
  const updateSensorAnimation = (sensor, newX, newY) => {
    initSensorAnimation(sensor)
    
    const state = sensor.animationState
    const currentX = state.isAnimating ? state.currentX : state.targetX
    const currentY = state.isAnimating ? state.currentY : state.targetY
    
    // 计算移动距离
    const distance = calculateDistance(currentX, currentY, newX, newY)
    
    // 如果移动距离太小，直接设置位置，不播放动画
    if (distance < ANIMATION_CONFIG.minDistance) {
      state.targetX = newX
      state.targetY = newY
      state.currentX = newX
      state.currentY = newY
      state.isAnimating = false
      return
    }
    
    // 设置动画参数
    state.startX = currentX
    state.startY = currentY
    state.targetX = newX
    state.targetY = newY
    state.startTime = Date.now()
    
    // 根据距离调整动画时长
    const normalizedDistance = Math.min(distance / ANIMATION_CONFIG.maxDistance, 1)
    state.duration = ANIMATION_CONFIG.duration + (normalizedDistance * 50) // 最多增加50ms
    
    state.isAnimating = true
  }

  // 简化的动画状态更新
  const updateAnimations = () => {
    const now = Date.now()
    let hasAnimatingSensors = false
    
    data.trackingStore.visibleSensorsList.forEach(sensor => {
      if (!sensor.animationState || !sensor.animationState.isAnimating) return
      
      const state = sensor.animationState
      const elapsed = now - state.startTime
      const progress = Math.min(elapsed / state.duration, 1)
      
      if (progress >= 1) {
        // 动画完成
        state.currentX = state.targetX
        state.currentY = state.targetY
        state.isAnimating = false
      } else {
        // 继续动画
        const easedProgress = easingFunctions[state.easing](progress)
        
        // 计算当前位置
        const deltaX = state.targetX - state.startX
        const deltaY = state.targetY - state.startY
        
        state.currentX = state.startX + deltaX * easedProgress
        state.currentY = state.startY + deltaY * easedProgress
        
        hasAnimatingSensors = true
      }
    })
    
    return hasAnimatingSensors
  }

  // 优化的Canvas绘制函数
  const renderCanvas = () => {
    if (!data.mapCanvas.value || !data.imageInfo.loaded) return
    
    const canvas = data.mapCanvas.value
    const ctx = canvas.getContext('2d')
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 绘制围栏
    renderGeofences(ctx)
    
    // 更新动画状态
    const hasAnimatingSensors = updateAnimations()
    
    // 批量绘制传感器
    const sensors = data.trackingStore.visibleSensorsList
    if (sensors.length === 0) return
    
    // 预计算标签图标大小 - 根据缩放比例调整
    const baseTagIconSize = data.trackingStore.tagIconSize || 10
    const tagIconSize = baseTagIconSize * Math.min(data.imageInfo.scaleX, data.imageInfo.scaleY)
    
    // 预计算标签图标透明度 (40-100)
    const tagIconOpacity = (data.trackingStore.tagIconOpacity || 100) / 100
    
    // 批量绘制轨迹线
    if (data.trackingStore.limitTraceEnabled) {
      // 轨迹线宽度也根据缩放比例调整，提高默认宽度
      ctx.lineWidth = 3 * Math.min(data.imageInfo.scaleX, data.imageInfo.scaleY)
      ctx.globalAlpha = 0.6
      
      sensors.forEach(sensor => {
        if (!sensor.points || sensor.points.length < 2) return
        
        // 预过滤有效点
        const validPoints = sensor.points.filter(p => {
          const pixelX = data.mapStore.meterToPixelX(p.x)
          const pixelY = data.mapStore.meterToPixelY(p.y)
          return !isNaN(pixelX) && !isNaN(pixelY)
        })
        
        if (validPoints.length < 2) return
        
        // 绘制轨迹线
        ctx.beginPath()
        ctx.strokeStyle = sensor.color
        
        const firstPoint = validPoints[0]
        const firstDisplay = convertToDisplayCached(
          data.mapStore.meterToPixelX(firstPoint.x),
          data.mapStore.meterToPixelY(firstPoint.y)
        )
        ctx.moveTo(firstDisplay.x, firstDisplay.y)
        
        // 绘制后续点
        for (let i = 1; i < validPoints.length; i++) {
          const p = validPoints[i]
          let x, y
          
          if (i === validPoints.length - 1 && sensor.animationState && sensor.animationState.isAnimating) {
            x = sensor.animationState.currentX
            y = sensor.animationState.currentY
          } else {
            const display = convertToDisplayCached(
              data.mapStore.meterToPixelX(p.x),
              data.mapStore.meterToPixelY(p.y)
            )
            x = display.x
            y = display.y
          }
          
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      })
      
      // 批量绘制轨迹点（根据设置决定是否绘制）
      if (data.trackingStore.showTracePoints) {
        ctx.globalAlpha = 0.8
        sensors.forEach(sensor => {
          if (!sensor.points || sensor.points.length === 0) return
          
          ctx.fillStyle = sensor.color
          sensor.points.forEach((p, i) => {
            let x, y
            
            if (i === sensor.points.length - 1 && sensor.animationState && sensor.animationState.isAnimating) {
              x = sensor.animationState.currentX
              y = sensor.animationState.currentY
            } else {
              const display = convertToDisplayCached(
                data.mapStore.meterToPixelX(p.x),
                data.mapStore.meterToPixelY(p.y)
              )
              x = display.x
              y = display.y
            }
            
            if (!isNaN(x) && !isNaN(y)) {
              ctx.beginPath()
      // 轨迹点大小也根据缩放比例调整，提高默认大小
      const tracePointSize = 3.5 * Math.min(data.imageInfo.scaleX, data.imageInfo.scaleY)
      ctx.arc(x, y, tracePointSize, 0, Math.PI * 2)
              ctx.fill()
            }
          })
        })
      }
      
      ctx.globalAlpha = 1.0
    }
    
    // 批量绘制当前位置点
    // 标签名称字体大小也根据缩放比例调整，提高默认字体大小
    const labelFontSize = 25 * Math.min(data.imageInfo.scaleX, data.imageInfo.scaleY)
    ctx.font = `bold ${labelFontSize}px Arial`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    
    sensors.forEach(sensor => {
      if (!sensor.lastPoint) return
      
      let x, y
      
      if (sensor.animationState && sensor.animationState.isAnimating) {
        x = sensor.animationState.currentX
        y = sensor.animationState.currentY
      } else {
        const display = convertToDisplayCached(
          data.mapStore.meterToPixelX(sensor.lastPoint.x),
          data.mapStore.meterToPixelY(sensor.lastPoint.y)
        )
        x = display.x
        y = display.y
      }
      
      if (!isNaN(x) && !isNaN(y)) {
        // 绘制标签点 - 使用颜色透明度而不是globalAlpha避免毛玻璃效果
        ctx.beginPath()
        
        // 将颜色转换为带透明度的RGBA格式
        const hexToRgba = (hex, alpha) => {
          const r = parseInt(hex.slice(1, 3), 16)
          const g = parseInt(hex.slice(3, 5), 16)
          const b = parseInt(hex.slice(5, 7), 16)
          return `rgba(${r}, ${g}, ${b}, ${alpha})`
        }
        
        // 绘制标签图标（带阴影、白色边框和灰色描边）
        ctx.shadowBlur = 3
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
        ctx.shadowOffsetX = 1
        ctx.shadowOffsetY = 1
        ctx.fillStyle = hexToRgba(sensor.color, tagIconOpacity)
        ctx.arc(x, y, tagIconSize, 0, Math.PI * 2)
        ctx.fill()
        
        // 重置阴影，绘制白色边框（内圈）
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        ctx.strokeStyle = `rgba(255, 255, 255, ${tagIconOpacity})` // 白色边框，跟随透明度
        // 白色边框宽度为原来的两倍
        ctx.lineWidth = 12 * Math.min(data.imageInfo.scaleX, data.imageInfo.scaleY)
        ctx.stroke()
        
        // 绘制灰色描边（外圈，在白色边框外面）
        ctx.strokeStyle = `rgba(64, 64, 64, ${tagIconOpacity})` // 深灰色描边，跟随透明度
        // 灰色描边宽度
        ctx.lineWidth = 1 * Math.min(data.imageInfo.scaleX, data.imageInfo.scaleY)
        ctx.stroke()
        
        // 绘制标签名称 - 保持完全不透明
        ctx.fillStyle = '#333'
        // 标签名称位置偏移也根据缩放比例调整
        const nameOffset = 12 * Math.min(data.imageInfo.scaleX, data.imageInfo.scaleY)
        ctx.fillText(sensor.name, x + nameOffset, y)
      }
    })
  }

  // 绘制围栏函数
  const renderGeofences = (ctx) => {
    // 绘制所有围栏
    data.trackingStore.geofenceList.forEach(geofence => {
      if (!geofence.points || geofence.points.length < 3) return
      
      // 绘制围栏多边形
      ctx.beginPath()
      ctx.fillStyle = 'rgba(255, 193, 7, 0.1)'
      ctx.strokeStyle = '#FFC107'
      // 围栏线宽也根据缩放比例调整，提高默认宽度
      ctx.lineWidth = 3 * Math.min(data.imageInfo.scaleX, data.imageInfo.scaleY)
      
      // 使用虚线绘制，虚线样式也根据缩放比例调整
      const dashSize = 5 * Math.min(data.imageInfo.scaleX, data.imageInfo.scaleY)
      ctx.setLineDash([dashSize, dashSize])
      
      const firstPoint = geofence.points[0]
      // 转换到显示坐标
      ctx.moveTo(convertToDisplayX(firstPoint.x), convertToDisplayY(firstPoint.y))
      
      for (let i = 1; i < geofence.points.length; i++) {
        const point = geofence.points[i]
        // 转换到显示坐标
        ctx.lineTo(convertToDisplayX(point.x), convertToDisplayY(point.y))
      }
      
      // 闭合路径
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      
      // 重置线型为实线
      ctx.setLineDash([])
      
      // 绘制围栏名称
      const centerX = convertToDisplayX(getGeofenceCenterX(geofence.points))
      const centerY = convertToDisplayY(getGeofenceCenterY(geofence.points))
      
      // 围栏名称字体大小也根据缩放比例调整，提高默认字体大小
      const fontSize = 25 * Math.min(data.imageInfo.scaleX, data.imageInfo.scaleY)
      ctx.font = `bold ${fontSize}px Arial`
      ctx.fillStyle = '#E65100'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // 添加文字阴影效果
      ctx.shadowColor = 'rgba(255,255,255,0.8)'
      ctx.shadowBlur = 2
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1
      
      ctx.fillText(geofence.name, centerX, centerY)
      
      // 重置阴影
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    })
  }

  // 获取围栏中心点X坐标（用于显示围栏名称）- 优化版
  const getGeofenceCenterX = (points) => {
    if (!points || points.length === 0) return 0
    
    const id = JSON.stringify(points) // 简单的缓存键
    
    if (!data.geofenceCenters.has(id)) {
      // 计算并缓存中心点
      const avgX = points.reduce((sum, p) => sum + (p.x || 0), 0) / points.length
      const avgY = points.reduce((sum, p) => sum + (p.y || 0), 0) / points.length
      data.geofenceCenters.set(id, { x: avgX, y: avgY })
    }
    
    return data.geofenceCenters.get(id).x
  }

  // 获取围栏中心点Y坐标（用于显示围栏名称）- 优化版
  const getGeofenceCenterY = (points) => {
    if (!points || points.length === 0) return 0
    
    const id = JSON.stringify(points) // 简单的缓存键
    
    if (!data.geofenceCenters.has(id)) {
      // 计算并缓存中心点
      const avgX = points.reduce((sum, p) => sum + (p.x || 0), 0) / points.length
      const avgY = points.reduce((sum, p) => sum + (p.y || 0), 0) / points.length
      data.geofenceCenters.set(id, { x: avgX, y: avgY })
    }
    
    return data.geofenceCenters.get(id).y
  }

  // 重置所有传感器的动画状态（用于画布重新加载、大小变化等场景）
  const resetAllSensorAnimations = () => {
    data.trackingStore.visibleSensorsList.forEach(sensor => {
      if (sensor.animationState) {
        // 清除动画状态，下次更新时会重新初始化
        delete sensor.animationState
      }
    })
    console.log('已重置所有传感器动画状态')
  }

  // 处理传感器位置更新（触发动画）
  const handleSensorPositionUpdate = (sensor, newPoint) => {
    if (!newPoint) return
    
    // 转换到显示坐标
    const newX = convertToDisplayX(data.mapStore.meterToPixelX(newPoint.x))
    const newY = convertToDisplayY(data.mapStore.meterToPixelY(newPoint.y))
    
    if (!isNaN(newX) && !isNaN(newY)) {
      // 检查是否是首次位置设置
      const isFirstPosition = !sensor.animationState || 
                              (sensor.animationState.targetX === 0 && sensor.animationState.targetY === 0)
      
      if (isFirstPosition) {
        // 首次设置位置，直接设置，不播放动画
        initSensorAnimation(sensor)
        sensor.animationState.targetX = newX
        sensor.animationState.targetY = newY
        sensor.animationState.currentX = newX
        sensor.animationState.currentY = newY
        sensor.animationState.isAnimating = false
        sensor.animationState.velocityX = 0
        sensor.animationState.velocityY = 0
        console.log(`传感器 ${sensor.mac} 首次位置设置: (${newX}, ${newY})`)
      } else {
        // 后续位置更新，播放动画
        updateSensorAnimation(sensor, newX, newY)
      }
    }
  }

  // 注册全局动画处理器
  window.sensorAnimationHandler = handleSensorPositionUpdate
  window.resetAllSensorAnimations = resetAllSensorAnimations

  return {
    renderCanvas,
    renderGeofences,
    getGeofenceCenterX,
    getGeofenceCenterY,
    convertToDisplayX,
    convertToDisplayY,
    convertToDisplayCached,
    clearCoordinateCache,
    handleSensorPositionUpdate,
    updateSensorAnimation,
    resetAllSensorAnimations
  }
}
