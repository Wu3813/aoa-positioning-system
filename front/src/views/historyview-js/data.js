import { ref, reactive, computed } from 'vue'

export function createHistoryData() {
  // 地图相关
  const mapList = ref([])
  const selectedMapId = ref(null)
  const mapImage = ref(null)
  const imageInfo = reactive({
    width: 0,
    height: 0,
    loaded: false,
    scaleX: 1,
    scaleY: 1
  })

  // 标签相关
  const tagList = ref([])
  const selectedTag = ref(null)

  // 查询参数
  const searchForm = reactive({
    deviceId: '',
    dateRange: []
  })
  const searchLoading = ref(false)
  const exportLoading = ref(false)

  // 轨迹数据
  const trajectoryData = ref([])

  // 回放控制
  const isPlaying = ref(false)
  const currentPlayIndex = ref(0)
  const playbackSpeed = ref(1)
  const playbackTimer = ref(null)

  // 计算当前显示的轨迹
  const displayTrajectory = computed(() => {
    // 始终只显示到当前播放位置的部分轨迹
    return trajectoryData.value.slice(0, currentPlayIndex.value + 1)
  })

  // 计算当前点
  const currentPoint = computed(() => {
    if (trajectoryData.value.length === 0 || currentPlayIndex.value < 0) {
      return null
    }
    return trajectoryData.value[currentPlayIndex.value]
  })

  return {
    // 地图相关
    mapList,
    selectedMapId,
    mapImage,
    imageInfo,
    
    // 标签相关
    tagList,
    selectedTag,
    
    // 查询参数
    searchForm,
    searchLoading,
    exportLoading,
    
    // 轨迹数据
    trajectoryData,
    
    // 回放控制
    isPlaying,
    currentPlayIndex,
    playbackSpeed,
    playbackTimer,
    
    // 计算属性
    displayTrajectory,
    currentPoint
  }
}
