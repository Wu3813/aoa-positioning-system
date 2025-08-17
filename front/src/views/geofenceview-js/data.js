import { ref, reactive, computed } from 'vue'

export function createGeofenceData() {
  // 响应式数据
  const loading = ref(false)
  const geofenceList = ref([])
  const mapList = ref([])
  const multipleSelection = ref([])

  // 搜索表单
  const searchForm = reactive({
    name: '',
    mapId: null,
    enabled: null
  })

  // 排序
  const sortConfig = ref({
    prop: '',
    order: ''
  })

  // 对话框相关
  const dialogVisible = ref(false)
  const dialogType = ref('add') // 'add' or 'edit'
  const submitLoading = ref(false)
  const previewLoading = ref(false)
  const isSettingPoints = ref(false)

  // 表单引用
  const geofenceFormRef = ref(null)

  // 围栏表单
  const geofenceForm = reactive({
    id: null,
    name: '',
    mapId: null,
    enabled: true,
    remark: '',
    points: []
  })

  // 表单验证规则
  const formRules = {
    name: [
      { required: true, message: '请输入围栏名称', trigger: 'blur' }
    ],
    mapId: [
      { required: true, message: '请选择所属地图', trigger: 'change' }
    ]
  }

  // 地图预览相关
  const previewContainer = ref(null)
  const previewImage = ref(null)
  const selectedMapImageUrl = ref('')
  const imageInfo = reactive({
    width: 0,
    height: 0,
    display: null
  })

  // 计算属性 - 过滤后的围栏列表
  const filteredGeofenceList = computed(() => {
    let list = [...geofenceList.value]
    
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

  // 工具方法
  const formatDateTime = (dateTime) => {
    if (!dateTime) return '-'
    return new Date(dateTime).toLocaleString('zh-CN')
  }

  // 重置表单
  const resetForm = () => {
    geofenceForm.id = null
    geofenceForm.name = ''
    geofenceForm.mapId = null
    geofenceForm.enabled = true
    geofenceForm.remark = ''
    geofenceForm.points = []
    
    selectedMapImageUrl.value = ''
    imageInfo.width = 0
    imageInfo.height = 0
    imageInfo.display = null
    
    isSettingPoints.value = false
    
    if (geofenceFormRef.value) {
      geofenceFormRef.value.clearValidate()
    }
  }

  return {
    // 响应式数据
    loading,
    geofenceList,
    mapList,
    multipleSelection,
    searchForm,
    sortConfig,
    dialogVisible,
    dialogType,
    submitLoading,
    previewLoading,
    isSettingPoints,
    geofenceFormRef,
    geofenceForm,
    formRules,
    previewContainer,
    previewImage,
    selectedMapImageUrl,
    imageInfo,
    filteredGeofenceList,
    
    // 工具方法
    formatDateTime,
    resetForm
  }
} 
