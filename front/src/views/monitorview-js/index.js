import { onMounted, watch, onUnmounted } from 'vue'
import { createMonitorData } from './data'
import { createMonitorAPI } from './api'
import { createRenderHandler } from './render'
import { createUIHandler } from './ui'

export function useMonitorView() {
  // 创建数据管理
  const data = createMonitorData()
  
  // 创建渲染处理器
  const renderHandler = createRenderHandler(data)
  
  // 创建UI交互处理器
  const uiHandler = createUIHandler(data, renderHandler)
  
  // 创建API操作
  const api = createMonitorAPI(data)

  // 自动刷新相关
  let autoRefreshInterval = null
  let renderRequestId = null
  let isRendering = false
  let needsRender = false
  const AUTO_REFRESH_INTERVAL = 16 // 16ms (约60fps)，平衡性能与流畅度

  // 智能渲染函数 - 确保动画期间持续渲染
  const smartRender = () => {
    if (isRendering) return
    
    isRendering = true
    needsRender = false
    
    // 检查是否有动画或数据更新需要渲染
    const hasAnimatingSensors = data.trackingStore.visibleSensorsList.some(sensor => 
      sensor.animationState && sensor.animationState.isAnimating
    )
    
    // 总是渲染，确保流畅度
    renderHandler.renderCanvas()
    
    // 如果还有动画在进行，继续渲染循环
    if (hasAnimatingSensors) {
      renderRequestId = requestAnimationFrame(smartRender)
    } else {
      renderRequestId = null
    }
    
    isRendering = false
  }

  // 触发渲染（外部调用）
  const triggerRender = () => {
    needsRender = true
    if (!isRendering && !renderRequestId) {
      renderRequestId = requestAnimationFrame(smartRender)
    }
  }

  // 设置自动刷新
  const setupAutoRefresh = () => {
    // 先清除已有的定时器
    clearAutoRefresh();
    
    // 设置新的定时器用于数据检查
    autoRefreshInterval = setInterval(() => {
      // 只有当有传感器数据且地图已加载时才需处理
      if (data.trackingStore.visibleSensorsList.length > 0 && data.mapStore.selectedMap && data.imageInfo.loaded) {
        // 检查轨迹数据是否有更新
        const hasNewData = data.trackingStore.hasDataUpdates();
        
        // 如果有新数据，触发Vue更新和渲染
        if (hasNewData) {
          // 通知Vue更新DOM
          data.trackingStore.notifyUpdate();
          // 触发渲染
          triggerRender();
        }
        
        // 检查是否有动画在进行，如果有则持续渲染
        const hasAnimatingSensors = data.trackingStore.visibleSensorsList.some(sensor => 
          sensor.animationState && sensor.animationState.isAnimating
        )
        
        if (hasAnimatingSensors && !renderRequestId) {
          triggerRender();
        }
      }
    }, AUTO_REFRESH_INTERVAL);
  }

  // 清除自动刷新
  const clearAutoRefresh = () => {
    if (autoRefreshInterval !== null) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
    
    // 取消requestAnimationFrame
    if (renderRequestId !== null) {
      cancelAnimationFrame(renderRequestId);
      renderRequestId = null;
    }
  }

  // 组件挂载处理函数
  const onMountedHandler = async () => {
    await api.fetchMapList();
    
    window.addEventListener('resize', () => {
      // 窗口大小变化时更新缩放比例
      if (data.mapStore.selectedMap && data.imageInfo.loaded) {
        // 清除坐标转换缓存
        data.trackingStore.coordinateCache?.clear();
        
        // 延迟更新缩放比例，确保DOM已经完成重排
        setTimeout(() => {
          uiHandler.updateScaleFactor();
        }, 100);
      }
    });
    
    // 设置自动刷新，确保轨迹实时显示
    setupAutoRefresh();
  }

  // 监听地图变化处理函数
  const watchMapChange = () => {
    data.geofenceCenters.clear();
    
    // 🎯 地图变化时，先重置所有传感器动画状态
    if (renderHandler.resetAllSensorAnimations) {
      renderHandler.resetAllSensorAnimations();
      console.log('地图变化，已重置所有传感器动画状态');
    }
    
    // 当地图变化时，重置图片信息状态
    data.imageInfo.loaded = false;
    data.imageInfo.width = 0;
    data.imageInfo.height = 0;
    data.imageInfo.scaleX = 1;
    data.imageInfo.scaleY = 1;
    data.imageInfo.displayWidth = 0;
    data.imageInfo.displayHeight = 0;
    data.imageInfo.domInfo = {
      offsetX: 0,
      offsetY: 0,
      displayWidth: 0,
      displayHeight: 0
    };
  }

  // 监听轨迹数据更新处理函数
  const watchTrackingData = () => {
    // 轨迹数据更新时，触发Canvas重绘
    if (data.imageInfo.loaded && data.mapCanvas.value) {
      triggerRender();
    }
  }

  // 组件卸载处理函数
  const onUnmountedHandler = () => {
    data.geofenceCenters.clear();
    clearAutoRefresh();
    
    // 断开WebSocket连接
    data.trackingStore.disconnect();
  }

  return {
    // refs
    mapImage: data.mapImage,
    mapCanvas: data.mapCanvas,
    imageInfo: data.imageInfo,
    mapList: data.mapList,
    selectedMapId: data.selectedMapId,
    sensorFilter: data.sensorFilter,
    
    // computed
    filteredSensorList: data.filteredSensorList,
    
    // stores
    mapStore: data.mapStore,
    trackingStore: data.trackingStore,
    
    // methods
    goToMapManagement: uiHandler.goToMapManagement,
    handleMapChange: api.handleMapChange,
    toggleVisibility: uiHandler.toggleVisibility,
    toggleAllVisible: uiHandler.toggleAllVisible,
    changeSensorColor: data.trackingStore.changeSensorColor,
    handleColorChange: (mac, color) => {
      console.log('颜色更改事件触发:', { mac, color })
      if (mac) {
        try {
          data.trackingStore.changeSensorColor(mac, color)
          console.log('颜色更改成功:', { mac, color })
        } catch (error) {
          console.error('颜色更改失败:', error)
        }
      } else {
        console.warn('颜色更改参数无效:', { mac, color })
      }
    },
    handleImageLoad: uiHandler.handleImageLoad,
    updateScaleFactor: uiHandler.updateScaleFactor,
    renderCanvas: renderHandler.renderCanvas,
    renderGeofences: renderHandler.renderGeofences,
    getGeofenceCenterX: renderHandler.getGeofenceCenterX,
    getGeofenceCenterY: renderHandler.getGeofenceCenterY,
    convertToDisplayX: renderHandler.convertToDisplayX,
    convertToDisplayY: renderHandler.convertToDisplayY,
    setupAutoRefresh,
    clearAutoRefresh,
    triggerRender,
    
    // lifecycle
    onMountedHandler,
    watchMapChange,
    watchTrackingData,
    onUnmountedHandler
  }
}
