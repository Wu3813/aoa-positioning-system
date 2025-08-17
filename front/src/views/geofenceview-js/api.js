import axios from 'axios'
import { ElMessage } from 'element-plus'

export function createGeofenceAPI(data) {
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
            geofence.mapName = map ? map.name : '未知地图'
          } else {
            geofence.mapName = '-'
          }
        })
        
        data.geofenceList.value = geofences
        console.log('围栏列表获取成功:', data.geofenceList.value)
      } else {
        ElMessage.error(response.data.message || '获取围栏列表失败')
      }
    } catch (error) {
      console.error('获取围栏列表错误:', error)
      ElMessage.error('获取围栏列表失败: ' + (error.response?.data?.message || error.message))
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
      ElMessage.error('获取地图列表失败')
      data.mapList.value = []
    }
  }

  // 获取地图图片URL
  const getMapImageUrl = (mapId) => {
    try {
      if (!mapId) return ''
      return `/api/maps/${mapId}/image?t=${Date.now()}`
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
