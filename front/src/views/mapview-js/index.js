import { useMapStore } from '@/stores/map'
import { onMounted, onBeforeUnmount, watch } from 'vue'
import { createMapData } from './data'
import { createMapAPI } from './api'
import { createFileHandler } from './file'
import { createCoordinateHandler } from './coordinate'
import { createUIHandler } from './ui'

export function useMapView() {
  const mapStore = useMapStore()
  
  // 创建数据管理
  const data = createMapData()
  
  // 创建API操作
  const api = createMapAPI(data)
  
  // 创建文件处理
  const fileHandler = createFileHandler(data)
  
  // 创建坐标计算
  const coordinateHandler = createCoordinateHandler(data)
  
  // 创建UI交互
  const uiHandler = createUIHandler(data)

  // 计算图片在预览区域中的实际尺寸和位置
  const calculateImageDimensions = () => {
    if (!data.previewImage.value || !data.imageInfo.width || !data.imageInfo.height) return;
    
    const container = data.previewImage.value.parentElement;
    if (!container) return;
    
    // 移除固定内边距，使用容器的实际尺寸
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const imgRatio = data.imageInfo.width / data.imageInfo.height;
    const containerRatio = containerWidth / containerHeight;
    
    let displayWidth, displayHeight;
    let offsetX = 0, offsetY = 0;
    
    if (imgRatio > containerRatio) {
      // 图片更宽，以容器宽度为基准
      displayWidth = containerWidth;
      displayHeight = containerWidth / imgRatio;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      // 图片更高，以容器高度为基准
      displayHeight = containerHeight;
      displayWidth = containerHeight * imgRatio;
      offsetX = (containerWidth - displayWidth) / 2;
    }
    
    // 更新图片显示信息
    data.imageInfo.display = {
      width: displayWidth,
      height: displayHeight,
      offsetX: offsetX,
      offsetY: offsetY,
      scaleX: data.imageInfo.width / displayWidth,
      scaleY: data.imageInfo.height / displayHeight
    };
    
    console.log('图片显示信息:', {
      原始尺寸: `${data.imageInfo.width} x ${data.imageInfo.height}`,
      显示尺寸: `${displayWidth.toFixed(2)} x ${displayHeight.toFixed(2)}`,
      缩放比例: `${data.imageInfo.display.scaleX.toFixed(4)} x ${data.imageInfo.display.scaleY.toFixed(4)}`,
      偏移量: `${offsetX.toFixed(2)} x ${offsetY.toFixed(2)}`
    });
    
    // 重新计算并更新已有标记点的位置
    if (data.mapForm.originX !== null && data.mapForm.originY !== null) {
      coordinateHandler.updateOriginMarker();
    }
    
    if (data.scaleForm.points.length > 0) {
      // 强制更新点位置的显示
      data.scaleForm.points = [...data.scaleForm.points];
    }
  }

  // 窗口大小变化时重新计算
  window.addEventListener('resize', calculateImageDimensions);

  // 在组件卸载时移除事件监听
  onBeforeUnmount(() => {
    window.removeEventListener('resize', calculateImageDimensions);
  });

  // 处理地图点击 - 包装坐标处理器的handleMapClick
  const handleMapClick = (event) => {
    coordinateHandler.handleMapClick(event, data.previewImage.value);
  }

  // 处理预览图片加载 - 包装文件处理器的handlePreviewImageLoad
  const handlePreviewImageLoad = (event) => {
    fileHandler.handlePreviewImageLoad(event);
    // 重新计算图片尺寸
    calculateImageDimensions();
  }

  // 更新点在UI上的显示位置 - 包装坐标处理器的getDisplayPosition
  const getDisplayPosition = (pixelX, pixelY) => {
    return coordinateHandler.getDisplayPosition(pixelX, pixelY, data.previewImage.value);
  }

  // 处理排序变化 - 包装UI处理器的handleSortChange
  const handleSortChange = ({ prop, order }) => {
    uiHandler.handleSortChange({ prop, order }, data.sortOrder);
  }

  // 处理搜索 - 包装UI处理器的handleSearch
  const handleSearch = () => {
    uiHandler.handleSearch(api.fetchMapList);
  }

  // 处理重置搜索 - 包装UI处理器的handleResetSearch
  const handleResetSearch = () => {
    uiHandler.handleResetSearch(api.fetchMapList);
  }

  // 处理编辑 - 包装UI处理器的handleEdit
  const handleEdit = (row) => {
    uiHandler.handleEdit(row, api.getMapImageUrl);
  }

  // 处理新增 - 包装UI处理器的handleAdd
  const handleAdd = () => {
    uiHandler.handleAdd();
  }

  // 处理删除 - 包装API处理器的handleDelete
  const handleDelete = (row) => {
    api.handleDelete(row).then(success => {
      if (success) {
        api.fetchMapList(data.searchForm);
      }
    });
  }

  // 处理批量删除 - 包装API处理器的handleBatchDelete
  const handleBatchDelete = () => {
    api.handleBatchDelete(data.multipleSelection, data.searchForm).then(success => {
      if (success) {
        handleSearch();
      }
    });
  }

  // 处理提交 - 包装API处理器的handleSubmit
  const handleSubmit = async () => {
    const success = await api.handleSubmit(data.mapForm, data.dialogType, data.mapFormRef);
    if (success) {
      data.dialogVisible.value = false;
      api.fetchMapList(data.searchForm);
    }
  }

  // 处理设置当前地图 - 包装API处理器的handleSetCurrent
  const handleSetCurrent = (row) => {
    api.handleSetCurrent(row);
  }

  // 处理文件变更 - 包装文件处理器的handleFileChange
  const handleFileChange = (file, fileList) => {
    fileHandler.handleFileChange(file, fileList);
  }

  // 处理文件移除 - 包装文件处理器的handleFileRemove
  const handleFileRemove = () => {
    fileHandler.handleFileRemove();
  }

  // 处理文件超出限制 - 包装文件处理器的handleExceed
  const handleExceed = () => {
    fileHandler.handleExceed();
  }

  // 处理表格选择变化 - 包装UI处理器的handleSelectionChange
  const handleSelectionChange = (val) => {
    uiHandler.handleSelectionChange(val);
  }

  // 重置表单 - 包装UI处理器的resetForm
  const resetForm = () => {
    uiHandler.resetForm();
  }

  // 设置原点模式 - 包装坐标处理器的setOriginMode
  const setOriginMode = () => {
    coordinateHandler.setOriginMode();
  }

  // 完成原点设置 - 包装坐标处理器的completeOriginSetting
  const completeOriginSetting = () => {
    coordinateHandler.completeOriginSetting();
  }

  // 取消原点设置 - 包装坐标处理器的cancelOriginSetting
  const cancelOriginSetting = () => {
    coordinateHandler.cancelOriginSetting();
  }

  // 更新原点标记 - 包装坐标处理器的updateOriginMarker
  const updateOriginMarker = () => {
    coordinateHandler.updateOriginMarker();
  }

  // 设置测量模式 - 包装坐标处理器的setMeasureMode
  const setMeasureMode = () => {
    coordinateHandler.setMeasureMode();
  }

  // 完成测量 - 包装坐标处理器的completeMeasuring
  const completeMeasuring = () => {
    coordinateHandler.completeMeasuring();
  }

  // 取消测量 - 包装坐标处理器的cancelMeasuring
  const cancelMeasuring = () => {
    coordinateHandler.cancelMeasuring();
  }

  // 从输入框更新点位置 - 包装坐标处理器的updatePointFromInput
  const updatePointFromInput = (index) => {
    coordinateHandler.updatePointFromInput(index);
  }

  // 清除标记点 - 包装文件处理器的clearMarkers
  const clearMarkers = () => {
    fileHandler.clearMarkers();
  }

  // 更新坐标范围 - 包装坐标处理器的updateCoordinateRangeFromScale
  const updateCoordinateRangeFromScale = () => {
    coordinateHandler.updateCoordinateRangeFromScale();
  }

  // 更新比例尺计算 - 包装坐标处理器的updateScaleCalculation
  const updateScaleCalculation = () => {
    coordinateHandler.updateScaleCalculation();
  }

  // 重置比例尺测量 - 包装坐标处理器的resetScaleMeasurement
  const resetScaleMeasurement = () => {
    coordinateHandler.resetScaleMeasurement();
  }

  // 计算比例尺 - 包装坐标处理器的calculateScale
  const calculateScale = () => {
    return coordinateHandler.calculateScale();
  }

  // 计算像素距离 - 包装坐标处理器的calculatePixelDistance
  const calculatePixelDistance = (p1, p2) => {
    return coordinateHandler.calculatePixelDistance(p1, p2);
  }

  // 格式化日期时间 - 包装UI处理器的formatDateTime
  const formatDateTime = (dateTimeStr) => {
    return uiHandler.formatDateTime(dateTimeStr);
  }

  // 页面加载时获取地图列表
  onMounted(() => {
    api.fetchMapList(data.searchForm);
  })

  // 添加监听器，确保比例尺计算实时更新
  watch(
    [
      () => data.scaleForm.points,
      () => data.scaleForm.realDistance,
      () => data.scaleForm.pointInputs
    ],
    () => {
      if (data.scaleForm.points.length === 2 && data.scaleForm.realDistance > 0) {
        // 计算像素距离
        data.scaleForm.pixelDistance = coordinateHandler.calculatePixelDistance(data.scaleForm.points[0], data.scaleForm.points[1]);
        
        // 如果已完成比例尺设置，更新坐标范围
        if (data.hasCompletedScale.value) {
          coordinateHandler.updateCoordinateRangeFromScale();
        }
      }
    },
    { deep: true }
  );

  return {
    // 响应式数据
    ...data,

    // 方法
    getMapImageUrl: api.getMapImageUrl,
    fetchMapList: () => api.fetchMapList(data.searchForm),
    fetchCurrentMapId: api.fetchCurrentMapId,
    handleSearch,
    handleResetSearch,
    handleSelectionChange,
    calculateScale,
    calculatePixelDistance,
    handleMapClick,
    setOriginMode,
    completeOriginSetting,
    cancelOriginSetting,
    updateOriginMarker,
    handlePreviewImageLoad,
    calculateImageDimensions,
    updatePointFromInput,
    clearMarkers,
    handleFileChange,
    handleFileRemove,
    resetForm,
    handleEdit,
    handleDelete,
    handleBatchDelete,
    handleSubmit,
    handleSetCurrent,
    handleExceed,
    handleAdd,
    setMeasureMode,
    completeMeasuring,
    cancelMeasuring,
    formatDateTime,
    handleSortChange,
    updateCoordinateRangeFromScale,
    getDisplayPosition,
    updateScaleCalculation,
    resetScaleMeasurement
  }
}
