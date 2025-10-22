import { useRouter } from 'vue-router'
import { nextTick } from 'vue'

// UI交互相关
export const createUIHandler = (data, renderHandler) => {
  const router = useRouter()

  // 前往地图管理页面
  const goToMapManagement = () => {
    router.push('/home/maps')
  }

  // 修改显示切换逻辑
  const toggleVisibility = (sensor) => {
    data.trackingStore.toggleVisibility(sensor)
    // 切换显示状态后重新渲染Canvas
    renderHandler.renderCanvas()
  }

  // 切换所有传感器显示状态
  const toggleAllVisible = (visible) => {
    data.trackingStore.toggleAllVisible(visible)
    // 切换显示状态后重新渲染Canvas
    renderHandler.renderCanvas()
  }

  // 图片加载事件处理函数
  const handleImageLoad = (e) => {
    const img = e.target
    if (img) {
      // 获取图片的真实尺寸（而不是显示尺寸）
      data.imageInfo.width = img.naturalWidth
      data.imageInfo.height = img.naturalHeight
      
      // 如果地图数据有尺寸信息，使用地图数据中的尺寸
      if (data.mapStore.selectedMap?.width && data.mapStore.selectedMap?.height) {
        data.imageInfo.width = data.mapStore.selectedMap.width
        data.imageInfo.height = data.mapStore.selectedMap.height
      }
      
      // 等待图片完全加载并布局完成
      nextTick(() => {
        // 获取图片的实际显示尺寸和位置信息
        const imgRect = img.getBoundingClientRect();
        const containerRect = img.parentElement.getBoundingClientRect();
        
        // 存储图片在容器中的偏移量和显示尺寸
        data.imageInfo.domInfo = {
          offsetX: imgRect.left - containerRect.left,
          offsetY: imgRect.top - containerRect.top,
          displayWidth: imgRect.width,
          displayHeight: imgRect.height
        };
        
        // 更新显示尺寸和缩放比例
        data.imageInfo.displayWidth = imgRect.width;
        data.imageInfo.displayHeight = imgRect.height;
        data.imageInfo.scaleX = data.imageInfo.displayWidth / data.imageInfo.width;
        data.imageInfo.scaleY = data.imageInfo.displayHeight / data.imageInfo.height;
        
        console.log("地图图片加载完成，尺寸：", data.imageInfo.width, "x", data.imageInfo.height, 
                  "显示尺寸:", data.imageInfo.displayWidth, "x", data.imageInfo.displayHeight, 
                  "偏移位置:", data.imageInfo.domInfo.offsetX, "x", data.imageInfo.domInfo.offsetY,
                  "缩放比例:", data.imageInfo.scaleX, data.imageInfo.scaleY);
        
        data.imageInfo.loaded = true;
        
        // 确保地图和坐标系计算正确初始化
        if (data.mapStore.selectedMap) {
          console.log("地图设置：", {
            原点: { x: data.mapStore.selectedMap.originX, y: data.mapStore.selectedMap.originY },
            比例尺: data.mapStore.pixelsPerMeter,
            尺寸: { width: data.imageInfo.width, height: data.imageInfo.height }
          });
        }
        
        // 🎯 画布重新加载时，先重置所有传感器动画状态和清理缓存
        if (renderHandler.resetAllSensorAnimations) {
          renderHandler.resetAllSensorAnimations();
          console.log('画布重新加载，已重置所有传感器动画状态');
        }
        
        // 清理坐标缓存
        if (renderHandler.clearCoordinateCache) {
          renderHandler.clearCoordinateCache();
          console.log('已清理坐标缓存');
        }
        
        // 图片加载完成后，初始化Canvas并首次渲染
        if (data.mapCanvas.value) {
          renderHandler.renderCanvas();
        }
      });
    }
  }

  // 添加更新缩放比例的函数
  const updateScaleFactor = () => {
    if (data.mapImage.value && data.imageInfo.width && data.imageInfo.height) {
      const img = data.mapImage.value;
      
      // 获取最新的图片位置和尺寸信息
      const imgRect = img.getBoundingClientRect();
      const containerRect = img.parentElement.getBoundingClientRect();
      
      // 更新偏移量和显示尺寸
      data.imageInfo.domInfo = {
        offsetX: imgRect.left - containerRect.left,
        offsetY: imgRect.top - containerRect.top,
        displayWidth: imgRect.width,
        displayHeight: imgRect.height
      };
      
      // 更新显示尺寸和比例
      data.imageInfo.displayWidth = imgRect.width;
      data.imageInfo.displayHeight = imgRect.height;
      data.imageInfo.scaleX = data.imageInfo.displayWidth / data.imageInfo.width;
      data.imageInfo.scaleY = data.imageInfo.displayHeight / data.imageInfo.height;
      
      console.log("更新缩放因子:", data.imageInfo.scaleX, data.imageInfo.scaleY);
      console.log("更新显示尺寸:", data.imageInfo.displayWidth, "x", data.imageInfo.displayHeight);
      console.log("更新图片位置:", data.imageInfo.domInfo.offsetX, ",", data.imageInfo.domInfo.offsetY);
      
      // 🎯 画布大小变化时，先重置所有传感器动画状态和清理缓存
      if (renderHandler.resetAllSensorAnimations) {
        renderHandler.resetAllSensorAnimations();
        console.log('画布大小变化，已重置所有传感器动画状态');
      }
      
      // 清理坐标缓存
      if (renderHandler.clearCoordinateCache) {
        renderHandler.clearCoordinateCache();
        console.log('已清理坐标缓存');
      }
      
      // 缩放比例更新后重新渲染Canvas
      renderHandler.renderCanvas();
    }
  }

  // 测试图标方法
  const testIcon = () => {
    console.log('测试图标方法被调用')
  }

  return {
    goToMapManagement,
    toggleVisibility,
    toggleAllVisible,
    handleImageLoad,
    updateScaleFactor,
    testIcon
  }
}
