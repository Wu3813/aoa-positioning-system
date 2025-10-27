import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { useI18n } from 'vue-i18n'

export const createMapAPI = (data) => {
  const { mapList, loading, currentMapId } = data
  const { t } = useI18n()

  // 获取地图图片 URL
  const getMapImageUrl = (mapId) => {
    if (!mapId) return '';
    // 移除时间戳参数以启用浏览器缓存
    return `/api/maps/${mapId}/image`;
  }

  // 获取地图列表
  const fetchMapList = async (searchForm) => {
    loading.value = true
    try {
      const params = {}
      
      if (searchForm.mapName && searchForm.mapName.trim()) {
        params.name = searchForm.mapName.trim()
      }
      
      const response = await axios.get('/api/maps', { params })
      if (response.data && response.data.content) {
        mapList.value = response.data.content
      } else {
        mapList.value = Array.isArray(response.data) ? response.data : []
      }
      
      await fetchCurrentMapId()
    } catch (error) {
      console.error('获取地图列表失败:', error)
      ElMessage.error(t('maps.fetchMapListFailed'))
      mapList.value = []
    } finally {
      loading.value = false
    }
  }

  // 获取当前地图ID
  const fetchCurrentMapId = async () => {
     try {
        const currentMapResponse = await axios.get('/api/maps/current')
        currentMapId.value = currentMapResponse.data?.mapId || null
      } catch (error) {
         console.warn('获取当前地图失败:', error)
         if (!currentMapId.value) {
             currentMapId.value = null
         }
      }
  }

  // 删除地图
  const handleDelete = (row) => {
    return ElMessageBox.confirm(t('maps.deleteMapConfirm', { name: row.name }), t('common.warning'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    }).then(async () => {
      try {
        await axios.delete(`/api/maps/${row.mapId}`)
        ElMessage.success(t('maps.deleteSuccess'))
        return true
      } catch (error) {
        console.error('删除失败:', error)
        ElMessage.error(t('maps.deleteFailed'))
        return false
      }
    }).catch(() => {
      // 用户取消
      return false
    })
  }

  // 批量删除
  const handleBatchDelete = (multipleSelection, searchForm) => {
    if (!multipleSelection.length) {
      ElMessage.warning(t('maps.selectMapToDelete'))
      return Promise.resolve(false)
    }

    return ElMessageBox.confirm(t('maps.batchDeleteConfirm', { count: multipleSelection.length }), t('common.warning'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    }).then(async () => {
      try {
        const mapIds = multipleSelection.map(item => item.mapId)
        await axios.delete('/api/maps/batch', { data: mapIds })
        ElMessage.success(t('maps.deleteSuccess'))
        return true
      } catch (error) {
        console.error('批量删除失败:', error)
        ElMessage.error(t('maps.batchDeleteFailed'))
        return false
      }
    }).catch(() => {
      // 取消删除
      return false
    })
  }

  // 提交表单（新增/编辑）
  const handleSubmit = async (mapForm, dialogType, mapFormRef) => {
    if (!mapFormRef.value) return false
    
    try {
      const valid = await mapFormRef.value.validate()
      if (!valid) return false
      
      // 新增地图时检查比例尺是否已设置
      if (dialogType.value === 'add') {
        if (!mapForm.file) {
          ElMessage.error(t('maps.selectMapFile'))
          return false
        }
        if (!mapForm.scale || mapForm.scale <= 0) {
          ElMessage.error(t('maps.setScaleFirst'))
          return false
        }
      }
      
      const formData = new FormData()
      formData.append('mapId', mapForm.mapId)
      formData.append('name', mapForm.name)
      
      // 添加原点坐标
      if (mapForm.originX !== null) formData.append('originX', mapForm.originX)
      if (mapForm.originY !== null) formData.append('originY', mapForm.originY)
      
      // 添加图片尺寸
      if (mapForm.width > 0) formData.append('width', mapForm.width)
      if (mapForm.height > 0) formData.append('height', mapForm.height)
      
      // 添加比例尺数据
      if (mapForm.scale) formData.append('scale', mapForm.scale)
      
      // 添加测量点数据
      if (mapForm.point1X !== null) formData.append('point1X', mapForm.point1X)
      if (mapForm.point1Y !== null) formData.append('point1Y', mapForm.point1Y)
      if (mapForm.point2X !== null) formData.append('point2X', mapForm.point2X)
      if (mapForm.point2Y !== null) formData.append('point2Y', mapForm.point2Y)
      if (mapForm.realDistance) formData.append('realDistance', mapForm.realDistance)
      
      if (dialogType.value === 'add') {
        formData.append('file', mapForm.file)
        await axios.post('/api/maps', formData)
        ElMessage.success(t('maps.addSuccess'))
      } else {
        if (mapForm.file) {
          formData.append('file', mapForm.file)
        }
        if (!mapForm.mapId) {
          console.error('编辑地图时 mapId 丢失')
          ElMessage.error(t('maps.editFailedMapIdLost'))
          return false
        }
        await axios.put(`/api/maps/${mapForm.mapId}`, formData)
        ElMessage.success(t('maps.editSuccess'))
      }
      
      return true
    } catch (error) {
      console.error('提交失败:', error)
      const errorMsg = error.response?.data?.message || (dialogType.value === 'add' ? t('maps.addFailed') : t('maps.editFailed'))
      ElMessage.error(errorMsg)
      return false
    }
  }

  // 设置为当前地图
  const handleSetCurrent = async (row) => {
    try {
      await axios.put(`/api/maps/current/${row.mapId}`)
      currentMapId.value = row.mapId
      ElMessage.success(t('maps.setCurrentMapSuccess', { name: row.name }))
      return true
    } catch (error) {
      console.error('设置当前地图失败:', error)
      ElMessage.error(t('maps.setCurrentMapFailed'))
      return false
    }
  }

  return {
    getMapImageUrl,
    fetchMapList,
    fetchCurrentMapId,
    handleDelete,
    handleBatchDelete,
    handleSubmit,
    handleSetCurrent
  }
}
