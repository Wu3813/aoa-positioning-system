import { ElMessage } from 'element-plus'

export const createCoordinateHandler = (data) => {
  const { 
    mapForm, 
    scaleForm, 
    imageInfo, 
    isSettingOrigin, 
    isMeasuring, 
    hasCompletedScale, 
    previewImageUrl 
  } = data

  // 计算比例尺
  const calculateScale = () => {
    if (scaleForm.pixelDistance <= 0 || scaleForm.realDistance <= 0) return '未计算';
    
    const pixelsPerMeter = scaleForm.pixelDistance / scaleForm.realDistance;
    return `1 m = ${pixelsPerMeter.toFixed(2)} px`;
  }

  // 计算两点间像素距离
  const calculatePixelDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  // 处理地图点击 - 修改为使用图片实际坐标
  const handleMapClick = (event, previewImage) => {
    if (!previewImage || !imageInfo.display || !previewImageUrl.value) return;
    
    // 获取点击相对于容器的坐标
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // 获取图片的实际位置和尺寸（DOM元素尺寸）
    const imgElement = previewImage;
    const imgRect = imgElement.getBoundingClientRect();
    const imgOffsetX = imgRect.left - rect.left;
    const imgOffsetY = imgRect.top - rect.top;
    const imgDisplayWidth = imgRect.width;
    const imgDisplayHeight = imgRect.height;
    
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
      });
      return;
    }
    
    // 计算点击位置相对于图片的比例
    const relativeX = (clickX - imgOffsetX) / imgDisplayWidth;
    const relativeY = (clickY - imgOffsetY) / imgDisplayHeight;
    
    // 转换为图片上的实际像素坐标
    const imageX = Math.round(relativeX * imageInfo.width);
    const imageY = Math.round(relativeY * imageInfo.height);
    
    // 确保坐标在图片范围内
    const boundedImageX = Math.max(0, Math.min(imageInfo.width - 1, imageX));
    const boundedImageY = Math.max(0, Math.min(imageInfo.height - 1, imageY));
    
    console.log('点击位置:', { 
      显示坐标: { x: clickX, y: clickY }, 
      图片位置: { x: imgOffsetX, y: imgOffsetY },
      相对比例: { x: relativeX.toFixed(4), y: relativeY.toFixed(4) },
      转换后图片坐标: { x: boundedImageX, y: boundedImageY }
    });
    
    // 如果是设置原点模式
    if (isSettingOrigin.value) {
      mapForm.originX = boundedImageX;
      mapForm.originY = boundedImageY;
      ElMessage.info(`原点已更新为 (${boundedImageX}, ${boundedImageY})，点击"完成"按钮确认`);
      return;
    }
    
    // 如果是测量模式且未完成比例尺设置
    if (isMeasuring.value && !hasCompletedScale.value) {
      // 如果已有两个点，清除现有点
      if (scaleForm.points.length >= 2) {
        scaleForm.points = [];
        scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
      }
      
      // 添加新点（使用图片实际像素坐标）
      scaleForm.points.push({ x: boundedImageX, y: boundedImageY });
      
      // 更新输入框
      const pointIndex = scaleForm.points.length - 1;
      scaleForm.pointInputs[pointIndex].x = boundedImageX;
      scaleForm.pointInputs[pointIndex].y = boundedImageY;
      
      // 提示用户
      if (scaleForm.points.length === 1) {
        ElMessage.info(`已设置第一个测量点 (${boundedImageX}, ${boundedImageY})，请继续设置第二个测量点`);
      } else if (scaleForm.points.length === 2) {
        // 自动计算距离
        scaleForm.pixelDistance = calculatePixelDistance(scaleForm.points[0], scaleForm.points[1]);
        ElMessage.info(`已设置第二个测量点 (${boundedImageX}, ${boundedImageY})，请点击"完成"按钮确认设置比例尺`);
      }
      
      return;
    }
  }

  // 设置原点模式切换
  const setOriginMode = () => {
    // 检查是否处于测量模式且尚未完成
    if (isMeasuring.value) {
      ElMessage.warning('请先完成或取消当前的测量点设置');
      return;
    }
    
    // 检查是否已有测量点但未完成
    if (scaleForm.points.length > 0 && scaleForm.points.length < 2 && !hasCompletedScale.value) {
      ElMessage.warning('请先完成或取消当前的测量点设置');
      return;
    }
    
    if (!previewImageUrl.value) {
      ElMessage.warning('请先上传地图文件');
      return;
    }
    
    isSettingOrigin.value = true;
    isMeasuring.value = false; // 确保退出测量模式
    ElMessage.info('请在图片上点击设置原点位置，完成后点击"完成"按钮');
  }

  // 完成原点设置
  const completeOriginSetting = () => {
    isSettingOrigin.value = false;
    ElMessage.success(`原点设置完成: (${mapForm.originX}, ${mapForm.originY})`);
  }

  // 取消原点设置
  const cancelOriginSetting = () => {
    isSettingOrigin.value = false;
    // 如果用户取消，将原点重置为之前的值或0
    if (!mapForm.originX && !mapForm.originY) {
      mapForm.originX = 0;
      mapForm.originY = 0;
    }
  }

  // 更新原点标记
  const updateOriginMarker = () => {
    if (imageInfo.width && imageInfo.height) {
      mapForm.originX = Math.min(Math.max(0, mapForm.originX), imageInfo.width);
      mapForm.originY = Math.min(Math.max(0, mapForm.originY), imageInfo.height);
    }
  }

  // 设置测量模式
  const setMeasureMode = () => {
    if (!previewImageUrl.value) {
      ElMessage.warning('请先上传地图文件');
      return;
    }
    
    if (isSettingOrigin.value) {
      ElMessage.warning('请先完成或取消原点设置');
      return;
    }
    
    isMeasuring.value = true;
    hasCompletedScale.value = false;
    
    // 清除现有点
    scaleForm.points = [];
    scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    scaleForm.pixelDistance = 0;
    ElMessage.info('请在图片上点击设置测量点，需要设置两个点');
  }

  // 完成测量
  const completeMeasuring = () => {
    if (scaleForm.points.length < 2) {
      ElMessage.warning('请先设置两个测量点');
      return;
    }
    
    isMeasuring.value = false;
    hasCompletedScale.value = true;
    
    // 计算距离
    scaleForm.pixelDistance = calculatePixelDistance(scaleForm.points[0], scaleForm.points[1]);
    
    // 更新mapForm中的测量点和比例尺数据
    mapForm.point1X = scaleForm.points[0].x;
    mapForm.point1Y = scaleForm.points[0].y;
    mapForm.point2X = scaleForm.points[1].x;
    mapForm.point2Y = scaleForm.points[1].y;
    mapForm.realDistance = scaleForm.realDistance;
    
    if (scaleForm.pixelDistance > 0 && scaleForm.realDistance > 0) {
      const pixelsPerMeter = scaleForm.pixelDistance / scaleForm.realDistance;
      mapForm.scale = pixelsPerMeter.toFixed(2);
      ElMessage.success(`比例尺设置完成: 1 m = ${pixelsPerMeter.toFixed(2)} px`);
    }
    
    // 根据比例尺自动更新坐标范围
    updateCoordinateRangeFromScale();
  }

  // 取消测量
  const cancelMeasuring = () => {
    isMeasuring.value = false;
    
    // 如果没有已保存的测量点，或者有已保存但未完成测量，清除当前输入
    if (!mapForm.point1X || !mapForm.point1Y || !mapForm.point2X || !mapForm.point2Y || !hasCompletedScale.value) {
      scaleForm.points = [];
      scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
      scaleForm.pixelDistance = 0;
    } else {
      // 如果之前已完成测量，恢复到已保存的测量点
      scaleForm.points = [
        { x: mapForm.point1X, y: mapForm.point1Y },
        { x: mapForm.point2X, y: mapForm.point2Y }
      ];
      scaleForm.pointInputs = [
        { x: mapForm.point1X, y: mapForm.point1Y },
        { x: mapForm.point2X, y: mapForm.point2Y }
      ];
      scaleForm.pixelDistance = calculatePixelDistance(
        { x: mapForm.point1X, y: mapForm.point1Y },
        { x: mapForm.point2X, y: mapForm.point2Y }
      );
    }
    
    ElMessage.info('已取消测量点设置');
  }

  // 从输入框更新点位置
  const updatePointFromInput = (index) => {
    if (index >= 0 && index <= 1) {
      // 确保点数组有足够的元素
      while (scaleForm.points.length <= index) {
        scaleForm.points.push({ x: 0, y: 0 });
      }
      
      // 更新点坐标
      scaleForm.points[index].x = scaleForm.pointInputs[index].x;
      scaleForm.points[index].y = scaleForm.pointInputs[index].y;
      
      // 如果有两个点，重新计算距离 (无论是否在测量模式)
      if (scaleForm.points.length === 2) {
        scaleForm.pixelDistance = calculatePixelDistance(scaleForm.points[0], scaleForm.points[1]);
        
        // 只在非测量模式下或已完成比例尺设置时更新坐标范围
        if (!isMeasuring.value || hasCompletedScale.value) {
          updateCoordinateRangeFromScale();
        }
      }
    }
  }

  // 更新坐标范围
  const updateCoordinateRangeFromScale = () => {
    if (scaleForm.pixelDistance <= 0 || scaleForm.realDistance <= 0 || !imageInfo.width || !imageInfo.height) return;
    
    // 计算像素到米的比例
    const pixelsPerMeter = scaleForm.pixelDistance / scaleForm.realDistance;
    
    // 计算图片实际尺寸对应的物理尺寸（米）
    const widthInMeters = imageInfo.width / pixelsPerMeter;
    const heightInMeters = imageInfo.height / pixelsPerMeter;
    
    // 假设原点在中心，计算坐标系范围
    const originX = mapForm.originX || imageInfo.width / 2;
    const originY = mapForm.originY || imageInfo.height / 2;
    
    // 计算坐标轴范围（以米为单位）
    const xMin = -originX / pixelsPerMeter;
    const xMax = (imageInfo.width - originX) / pixelsPerMeter;
    const yMin = -originY / pixelsPerMeter;
    const yMax = (imageInfo.height - originY) / pixelsPerMeter;
    
    console.log(`地图物理尺寸: ${widthInMeters.toFixed(2)}m × ${heightInMeters.toFixed(2)}m`);
    console.log(`坐标范围: X(${xMin.toFixed(2)}, ${xMax.toFixed(2)}), Y(${yMin.toFixed(2)}, ${yMax.toFixed(2)})`);
  }

  // 更新点在UI上的显示位置
  const getDisplayPosition = (pixelX, pixelY, previewImage) => {
    if (!imageInfo.display || !previewImage) return { x: 0, y: 0 };
    
    // 确保输入坐标在图片范围内
    const boundedPixelX = Math.max(0, Math.min(imageInfo.width - 1, pixelX || 0));
    const boundedPixelY = Math.max(0, Math.min(imageInfo.height - 1, pixelY || 0));
    
    // 获取图片DOM元素的实际位置和尺寸
    const imgElement = previewImage;
    const imgRect = imgElement.getBoundingClientRect();
    const containerRect = imgElement.parentElement.getBoundingClientRect();
    const imgOffsetX = imgRect.left - containerRect.left;
    const imgOffsetY = imgRect.top - containerRect.top;
    
    // 计算坐标相对于原图的比例
    const relativeX = boundedPixelX / imageInfo.width;
    const relativeY = boundedPixelY / imageInfo.height;
    
    // 将比例应用到实际显示图片上
    const displayX = imgOffsetX + (relativeX * imgRect.width);
    const displayY = imgOffsetY + (relativeY * imgRect.height);
    
    return { x: displayX, y: displayY };
  }

  // 更新比例尺计算
  const updateScaleCalculation = () => {
    if (scaleForm.points.length === 2) {
      // 不需要重新计算像素距离，因为点没变，只是实际距离变了
      // 但可以在调试日志中显示当前计算的比例
      const pixelsPerMeter = scaleForm.pixelDistance / scaleForm.realDistance;
      console.log(`比例尺实时计算: 1 m = ${pixelsPerMeter.toFixed(2)} px (实际距离: ${scaleForm.realDistance}m, 像素距离: ${scaleForm.pixelDistance.toFixed(2)}px)`);
    }
  }

  // 重置比例尺测量
  const resetScaleMeasurement = () => {
    // 检查是否处于原点设置模式
    if (isSettingOrigin.value) {
      ElMessage.warning('请先完成或取消原点设置');
      return;
    }
    
    hasCompletedScale.value = false;
    isMeasuring.value = true;
    
    // 清除现有点
    scaleForm.points = [];
    scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    scaleForm.pixelDistance = 0;
    ElMessage.info('请在图片上点击设置测量点，需要设置两个点');
  }

  return {
    calculateScale,
    calculatePixelDistance,
    handleMapClick,
    setOriginMode,
    completeOriginSetting,
    cancelOriginSetting,
    updateOriginMarker,
    setMeasureMode,
    completeMeasuring,
    cancelMeasuring,
    updatePointFromInput,
    updateCoordinateRangeFromScale,
    getDisplayPosition,
    updateScaleCalculation,
    resetScaleMeasurement
  }
}
