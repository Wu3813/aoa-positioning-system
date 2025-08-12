import { ref, reactive, computed } from 'vue'
import { useMapStore } from '@/stores/map'
import { useTrackingStore } from '@/stores/trackingStore'

// 响应式数据
export const createMonitorData = () => {
  const mapStore = useMapStore()
  const trackingStore = useTrackingStore()
  
  // 确保 trackingStore 被正确初始化
  trackingStore.init()

  // 地图相关
  const mapImage = ref(null)
  const mapCanvas = ref(null)
  const mapList = ref([])
  const selectedMapId = ref(null)

  // 图片信息
  const imageInfo = reactive({
    width: 0,
    height: 0,
    loaded: false,
    scaleX: 1,
    scaleY: 1,
    displayWidth: 0,
    displayHeight: 0,
    domInfo: {
      offsetX: 0,
      offsetY: 0,
      displayWidth: 0,
      displayHeight: 0
    }
  })

  // 传感器搜索过滤
  const sensorFilter = ref('')

  // 筛选后的传感器列表
  const filteredSensorList = computed(() => {
    if (!sensorFilter.value) return trackingStore.sensorList
    const lowerFilter = sensorFilter.value.toLowerCase()
    return trackingStore.sensorList.filter(sensor => 
      (sensor.name && sensor.name.toLowerCase().includes(lowerFilter)) ||
      (sensor.mac && sensor.mac.toLowerCase().includes(lowerFilter))
    )
  })

  // 围栏中心点缓存
  const geofenceCenters = new Map()

  return {
    // refs
    mapImage,
    mapCanvas,
    mapList,
    selectedMapId,
    sensorFilter,
    
    // reactive
    imageInfo,
    
    // computed
    filteredSensorList,
    
    // stores
    mapStore,
    trackingStore,
    
    // cache
    geofenceCenters
  }
}
