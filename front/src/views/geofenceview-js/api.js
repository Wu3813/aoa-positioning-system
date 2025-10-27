import axios from 'axios'
import { ElMessage } from 'element-plus'

export function createGeofenceAPI(data, t) {
  const fetchGeofences = async () => {
    data.loading.value = true
    try {
      const params = {}
      if (data.searchForm.name) params.name = data.searchForm.name
      if (data.searchForm.mapId) params.mapId = data.searchForm.mapId
      if (data.searchForm.enabled !== null) params.enabled = data.searchForm.enabled
      
      const response = await axios.get('/api/geofences', { params })
      if (response.data.success) {
        const geofences = response.data.data || []
        
        // 为每个围栏添加 mapName 字段
        geofences.forEach(geofence => {
          if (geofence.mapId) {
            const map = data.mapList.value.find(m => m.mapId === geofence.mapId)
            geofence.mapName = map ? map.name : t('geofence.unknownMap')
          } else {
            geofence.mapName = '-'
          }
        })
        
        data.geofenceList.value = geofences
        console.log('围栏列表获取成功:', data.geofenceList.value)
      } else {
        ElMessage.error(response.data.message || t('geofence.fetchListFailed'))
      }
    } catch (error) {
      console.error('获取围栏列表错误:', error)
      ElMessage.error(t('geofence.fetchListFailed') + ': ' + (error.response?.data?.message || error.message))
    } finally {
      data.loading.value = false
    }
  }

  const fetchMaps = async () => {
    try {
      const response = await axios.get('/api/maps')
      // 兼容多种数据结构
      if (Array.isArray(response.data)) {
        data.mapList.value = response.data
      } else if (response.data && Array.isArray(response.data.content)) {
        data.mapList.value = response.data.content
      } else if (response.data && response.data.success && response.data.data) {
        data.mapList.value = Array.isArray(response.data.data) ? response.data.data : []
      } else {
        data.mapList.value = []
      }
      console.log('地图列表获取成功:', data.mapList.value)
    } catch (error) {
      console.error('获取地图列表错误:', error)
      ElMessage.error(t('geofence.fetchMapsFailed'))
      data.mapList.value = []
    }
  }

  // 获取地图图片URL
  const getMapImageUrl = (mapId) => {
    try {
      if (!mapId) return ''
      // 移除时间戳参数以启用浏览器缓存
      return `/api/maps/${mapId}/image`
    } catch (error) {
      console.error('生成图片URL时出错:', error)
      return ''
    }
  }

  return {
    fetchGeofences,
    fetchMaps,
    getMapImageUrl
  }
} 
