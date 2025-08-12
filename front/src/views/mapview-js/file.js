import { ElMessage } from 'element-plus'

export const createFileHandler = (data) => {
  const { 
    mapForm, 
    previewLoading, 
    previewImageUrl, 
    imageInfo, 
    scaleForm, 
    isSettingOrigin, 
    isMeasuring, 
    hasCompletedScale, 
    dialogType, 
    uploadRef 
  } = data

  // 处理文件变更
  const handleFileChange = (file, fileList) => {
    if (fileList.length > 1) {
      fileList.splice(0, fileList.length - 1); 
    }
    const isLt10M = file.size / 1024 / 1024 < 10; 
    if (!['image/jpeg', 'image/png'].includes(file.raw.type)) {
      ElMessage.error('上传地图图片只能是 JPG/PNG 格式!');
      uploadRef.value?.clearFiles(); 
      mapForm.file = null;
      previewImageUrl.value = null;
      return false;
    }
    if (!isLt10M) {
      ElMessage.error('上传地图图片大小不能超过 10MB!');
      uploadRef.value?.clearFiles(); 
      mapForm.file = null;
      previewImageUrl.value = null;
      return false;
    }
    
    mapForm.file = file.raw;
    
    // 创建预览
    previewLoading.value = true;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImageUrl.value = e.target.result;
    };
    reader.readAsDataURL(mapForm.file);
    
    // 清除标记点
    clearMarkers();
    
    // 清除原点和比例尺数据
    mapForm.originX = 0;
    mapForm.originY = 0;
    mapForm.scale = null;
    mapForm.point1X = null;
    mapForm.point1Y = null;
    mapForm.point2X = null;
    mapForm.point2Y = null;
    mapForm.realDistance = 1;
    
    // 重置设置状态
    isSettingOrigin.value = false;
    isMeasuring.value = false;
    hasCompletedScale.value = false;
    
    // 如果是编辑模式，提示用户需要重新设置原点和比例尺
    if (dialogType.value === 'edit') {
      ElMessage.warning({
        message: '更换地图后，请重新设置原点坐标和比例尺！',
        duration: 5000
      });
    }
  }

  // 处理文件移除
  const handleFileRemove = () => {
    mapForm.file = null;
    previewImageUrl.value = null;
    clearMarkers();
    imageInfo.width = 0;
    imageInfo.height = 0;
  }

  // 处理文件超出限制
  const handleExceed = () => {
    ElMessage.warning('只能选择一个地图文件，请先移除当前文件再选择新的文件')
  }

  // 处理预览图片加载
  const handlePreviewImageLoad = (event) => {
    const img = event.target;
    imageInfo.width = img.naturalWidth;
    imageInfo.height = img.naturalHeight;
    
    // 更新mapForm中的图片尺寸
    mapForm.width = img.naturalWidth;
    mapForm.height = img.naturalHeight;
    
    previewLoading.value = false;
    
    if (!imageInfo.originalImage) {
      imageInfo.originalImage = new Image();
      imageInfo.originalImage.src = img.src;
    }
    
    calculateImageDimensions();
  }

  // 计算图片在预览区域中的实际尺寸和位置
  const calculateImageDimensions = () => {
    if (!imageInfo.width || !imageInfo.height) return;
    
    // 这里需要从外部传入 previewImage 引用
    // 暂时留空，在 index.js 中实现
  }

  // 清除标记点
  const clearMarkers = () => {
    if (isSettingOrigin.value || isMeasuring.value) {
      ElMessage.warning('请先完成当前操作');
      return;
    }
    
    // 检查是否有未完成的测量点设置（有1个点但没有2个点）
    if (scaleForm.points.length === 1 && !hasCompletedScale.value) {
      ElMessage.warning('请先完成或取消测量点设置');
      return;
    }
    
    scaleForm.points = [];
    scaleForm.pixelDistance = 0;
    scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  }

  return {
    handleFileChange,
    handleFileRemove,
    handleExceed,
    handlePreviewImageLoad,
    calculateImageDimensions,
    clearMarkers
  }
}
