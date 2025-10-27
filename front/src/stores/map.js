import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useMapStore = defineStore('map', () => {
  const mapList = ref([])
  const selectedMap = ref(null)
  const pageMapSelections = ref({
    monitor: null,
    history: null,
    // 可以添加其他页面的选择
  })
  
  const mapUrl = computed(() => {
    return selectedMap.value ? `/api/maps/${selectedMap.value.mapId}/image` : ''
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

  // 根据页面记住选择的地图
  async function selectMap(mapId, pageName = null) {
    try {
      if (!mapId) {
        selectedMap.value = null
        return null
      }
      
      // 直接使用mapId查询地图详情
      const response = await axios.get(`/api/maps/${mapId}`)
      selectedMap.value = response.data
      
      // 如果指定了页面名称，保存该页面的选择（存储mapId而不是id）
      if (pageName && Object.keys(pageMapSelections.value).includes(pageName)) {
        pageMapSelections.value[pageName] = selectedMap.value.mapId
        // 保存到localStorage
        saveMapSelections()
      }
      
      return selectedMap.value
    } catch (error) {
      console.error('获取地图详情失败:', error)
      return null
    }
  }
  
  // 获取特定页面保存的地图选择
  function getPageMapSelection(pageName) {
    if (!pageName || !Object.keys(pageMapSelections.value).includes(pageName)) {
      return null
    }
    return pageMapSelections.value[pageName]
  }
  
  // 保存所有页面的地图选择到localStorage
  function saveMapSelections() {
    try {
      localStorage.setItem('pageMapSelections', JSON.stringify(pageMapSelections.value))
    } catch (error) {
      console.error('保存地图选择失败:', error)
    }
  }
  
  // 从localStorage加载页面地图选择
  function loadMapSelections() {
    try {
      const saved = localStorage.getItem('pageMapSelections')
      if (saved) {
        const selections = JSON.parse(saved)
        // 合并保存的选择到当前状态
        Object.keys(pageMapSelections.value).forEach(key => {
          if (selections[key]) {
            pageMapSelections.value[key] = selections[key]
          }
        })
      }
    } catch (error) {
      console.error('加载地图选择失败:', error)
    }
  }
  
  // 初始化时加载保存的选择
  loadMapSelections()

  return {
    mapList,
    selectedMap,
    pageMapSelections,
    mapUrl,
    pixelsPerMeter,
    meterToPixelX,
    meterToPixelY,
    pixelToMeterX,
    pixelToMeterY,
    fetchMapList,
    selectMap,
    getPageMapSelection
  }
})