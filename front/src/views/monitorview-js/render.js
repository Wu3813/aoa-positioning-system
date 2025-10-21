// 渲染相关
export const createRenderHandler = (data) => {
  // 坐标转换函数 - 将原始像素坐标转换为显示尺寸坐标
  const convertToDisplayX = (x) => {
    return x * data.imageInfo.scaleX;
  }

  const convertToDisplayY = (y) => {
    return y * data.imageInfo.scaleY;
  }

  // 动画相关配置
  const ANIMATION_CONFIG = {
    duration: 300, // 基础动画持续时间(ms) - 减少基础时间
    easing: 'springOvershoot', // 使用带过冲的弹性动画
    minDistance: 2, // 最小移动距离(像素)，小于此距离不播放动画
    maxDistance: 200, // 最大移动距离(像素)
    springConfig: {
      tension: 0.4, // 弹性张力 (0-1) - 增加张力让动画更有活力
      friction: 0.7, // 摩擦力 (0-1) - 减少摩擦力增加弹性
      mass: 0.8 // 质量 - 减少质量让动画更轻盈
    }
  }

  // 缓动函数
  const easingFunctions = {
    linear: t => t,
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutQuart: t => 1 - Math.pow(1 - t, 4),
    easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    easeOutBack: t => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    // 弹性动画函数
    spring: (t, config = ANIMATION_CONFIG.springConfig) => {
      const { tension, friction } = config;
      // 使用更自然的弹性公式
      const damping = 1 - friction;
      const frequency = tension * 2;
      return 1 - Math.exp(-damping * frequency * t) * Math.cos(frequency * Math.sqrt(1 - damping * damping) * t);
    },
    // 高级弹性动画（带过冲效果）
    springOvershoot: (t, config = ANIMATION_CONFIG.springConfig) => {
      const { tension, friction } = config;
      const damping = friction;
      const frequency = tension * 3;
      
      if (damping >= 1) {
        // 临界阻尼，无振荡
        return 1 - Math.exp(-frequency * t) * (1 + frequency * t);
      } else {
        // 欠阻尼，有振荡
        const omega = frequency * Math.sqrt(1 - damping * damping);
        return 1 - Math.exp(-damping * frequency * t) * Math.cos(omega * t);
      }
    },
    // 先快后慢的指数缓动
    easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    // 带反弹的缓动
    easeOutBounce: t => {
      const n1 = 7.5625;
      const d1 = 2.75;
      
      if (t < 1 / d1) {
        return n1 * t * t;
      } else if (t < 2 / d1) {
        return n1 * (t -= 1.5 / d1) * t + 0.75;
      } else if (t < 2.5 / d1) {
        return n1 * (t -= 2.25 / d1) * t + 0.9375;
      } else {
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
      }
    }
  }

  // 计算两点间距离
  const calculateDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }

  // 初始化传感器动画状态
  const initSensorAnimation = (sensor) => {
    if (!sensor.animationState) {
      // 获取标签的实际位置作为初始位置，避免从(0,0)飞过来的动画
      let initialX = 0, initialY = 0
      if (sensor.lastPoint) {
        initialX = convertToDisplayX(data.mapStore.meterToPixelX(sensor.lastPoint.x))
        initialY = convertToDisplayY(data.mapStore.meterToPixelY(sensor.lastPoint.y))
      }
      
      sensor.animationState = {
        targetX: initialX,
        targetY: initialY,
        currentX: initialX,
        currentY: initialY,
        startX: initialX,
        startY: initialY,
        startTime: 0,
        duration: ANIMATION_CONFIG.duration,
        isAnimating: false,
        easing: ANIMATION_CONFIG.easing,
        // 新增：速度和惯性相关
        velocityX: 0,
        velocityY: 0,
        lastUpdateTime: 0,
        springConfig: { ...ANIMATION_CONFIG.springConfig },
        // 惯性效果
        momentum: {
          enabled: true,
          decay: 0.92, // 惯性衰减系数 - 减少衰减让惯性更明显
          maxVelocity: 8, // 最大惯性速度 - 增加最大速度
          minVelocity: 0.05 // 最小惯性速度，低于此值停止惯性
        }
      }
    }
  }

  // 更新传感器动画目标位置
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
      state.velocityX = 0
      state.velocityY = 0
      return
    }
    
    // 计算当前速度（用于惯性效果）
    const now = Date.now()
    if (state.lastUpdateTime > 0) {
      const deltaTime = (now - state.lastUpdateTime) / 1000 // 转换为秒
      if (deltaTime > 0) {
        const deltaX = newX - currentX
        const deltaY = newY - currentY
        state.velocityX = deltaX / deltaTime
        state.velocityY = deltaY / deltaTime
        
        // 限制最大速度
        const maxVel = state.momentum.maxVelocity
        const velMagnitude = Math.sqrt(state.velocityX * state.velocityX + state.velocityY * state.velocityY)
        if (velMagnitude > maxVel) {
          state.velocityX = (state.velocityX / velMagnitude) * maxVel
          state.velocityY = (state.velocityY / velMagnitude) * maxVel
        }
      }
    }
    
    // 设置动画参数
    state.startX = currentX
    state.startY = currentY
    state.targetX = newX
    state.targetY = newY
    state.startTime = now
    state.lastUpdateTime = now
    
    // 根据距离和速度调整动画参数
    const normalizedDistance = Math.min(distance / ANIMATION_CONFIG.maxDistance, 1)
    const speedFactor = Math.min(Math.sqrt(state.velocityX * state.velocityX + state.velocityY * state.velocityY) / 10, 1)
    
    // 动态调整动画时长和弹性参数
    // 基础300ms + 距离比例 * 400ms，最大700ms
    state.duration = Math.min(ANIMATION_CONFIG.duration + (normalizedDistance * 400), 700)
    
    // 根据速度调整弹性参数
    if (speedFactor > 0.5) {
      // 高速移动时增加弹性
      state.springConfig.tension = Math.min(0.5, ANIMATION_CONFIG.springConfig.tension + speedFactor * 0.2)
      state.springConfig.friction = Math.max(0.6, ANIMATION_CONFIG.springConfig.friction - speedFactor * 0.1)
    } else {
      // 低速移动时使用默认参数
      state.springConfig = { ...ANIMATION_CONFIG.springConfig }
    }
    
    state.isAnimating = true
  }

  // 更新动画状态
  const updateAnimations = () => {
    const now = Date.now()
    let hasAnimatingSensors = false
    
    data.trackingStore.visibleSensorsList.forEach(sensor => {
      if (!sensor.animationState || !sensor.animationState.isAnimating) return
      
      const state = sensor.animationState
      const elapsed = now - state.startTime
      const progress = Math.min(elapsed / state.duration, 1)
      
      if (progress >= 1) {
        // 动画完成，应用惯性效果
        state.currentX = state.targetX
        state.currentY = state.targetY
        
        // 如果启用了惯性效果，继续应用惯性
        if (state.momentum.enabled && (Math.abs(state.velocityX) > state.momentum.minVelocity || Math.abs(state.velocityY) > state.momentum.minVelocity)) {
          // 应用惯性
          state.currentX += state.velocityX * 0.1
          state.currentY += state.velocityY * 0.1
          
          // 衰减速度
          state.velocityX *= state.momentum.decay
          state.velocityY *= state.momentum.decay
          
          hasAnimatingSensors = true
        } else {
          state.isAnimating = false
          state.velocityX = 0
          state.velocityY = 0
        }
      } else {
        // 继续动画
        let easedProgress
        
        if (state.easing === 'spring' || state.easing === 'springOvershoot') {
          // 使用弹性动画
          easedProgress = easingFunctions[state.easing](progress, state.springConfig)
        } else {
          // 使用传统缓动函数
          easedProgress = easingFunctions[state.easing](progress)
        }
        
        // 计算当前位置
        const deltaX = state.targetX - state.startX
        const deltaY = state.targetY - state.startY
        
        state.currentX = state.startX + deltaX * easedProgress
        state.currentY = state.startY + deltaY * easedProgress
        
        // 更新速度（用于惯性计算）
        const deltaTime = (now - state.lastUpdateTime) / 1000
        if (deltaTime > 0) {
          const prevX = state.currentX
          const prevY = state.currentY
          
          // 计算瞬时速度
          const instantVelX = (state.currentX - prevX) / deltaTime
          const instantVelY = (state.currentY - prevY) / deltaTime
          
          // 平滑速度更新
          state.velocityX = state.velocityX * 0.7 + instantVelX * 0.3
          state.velocityY = state.velocityY * 0.7 + instantVelY * 0.3
        }
        
        state.lastUpdateTime = now
        hasAnimatingSensors = true
      }
    })
    
    return hasAnimatingSensors
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
    
    // 更新动画状态
    const hasAnimatingSensors = updateAnimations()
    
    // 绘制传感器轨迹和当前位置点
    data.trackingStore.visibleSensorsList.forEach(sensor => {
      if (!sensor.points || sensor.points.length === 0) return
      
      // 绘制轨迹线（仅在开关开启时）
      if (data.trackingStore.limitTraceEnabled) {
        // 直接使用传感器存储的点，因为数量限制已经在数据处理时应用
        let displayPoints = sensor.points
        
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
          
          // 绘制后续点，但最后一个点要使用动画位置
          for (let i = 1; i < validPoints.length; i++) {
            const p = validPoints[i]
            let x, y
            
            // 如果是最后一个点且正在动画中，使用动画位置
            if (i === validPoints.length - 1 && sensor.animationState && sensor.animationState.isAnimating) {
              x = sensor.animationState.currentX
              y = sensor.animationState.currentY
            } else {
              // 转换到显示坐标
              x = convertToDisplayX(data.mapStore.meterToPixelX(p.x))
              y = convertToDisplayY(data.mapStore.meterToPixelY(p.y))
            }
            
            ctx.lineTo(x, y)
          }
          ctx.stroke()
          
          // 绘制轨迹点标记
          ctx.globalAlpha = 0.8
          ctx.fillStyle = sensor.color
          for (let i = 0; i < validPoints.length; i++) {
            const p = validPoints[i]
            let x, y
            
            // 如果是最后一个点且正在动画中，使用动画位置
            if (i === validPoints.length - 1 && sensor.animationState && sensor.animationState.isAnimating) {
              x = sensor.animationState.currentX
              y = sensor.animationState.currentY
            } else {
              // 转换到显示坐标
              x = convertToDisplayX(data.mapStore.meterToPixelX(p.x))
              y = convertToDisplayY(data.mapStore.meterToPixelY(p.y))
            }
            
            // 绘制比线稍微粗一点的圆点
            ctx.beginPath()
            ctx.arc(x, y, 2.5, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        ctx.globalAlpha = 1.0
      }
      }
      
      // 绘制当前位置点（使用动画位置）
      if (sensor.lastPoint) {
        let x, y
        
        // 检查是否有动画状态
        if (sensor.animationState && sensor.animationState.isAnimating) {
          // 使用动画位置
          x = sensor.animationState.currentX
          y = sensor.animationState.currentY
        } else {
          // 使用实际位置
          x = convertToDisplayX(data.mapStore.meterToPixelX(sensor.lastPoint.x))
          y = convertToDisplayY(data.mapStore.meterToPixelY(sensor.lastPoint.y))
        }
        
        if (!isNaN(x) && !isNaN(y)) {
          // 绘制外圈阴影
          ctx.beginPath()
          ctx.shadowBlur = 4
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 3
          ctx.fillStyle = sensor.color
          // 从配置中获取标签图标大小，默认为10
          const tagIconSize = data.trackingStore.tagIconSize || 10
          ctx.arc(x, y, tagIconSize, 0, Math.PI * 2)
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
    
    // 如果有动画进行中，继续渲染循环
    if (hasAnimatingSensors) {
      requestAnimationFrame(() => renderCanvas())
    }
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

  // 处理传感器位置更新（触发动画）
  const handleSensorPositionUpdate = (sensor, newPoint) => {
    if (!newPoint) return
    
    // 转换到显示坐标
    const newX = convertToDisplayX(data.mapStore.meterToPixelX(newPoint.x))
    const newY = convertToDisplayY(data.mapStore.meterToPixelY(newPoint.y))
    
    if (!isNaN(newX) && !isNaN(newY)) {
      // 更新动画目标位置
      updateSensorAnimation(sensor, newX, newY)
    }
  }

  // 注册全局动画处理器
  window.sensorAnimationHandler = handleSensorPositionUpdate

  return {
    renderCanvas,
    renderGeofences,
    getGeofenceCenterX,
    getGeofenceCenterY,
    convertToDisplayX,
    convertToDisplayY,
    handleSensorPositionUpdate,
    updateSensorAnimation
  }
}
