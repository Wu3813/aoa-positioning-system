import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

export function createGeofenceUI(data, api, t) {
  const handleSearch = () => {
    api.fetchGeofences()
  }

  const handleResetSearch = () => {
    data.searchForm.name = ''
    data.searchForm.mapId = null
    data.searchForm.enabled = null
    api.fetchGeofences()
  }

  const handleAdd = () => {
    data.dialogType.value = 'add'
    data.resetForm()
    data.dialogVisible.value = true
  }

  const handleEdit = (row) => {
    data.dialogType.value = 'edit'
    data.resetForm()
    
    // 填充表单数据
    data.geofenceForm.id = row.id
    data.geofenceForm.name = row.name
    data.geofenceForm.mapId = row.mapId
    data.geofenceForm.enabled = row.enabled
    data.geofenceForm.remark = row.remark || ''
    data.geofenceForm.points = row.points ? JSON.parse(JSON.stringify(row.points)) : []
    
    // 设置地图预览
    if (row.mapId) {
      // 这里需要调用map模块的updateMapPreview方法
      // 暂时直接设置URL
      data.selectedMapImageUrl.value = api.getMapImageUrl(row.mapId)
    }
    
    data.dialogVisible.value = true
  }

  const handleToggleEnabled = async (row) => {
    const action = row.enabled ? t('geofence.disabled') : t('geofence.enabled')
    try {
      await ElMessageBox.confirm(
        t('geofence.confirmToggle', { action: action, name: row.name }),
        t('common.confirm'),
        {
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        }
      )
      
      const response = await axios.patch(
        `/api/geofences/${row.id}/toggle?enabled=${!row.enabled}`
      )
      
      if (response.data.success) {
        ElMessage.success(t('geofence.toggleSuccess', { action: action }))
        api.fetchGeofences()
      } else {
        ElMessage.error(response.data.message || t('geofence.toggleFailed', { action: action }))
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error(`${action}围栏错误:`, error)
        ElMessage.error(t('geofence.toggleFailed', { action: action }) + ': ' + (error.response?.data?.message || error.message))
      }
    }
  }

  const handleDelete = async (row) => {
    try {
      await ElMessageBox.confirm(
        t('geofence.confirmDelete', { name: row.name }),
        t('common.confirm'),
        {
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        }
      )
      
      const response = await axios.delete(`/api/geofences/${row.id}`)
      if (response.data.success) {
        ElMessage.success(t('geofence.deleteSuccess'))
        api.fetchGeofences()
      } else {
        ElMessage.error(response.data.message || t('geofence.deleteFailed'))
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除围栏错误:', error)
        ElMessage.error(t('geofence.deleteFailed') + ': ' + (error.response?.data?.message || error.message))
      }
    }
  }

  const handleSelectionChange = (selection) => {
    data.multipleSelection.value = selection
  }

  const handleEnableAll = async () => {
    if (data.multipleSelection.value.length === 0) return
    
    try {
      await ElMessageBox.confirm(
        t('geofence.confirmBatchEnable', { count: data.multipleSelection.value.length }),
        t('common.confirm'),
        {
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        }
      )
      
      const promises = data.multipleSelection.value.map(item => 
        axios.patch(`/api/geofences/${item.id}/toggle?enabled=true`)
      )
      
      await Promise.all(promises)
      ElMessage.success(t('geofence.batchEnableSuccess'))
      api.fetchGeofences()
    } catch (error) {
      if (error !== 'cancel') {
        console.error('批量启用错误:', error)
        ElMessage.error(t('geofence.batchEnableFailed'))
      }
    }
  }

  const handleDisableAll = async () => {
    if (data.multipleSelection.value.length === 0) return
    
    try {
      await ElMessageBox.confirm(
        t('geofence.confirmBatchDisable', { count: data.multipleSelection.value.length }),
        t('common.confirm'),
        {
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        }
      )
      
      const promises = data.multipleSelection.value.map(item => 
        axios.patch(`/api/geofences/${item.id}/toggle?enabled=false`)
      )
      
      await Promise.all(promises)
      ElMessage.success(t('geofence.batchDisableSuccess'))
      api.fetchGeofences()
    } catch (error) {
      if (error !== 'cancel') {
        console.error('批量禁用错误:', error)
        ElMessage.error(t('geofence.batchDisableFailed'))
      }
    }
  }

  const handleBatchDelete = async () => {
    if (data.multipleSelection.value.length === 0) return
    
    try {
      await ElMessageBox.confirm(
        t('geofence.confirmBatchDelete', { count: data.multipleSelection.value.length }),
        t('common.confirm'),
        {
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        }
      )
      
      const ids = data.multipleSelection.value.map(item => item.id)
      const response = await axios.delete('/api/geofences/batch', { data: ids })
      
      if (response.data.success) {
        ElMessage.success(t('geofence.batchDeleteSuccess'))
        api.fetchGeofences()
      } else {
        ElMessage.error(response.data.message || t('geofence.batchDeleteFailed'))
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('批量删除错误:', error)
        ElMessage.error(t('geofence.batchDeleteFailed') + ': ' + (error.response?.data?.message || error.message))
      }
    }
  }

  const handleSortChange = ({ prop, order }) => {
    data.sortConfig.value.prop = prop
    data.sortConfig.value.order = order
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!data.geofenceFormRef.value) return
    
    try {
      // 检查是否处于设置点模式
      if (data.isSettingPoints.value) {
        ElMessage.warning(t('geofence.completeSettingFirst'))
        return
      }
      
      await data.geofenceFormRef.value.validate()
      
      if (data.geofenceForm.points.length < 3) {
        ElMessage.warning(t('geofence.needThreePointsForSave'))
        return
      }
      
      data.submitLoading.value = true
      
      const formData = {
        name: data.geofenceForm.name,
        mapId: data.geofenceForm.mapId,
        enabled: data.geofenceForm.enabled,
        remark: data.geofenceForm.remark,
        points: data.geofenceForm.points
      }
      
      let response
      if (data.dialogType.value === 'add') {
        response = await axios.post('/api/geofences', formData)
      } else {
        response = await axios.put(`/api/geofences/${data.geofenceForm.id}`, formData)
      }
      
      if (response.data.success) {
        ElMessage.success(data.dialogType.value === 'add' ? t('geofence.addSuccess') : t('geofence.updateSuccess'))
        data.dialogVisible.value = false
        api.fetchGeofences()
      } else {
        ElMessage.error(response.data.message || (data.dialogType.value === 'add' ? t('geofence.addFailed') : t('geofence.updateFailed')))
      }
    } catch (error) {
      console.error('提交表单错误:', error)
      ElMessage.error((data.dialogType.value === 'add' ? t('geofence.addFailed') : t('geofence.updateFailed')) + ': ' + (error.response?.data?.message || error.message))
    } finally {
      data.submitLoading.value = false
    }
  }

  return {
    handleSearch,
    handleResetSearch,
    handleAdd,
    handleEdit,
    handleToggleEnabled,
    handleDelete,
    handleSelectionChange,
    handleEnableAll,
    handleDisableAll,
    handleBatchDelete,
    handleSortChange,
    handleSubmit
  }
} 
