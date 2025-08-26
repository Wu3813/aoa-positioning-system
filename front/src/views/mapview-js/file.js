import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

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
  const { t } = useI18n()

  // 处理文件变更
  const handleFileChange = (file, fileList) => {
    if (fileList.length > 1) {
      fileList.splice(0, fileList.length - 1); 
    }
    const isLt10M = file.size / 1024 / 1024 < 10; 
    if (!['image/jpeg', 'image/png'].includes(file.raw.type)) {
      ElMessage.error(t('maps.uploadFormatError'));
      uploadRef.value?.clearFiles(); 
      mapForm.file = null;
      previewImageUrl.value = null;
      return false;
    }
    if (!isLt10M) {
      ElMessage.error(t('maps.uploadSizeError'));
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
        message: t('maps.reuploadMapWarning'),
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
    ElMessage.warning(t('maps.selectOneFileOnly'))
  }

  // 处理预览图片加载 - 参考MonitorView的实现
  const handlePreviewImageLoad = (event) => {
    const img = event.target;
    
    // 获取图片的真实尺寸
    imageInfo.width = img.naturalWidth;
    imageInfo.height = img.naturalHeight;
    
    // 更新mapForm中的图片尺寸
    mapForm.width = img.naturalWidth;
    mapForm.height = img.naturalHeight;
    
    previewLoading.value = false;
    
    // 等待图片完全加载并布局完成
    setTimeout(() => {
      // 获取图片的实际显示尺寸和位置信息
      const imgRect = img.getBoundingClientRect();
      const containerRect = img.parentElement.getBoundingClientRect();
      
      // 存储图片在容器中的偏移量和显示尺寸
      imageInfo.domInfo = {
        offsetX: imgRect.left - containerRect.left,
        offsetY: imgRect.top - containerRect.top,
        displayWidth: imgRect.width,
        displayHeight: imgRect.height
      };
      
      // 更新显示尺寸和缩放比例
      imageInfo.displayWidth = imgRect.width;
      imageInfo.displayHeight = imgRect.height;
      imageInfo.scaleX = imageInfo.displayWidth / imageInfo.width;
      imageInfo.scaleY = imageInfo.displayHeight / imageInfo.height;
      
      console.log("地图图片加载完成，尺寸：", imageInfo.width, "x", imageInfo.height, 
                "显示尺寸:", imageInfo.displayWidth, "x", imageInfo.displayHeight, 
                "偏移位置:", imageInfo.domInfo.offsetX, "x", imageInfo.domInfo.offsetY,
                "缩放比例:", imageInfo.scaleX, imageInfo.scaleY);
      
      imageInfo.loaded = true;
      
      // 触发一次额外的尺寸计算，确保标记点位置正确
      setTimeout(() => {
        // 这里会通过 index.js 中的 handlePreviewImageLoad 调用 calculateImageDimensions
      }, 50);
    }, 100);
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
      ElMessage.warning(t('maps.completeCurrentOperation'));
      return;
    }
    
    // 检查是否有未完成的测量点设置（有1个点但没有2个点）
    if (scaleForm.points.length === 1 && !hasCompletedScale.value) {
      ElMessage.warning(t('maps.completeMeasureFirst'));
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
