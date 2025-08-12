import { ElMessage } from 'element-plus'
import axios from 'axios'

export function createHistoryAPI(data, mapStore, t) {
  // 获取地图列表
  const fetchMapList = async () => {
    try {
      data.mapList.value = await mapStore.fetchMapList()
      
      // 尝试获取上次选择的地图ID
      const savedMapId = mapStore.getPageMapSelection('history')
      
      // 查找保存的地图是否在当前地图列表中
      const savedMapExists = savedMapId && data.mapList.value.some(map => map.mapId === savedMapId)
      
      // 如果存在已保存的选择，使用它；否则使用第一张地图
      if (savedMapExists) {
        data.selectedMapId.value = savedMapId
      } else if (data.mapList.value.length > 0 && !data.selectedMapId.value) {
        data.selectedMapId.value = data.mapList.value[0].mapId
      }
      
      if (data.selectedMapId.value) {
        await handleMapChange(data.selectedMapId.value)
      }
      
      // 获取所有标签
      await fetchTagList()
    } catch (error) {
      console.error(t('history.console.fetchMapListFailed'), error)
      ElMessage.error(t('history.fetchMapListFailed'))
    }
  }

  // 获取标签列表
  const fetchTagList = async () => {
    try {
      const response = await axios.get('/api/tags')
      const tags = Array.isArray(response.data) ? response.data : 
                   (response.data && Array.isArray(response.data.content)) ? response.data.content : []
      
      // 获取所有标签，不再根据地图ID过滤
      data.tagList.value = tags.filter(tag => tag.macAddress)
      console.log(`获取到标签:`, data.tagList.value.length, '个')
    } catch (error) {
      console.error('获取标签列表失败:', error)
      ElMessage.error(t('history.fetchTagListFailed'))
      data.tagList.value = []
    }
  }

  // 处理地图切换
  const handleMapChange = async (mapId) => {
    try {
      await mapStore.selectMap(mapId, 'history') // 传入页面名称参数
      // 不再根据地图ID获取标签
      
      // 清空之前的数据
      data.trajectoryData.value = []
      data.searchForm.deviceId = ''
      stopPlayback()
    } catch (error) {
      console.error('切换地图失败:', error)
      ElMessage.error(t('history.switchMapFailed'))
    }
  }

  // 查询历史轨迹数据
  const handleSearch = async () => {
    if (!data.searchForm.deviceId) {
      ElMessage.warning(t('history.pleaseSelectTag'))
      return
    }
    
    if (!data.searchForm.dateRange || data.searchForm.dateRange.length !== 2) {
      ElMessage.warning(t('history.pleaseSelectTimeRange'))
      return
    }
    
    data.searchLoading.value = true
    stopPlayback()
    
    try {
      // 格式化日期时间，确保不做时区转换，直接使用选择的日期时间
      const formatDateWithoutTimezone = (date) => {
        // 直接获取年、月、日、时、分、秒组装成ISO格式字符串，不使用toISOString()避免时区转换
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      }
      
      const startTime = formatDateWithoutTimezone(data.searchForm.dateRange[0])
      const endTime = formatDateWithoutTimezone(data.searchForm.dateRange[1])
      
      console.log('查询参数(使用本地时间不转换):', {
        设备ID: data.searchForm.deviceId,
        开始时间: startTime,
        结束时间: endTime
      })
      
      const params = {
        mapId: data.selectedMapId.value,
        startTime: startTime,
        endTime: endTime,
        page: 0,
        size: 1000 // 获取足够多的数据点
      }
      
      const response = await axios.get(`/api/trajectory/device/${data.searchForm.deviceId}/history`, { params })
      const rawData = response.data || []
      
      console.log('查询结果:', rawData.length, '条数据')
      if (rawData.length > 0) {
        console.log('第一条数据时间:', rawData[0].timestamp)
        console.log('最后一条数据时间:', rawData[rawData.length - 1].timestamp)
      }
      
      // 按时间戳正序排序
      data.trajectoryData.value = rawData.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime()
        const timeB = new Date(b.timestamp).getTime()
        return timeA - timeB // 正序：最早的在前面
      })
      
      // 设置选中的标签信息
      data.selectedTag.value = data.tagList.value.find(tag => tag.macAddress === data.searchForm.deviceId)
      
      if (data.trajectoryData.value.length === 0) {
        ElMessage.info(t('history.noTrajectoryData'))
      } else {
        ElMessage.success(t('history.foundTrajectoryPoints', { count: data.trajectoryData.value.length }))
        data.currentPlayIndex.value = 0 // 从第一个点开始
      }
    } catch (error) {
      console.error('查询轨迹数据失败:', error)
      ElMessage.error(t('history.queryFailed'))
      data.trajectoryData.value = []
    } finally {
      data.searchLoading.value = false
    }
  }

  // 停止回放
  const stopPlayback = () => {
    data.isPlaying.value = false
    data.currentPlayIndex.value = 0
    if (data.playbackTimer.value) {
      clearInterval(data.playbackTimer.value)
      data.playbackTimer.value = null
    }
  }

  return {
    fetchMapList,
    fetchTagList,
    handleMapChange,
    handleSearch,
    stopPlayback
  }
}
