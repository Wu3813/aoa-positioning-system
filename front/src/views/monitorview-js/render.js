// 渲染相关
export const createRenderHandler = (data) => {
  // 坐标转换函数 - 将原始像素坐标转换为显示尺寸坐标
  const convertToDisplayX = (x) => {
    return x * data.imageInfo.scaleX;
  }

  const convertToDisplayY = (y) => {
    return y * data.imageInfo.scaleY;
  }

  // 使用Canvas绘制轨迹点函数
  const renderCanvas = () => {
    if (!data.mapCanvas.value || !data.imageInfo.loaded) return
    
    const canvas = data.mapCanvas.value
    const ctx = canvas.getContext('2d')
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 绘制围栏
    renderGeofences(ctx)
    
    // 绘制传感器轨迹和当前位置点
    data.trackingStore.visibleSensorsList.forEach(sensor => {
      if (!sensor.points || sensor.points.length === 0) return
      
      // 确定要显示的点
      let displayPoints = sensor.points
      if (data.trackingStore.limitTraceEnabled) {
        displayPoints = displayPoints.slice(-data.trackingStore.traceLimit)
      }
      
      // 绘制轨迹线
      if (displayPoints.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = sensor.color
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.6
        
        // 确保第一个点是有效的
        let validPoints = displayPoints.filter(p => {
          const x = data.mapStore.meterToPixelX(p.x)
          const y = data.mapStore.meterToPixelY(p.y)
          return !isNaN(x) && !isNaN(y)
        })
        
        if (validPoints.length > 0) {
          const firstPoint = validPoints[0]
          // 转换到显示坐标
          const x = convertToDisplayX(data.mapStore.meterToPixelX(firstPoint.x))
          const y = convertToDisplayY(data.mapStore.meterToPixelY(firstPoint.y))
          ctx.moveTo(x, y)
          
          // 绘制后续点
          for (let i = 1; i < validPoints.length; i++) {
            const p = validPoints[i]
            // 转换到显示坐标
            const x = convertToDisplayX(data.mapStore.meterToPixelX(p.x))
            const y = convertToDisplayY(data.mapStore.meterToPixelY(p.y))
            ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
        ctx.globalAlpha = 1.0
      }
      
      // 绘制当前位置点
      if (sensor.lastPoint) {
        // 转换到显示坐标
        const x = convertToDisplayX(data.mapStore.meterToPixelX(sensor.lastPoint.x))
        const y = convertToDisplayY(data.mapStore.meterToPixelY(sensor.lastPoint.y))
        
        if (!isNaN(x) && !isNaN(y)) {
          // 绘制外圈阴影
          ctx.beginPath()
          ctx.shadowBlur = 4
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 3
          ctx.fillStyle = sensor.color
          ctx.arc(x, y, 10, 0, Math.PI * 2) // 增大半径从5到8
          ctx.fill()
          ctx.stroke()
          ctx.shadowBlur = 0
          
          // 绘制标签名称
          ctx.font = 'bold 12px Arial'
          ctx.fillStyle = '#333'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'middle'
          
          // 在轨迹点右侧显示标签名称
          ctx.fillText(sensor.name, x + 12, y)
          
        }
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
      ctx.lineWidth = 2
      
      // 使用虚线绘制
      ctx.setLineDash([5, 5])
      
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
      
      ctx.font = 'bold 12px Arial'
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

  return {
    renderCanvas,
    renderGeofences,
    getGeofenceCenterX,
    getGeofenceCenterY,
    convertToDisplayX,
    convertToDisplayY
  }
}
