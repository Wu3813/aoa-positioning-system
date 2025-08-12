import { ElMessage } from 'element-plus'

export const createUIHandler = (data) => {
  const { 
    searchForm, 
    multipleSelection, 
    dialogVisible, 
    dialogType, 
    mapForm, 
    mapFormRef, 
    uploadRef, 
    scaleForm, 
    imageInfo, 
    previewImageUrl, 
    isSettingOrigin, 
    isMeasuring, 
    hasCompletedScale 
  } = data

  // 搜索
  const handleSearch = (fetchMapList) => {
    fetchMapList(searchForm)
  }

  // 重置搜索
  const handleResetSearch = (fetchMapList) => {
    searchForm.mapName = ''
    fetchMapList(searchForm)
  }

  // 表格选择变化
  const handleSelectionChange = (val) => {
    multipleSelection.value = val
  }

  // 处理排序变化
  const handleSortChange = ({ prop, order }, sortOrder) => {
    sortOrder.value = { prop, order };
  }

  // 重置表单
  const resetForm = () => {
    if (mapFormRef.value) {
      mapFormRef.value.resetFields();
    }
    mapForm.mapId = '';
    mapForm.file = null;
    mapForm.name = '';
    mapForm.originX = 0;
    mapForm.originY = 0;
    mapForm.width = 0;
    mapForm.height = 0;
    mapForm.scale = null;
    mapForm.point1X = null;
    mapForm.point1Y = null;
    mapForm.point2X = null;
    mapForm.point2Y = null;
    mapForm.realDistance = 1;
    
    if (uploadRef.value) {
      uploadRef.value.clearFiles();
    }
    
    // 重置比例尺计算
    scaleForm.points = [];
    scaleForm.pixelDistance = 0;
    scaleForm.realDistance = 1;
    scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    
    // 重置预览
    previewImageUrl.value = null;
    imageInfo.width = 0;
    imageInfo.height = 0;
    imageInfo.originalImage = null;
    
    // 重置原点设置模式
    isSettingOrigin.value = false;
    // 重置测量模式
    isMeasuring.value = false;
    // 重置比例尺完成状态
    hasCompletedScale.value = false;
  }

  // 编辑地图
  const handleEdit = (row, getMapImageUrl) => {
    resetForm();
    dialogType.value = 'edit';
    // 填充表单数据
    mapForm.mapId = row.mapId;
    mapForm.name = row.name;
    mapForm.originX = row.originX || 0;
    mapForm.originY = row.originY || 0;
    mapForm.width = row.width || 0;
    mapForm.height = row.height || 0;
    mapForm.scale = row.scale || null;
    mapForm.point1X = row.point1X || null;
    mapForm.point1Y = row.point1Y || null;
    mapForm.point2X = row.point2X || null;
    mapForm.point2Y = row.point2Y || null;
    mapForm.realDistance = row.realDistance || 1;
    mapForm.file = null;
    
    // 如果有测量点坐标，恢复到scaleForm中
    if (row.point1X !== null && row.point1Y !== null && row.point2X !== null && row.point2Y !== null) {
      scaleForm.points = [
        { x: row.point1X, y: row.point1Y },
        { x: row.point2X, y: row.point2Y }
      ];
      scaleForm.pointInputs = [
        { x: row.point1X, y: row.point1Y },
        { x: row.point2X, y: row.point2Y }
      ];
      
      // 恢复比例尺相关数据
      scaleForm.realDistance = row.realDistance || 1;
      scaleForm.pixelDistance = calculatePixelDistance(
        { x: row.point1X, y: row.point1Y },
        { x: row.point2X, y: row.point2Y }
      );
      
      // 设置比例尺已完成标志
      if (row.scale) {
        hasCompletedScale.value = true;
      }
    } else {
      // 没有测量点数据，重置比例尺相关字段
      scaleForm.points = [];
      scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
      scaleForm.pixelDistance = 0;
      scaleForm.realDistance = 1;
      hasCompletedScale.value = false;
    }
    
    // 加载预览图
    previewImageUrl.value = getMapImageUrl(row.mapId);
    
    dialogVisible.value = true;
    if (uploadRef.value) {
      uploadRef.value.clearFiles();
    }
  }

  // 新增地图
  const handleAdd = () => {
    resetForm()
    dialogType.value = 'add'
    dialogVisible.value = true
    
    // 确保比例尺计算相关的表单字段初始化
    scaleForm.points = []
    scaleForm.pointInputs = [{ x: 0, y: 0 }, { x: 0, y: 0 }]
    scaleForm.pixelDistance = 0
    scaleForm.realDistance = 1
  }

  // 计算两点间像素距离（工具函数）
  const calculatePixelDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  // 格式化日期时间
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return dateTimeStr;
      
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
    } catch (e) {
      return dateTimeStr;
    }
  }

  return {
    handleSearch,
    handleResetSearch,
    handleSelectionChange,
    handleSortChange,
    resetForm,
    handleEdit,
    handleAdd,
    formatDateTime
  }
}
