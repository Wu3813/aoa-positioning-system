import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

export function createGeofenceUI(data, api) {
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
    const action = row.enabled ? '禁用' : '启用'
    try {
      await ElMessageBox.confirm(
        `确定要${action}围栏"${row.name}"吗？`,
        '确认操作',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      const response = await axios.patch(
        `/api/geofences/${row.id}/toggle?enabled=${!row.enabled}`
      )
      
      if (response.data.success) {
        ElMessage.success(`${action}成功`)
        api.fetchGeofences()
      } else {
        ElMessage.error(response.data.message || `${action}失败`)
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error(`${action}围栏错误:`, error)
        ElMessage.error(`${action}失败: ` + (error.response?.data?.message || error.message))
      }
    }
  }

  const handleDelete = async (row) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除围栏"${row.name}"吗？此操作不可恢复！`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      const response = await axios.delete(`/api/geofences/${row.id}`)
      if (response.data.success) {
        ElMessage.success('删除成功')
        api.fetchGeofences()
      } else {
        ElMessage.error(response.data.message || '删除失败')
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除围栏错误:', error)
        ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
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
        `确定要启用选中的 ${data.multipleSelection.value.length} 个围栏吗？`,
        '确认批量启用',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      const promises = data.multipleSelection.value.map(item => 
        axios.patch(`/api/geofences/${item.id}/toggle?enabled=true`)
      )
      
      await Promise.all(promises)
      ElMessage.success('批量启用成功')
      api.fetchGeofences()
    } catch (error) {
      if (error !== 'cancel') {
        console.error('批量启用错误:', error)
        ElMessage.error('批量启用失败')
      }
    }
  }

  const handleDisableAll = async () => {
    if (data.multipleSelection.value.length === 0) return
    
    try {
      await ElMessageBox.confirm(
        `确定要禁用选中的 ${data.multipleSelection.value.length} 个围栏吗？`,
        '确认批量禁用',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      const promises = data.multipleSelection.value.map(item => 
        axios.patch(`/api/geofences/${item.id}/toggle?enabled=false`)
      )
      
      await Promise.all(promises)
      ElMessage.success('批量禁用成功')
      api.fetchGeofences()
    } catch (error) {
      if (error !== 'cancel') {
        console.error('批量禁用错误:', error)
        ElMessage.error('批量禁用失败')
      }
    }
  }

  const handleBatchDelete = async () => {
    if (data.multipleSelection.value.length === 0) return
    
    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${data.multipleSelection.value.length} 个围栏吗？此操作不可恢复！`,
        '确认批量删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      const ids = data.multipleSelection.value.map(item => item.id)
      const response = await axios.delete('/api/geofences/batch', { data: ids })
      
      if (response.data.success) {
        ElMessage.success('批量删除成功')
        api.fetchGeofences()
      } else {
        ElMessage.error(response.data.message || '批量删除失败')
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('批量删除错误:', error)
        ElMessage.error('批量删除失败: ' + (error.response?.data?.message || error.message))
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
        ElMessage.warning('请先点击"完成设置"按钮完成围栏点设置')
        return
      }
      
      await data.geofenceFormRef.value.validate()
      
      if (data.geofenceForm.points.length < 3) {
        ElMessage.warning('请设置至少3个围栏点')
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
        ElMessage.success(`${data.dialogType.value === 'add' ? '添加' : '更新'}成功`)
        data.dialogVisible.value = false
        api.fetchGeofences()
      } else {
        ElMessage.error(response.data.message || `${data.dialogType.value === 'add' ? '添加' : '更新'}失败`)
      }
    } catch (error) {
      console.error('提交表单错误:', error)
      ElMessage.error(`${data.dialogType.value === 'add' ? '添加' : '更新'}失败: ` + (error.response?.data?.message || error.message))
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
