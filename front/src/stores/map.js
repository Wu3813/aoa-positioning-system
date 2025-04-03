import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useMapStore = defineStore('map', () => {
  const currentMapId = ref(null)
  const currentMap = ref(null)
  const mapUrl = computed(() => {
    const baseUrl = 'http://localhost:8080'
    return currentMap.value ? `${baseUrl}/api/maps/${currentMap.value.id}/image` : ''
  })
  const coordinateRange = computed(() => ({
    x: {
      min: currentMap.value?.xmin ?? -6,
      max: currentMap.value?.xmax ?? 6
    },
    y: {
      min: currentMap.value?.ymin ?? -2,
      max: currentMap.value?.ymax ?? 10
    }
  }))

  async function fetchCurrentMap() {
    try {
      const response = await axios.get('/api/maps/current')
      currentMapId.value = response.data?.id
      if (currentMapId.value) {
        const mapResponse = await axios.get(`/api/maps/${currentMapId.value}`)
        currentMap.value = mapResponse.data
      }
    } catch (error) {
      console.error('获取当前地图失败:', error)
    }
  }

  return {
    currentMapId,
    currentMap,
    mapUrl,
    coordinateRange,
    fetchCurrentMap
  }
})