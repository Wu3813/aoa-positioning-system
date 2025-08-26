import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { fetchAlarms, fetchMaps, fetchTags } from './api.js'

/**
 * 报警页面数据管理
 */
export const useAlarmData = () => {
  const { t } = useI18n()
  
  // 响应式数据
  const loading = ref(false)
  const alarmList = ref([])
  const mapList = ref([])
  const tagList = ref([])

  // 搜索表单
  const searchForm = reactive({
    name: '',
    mapId: null,
    timeRange: null,
  })

  // 排序配置
  const sortConfig = ref({
    prop: 'time',
    order: 'descending'
  })

  // 日期快捷选项
  const dateShortcuts = [
    {
      text: t('alarms.lastDay'),
      value: () => {
        const end = new Date()
        const start = new Date()
        start.setTime(start.getTime() - 3600 * 1000 * 24)
        return [start, end]
      }
    },
    {
      text: t('alarms.lastWeek'),
      value: () => {
        const end = new Date()
        const start = new Date()
        start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
        return [start, end]
      }
    },
    {
      text: t('alarms.lastMonth'),
      value: () => {
        const end = new Date()
        const start = new Date()
        start.setMonth(start.getMonth() - 1)
        return [start, end]
      }
    }
  ]

  // 计算属性 - 过滤后的报警列表
  const filteredAlarmList = computed(() => {
    let list = [...alarmList.value]
    
    // 应用排序
    if (sortConfig.value.prop) {
      list.sort((a, b) => {
        const aVal = a[sortConfig.value.prop]
        const bVal = b[sortConfig.value.prop]
        
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1
        
        let result = 0
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          result = aVal.localeCompare(bVal)
        } else {
          result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        }
        
        return sortConfig.value.order === 'ascending' ? result : -result
      })
    }
    
    return list
  })

  /**
   * 获取报警数据
   */
  const getAlarms = async () => {
    loading.value = true
    try {
      const params = {}
      
      if (searchForm.name) params.geofenceName = searchForm.name
      if (searchForm.mapId) params.mapId = searchForm.mapId
      
      if (searchForm.timeRange && searchForm.timeRange.length === 2) {
        params.startTime = searchForm.timeRange[0]
        params.endTime = searchForm.timeRange[1]
      }
      
      if (sortConfig.value.prop) {
        params.sort = `${sortConfig.value.prop},${sortConfig.value.order === 'descending' ? 'desc' : 'asc'}`
      }
      
      const data = await fetchAlarms(params)
      
      if (data && data.content) {
        alarmList.value = data.content
      } else if (data && Array.isArray(data)) {
        alarmList.value = data
      } else if (data && data.success && data.data) {
        alarmList.value = Array.isArray(data.data) ? data.data : []
      } else {
        alarmList.value = []
      }

      console.log('报警列表获取成功:', alarmList.value)
    } catch (error) {
      console.error('获取报警列表错误:', error)
      ElMessage.error(t('alarms.fetchAlarmsFailed') + ': ' + (error.response?.data?.message || error.message))
      alarmList.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取地图数据
   */
  const getMaps = async () => {
    try {
      const data = await fetchMaps()
      
      if (Array.isArray(data)) {
        mapList.value = data
      } else if (data && Array.isArray(data.content)) {
        mapList.value = data.content
      } else if (data && data.success && data.data) {
        mapList.value = Array.isArray(data.data) ? data.data : []
      } else {
        mapList.value = []
      }
      
      console.log('地图列表获取成功:', mapList.value)
    } catch (error) {
      console.error('获取地图列表错误:', error)
      ElMessage.error(t('alarms.fetchMapsFailed'))
      mapList.value = []
    }
  }

  /**
   * 获取标签数据
   */
  const getTags = async () => {
    try {
      const data = await fetchTags()
      
      if (Array.isArray(data)) {
        tagList.value = data
      } else if (data && Array.isArray(data.content)) {
        tagList.value = data.content
      } else if (data && data.success && data.data) {
        tagList.value = Array.isArray(data.data) ? data.data : []
      } else {
        tagList.value = []
      }
      
      console.log('标签列表获取成功:', tagList.value)
    } catch (error) {
      console.error('获取标签列表错误:', error)
      ElMessage.error(t('alarms.fetchTagsFailed'))
      tagList.value = []
    }
  }

  /**
   * 根据MAC地址获取标签名称
   */
  const getTagNameByMac = (mac) => {
    if (!mac) return '-'
    const tag = tagList.value.find(t => t.macAddress === mac)
    return tag ? tag.name : mac
  }

  /**
   * 处理搜索
   */
  const handleSearch = () => {
    getAlarms()
  }

  /**
   * 重置搜索
   */
  const handleResetSearch = () => {
    searchForm.name = ''
    searchForm.mapId = null
    searchForm.timeRange = null
    getAlarms()
  }

  /**
   * 处理排序变化
   */
  const handleSortChange = ({ prop, order }) => {
    sortConfig.value.prop = prop
    sortConfig.value.order = order
    getAlarms()
  }

  /**
   * 格式化坐标数据
   */
  const formatCoordinate = (value) => {
    if (value === null || value === undefined) return '-'
    return parseFloat(value).toFixed(3)
  }

  /**
   * 格式化日期时间
   */
  const formatDateTime = (dateTime) => {
    if (!dateTime) return '-'
    return new Date(dateTime).toLocaleString()
  }

  /**
   * 初始化数据
   */
  const initData = async () => {
    await Promise.all([
      getMaps(),
      getTags()
    ])
    getAlarms()
  }

  return {
    // 响应式数据
    loading,
    alarmList,
    mapList,
    tagList,
    searchForm,
    sortConfig,
    dateShortcuts,
    filteredAlarmList,
    
    // 方法
    getAlarms,
    getMaps,
    getTags,
    getTagNameByMac,
    handleSearch,
    handleResetSearch,
    handleSortChange,
    formatCoordinate,
    formatDateTime,
    initData
  }
}
