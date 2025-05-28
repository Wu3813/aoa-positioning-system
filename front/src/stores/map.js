import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useMapStore = defineStore('map', () => {
  const mapList = ref([])
  const selectedMap = ref(null)
  
  const mapUrl = computed(() => {
    return selectedMap.value ? `/api/maps/${selectedMap.value.id}/image?t=${Date.now()}` : ''
  })

  // 计算坐标像素转换比例
  const pixelsPerMeter = computed(() => selectedMap.value?.scale || 1)
  
  // 根据原点和比例尺计算坐标转换函数
  // 注意：在物理坐标系中，Y轴向上为正；在图片坐标系中，Y轴向下为正
  const meterToPixelX = (x) => {
    if (!selectedMap.value || typeof x !== 'number') return 0
    const originX = selectedMap.value.originX || 0
    return originX + x * pixelsPerMeter.value
  }
  
  const meterToPixelY = (y) => {
    if (!selectedMap.value || typeof y !== 'number') return 0
    const originY = selectedMap.value.originY || 0
    // Y轴在物理坐标系中向上为正，在图片坐标系中向下为正，所以用减法
    return originY - y * pixelsPerMeter.value
  }
  
  const pixelToMeterX = (pixelX) => {
    if (!selectedMap.value || typeof pixelX !== 'number') return 0
    const originX = selectedMap.value.originX || 0
    return (pixelX - originX) / pixelsPerMeter.value
  }
  
  const pixelToMeterY = (pixelY) => {
    if (!selectedMap.value || typeof pixelY !== 'number') return 0
    const originY = selectedMap.value.originY || 0
    // Y轴在物理坐标系中向上为正，在图片坐标系中向下为正，所以用减法
    return (originY - pixelY) / pixelsPerMeter.value
  }

  async function fetchMapList() {
    try {
      const response = await axios.get('/api/maps')
      mapList.value = response.data
      return mapList.value
    } catch (error) {
      console.error('获取地图列表失败:', error)
      return []
    }
  }

  async function selectMap(mapId) {
    try {
      if (!mapId) {
        selectedMap.value = null
        return null
      }
      
      const response = await axios.get(`/api/maps/${mapId}`)
      selectedMap.value = response.data
      return selectedMap.value
    } catch (error) {
      console.error('获取地图详情失败:', error)
      return null
    }
  }

  return {
    mapList,
    selectedMap,
    mapUrl,
    pixelsPerMeter,
    meterToPixelX,
    meterToPixelY,
    pixelToMeterX,
    pixelToMeterY,
    fetchMapList,
    selectMap
  }
})