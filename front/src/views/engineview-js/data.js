import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'

export function createEngineData() {
  const { t } = useI18n()

  // 响应式数据
  const engineList = ref([])
  const mapList = ref([])
  const tagList = ref([])
  const stationList = ref([])
  const loading = ref(false)
  const submitLoading = ref(false)
  const cleanupLoading = ref(false)
  const dialogVisible = ref(false)
  const dialogType = ref('add')
  const engineFormRef = ref(null)
  const uploadRef = ref(null)
  const resizeObserver = ref(null)
  const healthCheckInterval = ref(null)

  // 搜索表单
  const searchForm = reactive({
    name: '',
    status: ''
  })

  // 表格多选
  const multipleSelection = ref([])

  // 引擎表单
  const engineForm = reactive({
    id: null,
    name: '',
    managementUrl: '',
    mapId: null,
    status: 1,
    remark: ''
  })

  // 配置表单
  const configForm = reactive({
    log_level: 'info',
    post_url: `http://${window.location.hostname}:8080/api/realtime/paths/batch`,
    target_tags: [],
    config_api_port: 9999,
    udp_iq_port: 777,
    current_model_path: '', // 当前模型路径（只读）
    ai_engine: {
      model_path: '', // 新模型路径（可编辑）
      sequence_timeout_ms: 1000,
      max_threads: 30,
      min_samples_per_locator: 3
    },
    classic_engine: {
      moving_sequence_count: 4,
      moving_trigger_sequence_count: 1,
      num_angle_threads: 3,
      num_position_threads: 3,
      static_window_keep_size: 30,
      static_window_max_size: 60
    },
    kalman_filter: {
      process_noise: 0.01,
      measurement_noise: 0.1
    },
    locator_config: {
      locator_count: 0,
      locators: []
    },
    enable_iq_correction: true
  })

  // 表单校验规则
  const rules = {
    name: [
      { required: true, message: t('engine.nameRequired'), trigger: 'blur' }
    ],
    managementUrl: [
      { required: true, message: t('engine.managementUrlRequired'), trigger: 'blur' },
      { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: t('engine.managementUrlFormat'), trigger: 'blur' }
    ],
    mapId: [
      { required: true, message: t('engine.mapRequired'), trigger: 'change' }
    ]
  }

  // 文件上传相关计算属性
  const uploadAction = computed(() => {
    const engine = engineList.value.find(e => e.id === engineForm.id)
    if (!engine) return ''
    return `/api/engines/proxy/${engine.id}/model/upload`
  })

  const uploadHeaders = computed(() => {
    return {
      // 不要手动设置 Content-Type，让浏览器自动设置正确的 multipart boundary
    }
  })

  const uploadData = computed(() => {
    return {}
  })

  // 排序相关变量
  const sortOrder = ref({
    prop: '',
    order: ''
  })

  // 计算属性：根据排序条件处理引擎列表
  const filteredEngineList = computed(() => {
    let list = [...engineList.value];
    
    // 如果有排序条件，则进行排序
    if (sortOrder.value.prop && sortOrder.value.order) {
      const { prop, order } = sortOrder.value;
      const isAsc = order === 'ascending';
      
      list.sort((a, b) => {
        let valueA = a[prop];
        let valueB = b[prop];
        
        // 特殊处理日期时间字段
        if (prop === 'lastCommunication' || prop === 'createTime') {
          valueA = valueA ? new Date(valueA).getTime() : 0;
          valueB = valueB ? new Date(valueB).getTime() : 0;
        }
        
        // 处理可能为空的值
        if (valueA === null || valueA === undefined) valueA = isAsc ? -Infinity : Infinity;
        if (valueB === null || valueB === undefined) valueB = isAsc ? -Infinity : Infinity;
        
        // 字符串使用本地化比较
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return isAsc ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        }
        
        // 数值比较
        return isAsc ? valueA - valueB : valueB - valueA;
      });
    }
    
    return list;
  })

  // 工具方法
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-'
    try {
      const date = new Date(dateTimeStr)
      if (isNaN(date.getTime())) return dateTimeStr
      
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date)
    } catch (e) {
      return dateTimeStr
    }
  }

  // 适应窗口大小调整表格高度
  const updateTableHeight = () => {
    // 这个方法在UI中会被调用
  }

  const setupResizeObserver = () => {
    if (window.ResizeObserver) {
      resizeObserver.value = new ResizeObserver(() => {
        updateTableHeight()
      })
      resizeObserver.value.observe(document.documentElement)
    } else {
      window.addEventListener('resize', updateTableHeight)
    }
  }

  // 从数据构建配置
  const buildConfigFromData = async () => {
    // 调试：打印原始数据
    console.log('=== 配置构建调试信息 ===')
    console.log('tagList.value:', tagList.value)
    console.log('stationList.value:', stationList.value)
    
    // 构建目标标签 - 过滤空值并转换为大写
    const validTags = tagList.value
      .map(tag => tag.macAddress || tag.mac)
      .filter(mac => mac && mac.trim())
    
    console.log('validTags:', validTags)
    // 格式化MAC地址为标准格式（无分隔符大写）
    const formatMacAddress = (mac) => {
      if (!mac) return ''
      // 移除所有分隔符并转换为大写
      return mac.replace(/[:\-\.]/g, '').toUpperCase()
    }
    configForm.target_tags = validTags.map(mac => formatMacAddress(mac))
    
    // 构建定位器配置 - 过滤空值并转换为小写
    const validStations = stationList.value.filter(station => {
      const mac = station.macAddress || station.mac
      return mac && mac.trim()
    })
    
    console.log('validStations:', validStations)
    
    configForm.locator_config.locator_count = validStations.length
    configForm.locator_config.locators = validStations.map(station => {
      // 安全地解析坐标，空值或无效值设为0
      const parseCoordinate = (value) => {
        if (value === null || value === undefined || value === '') return 0
        const parsed = parseFloat(value)
        return isNaN(parsed) ? 0 : parsed
      }
      
      const result = {
        mac: formatMacAddress(station.macAddress || station.mac).toLowerCase(),
        position: [
          parseCoordinate(station.coordinateX), 
          parseCoordinate(station.coordinateY), 
          parseCoordinate(station.coordinateZ)
        ],
        orientation: [
          parseCoordinate(station.orientation), 
          parseCoordinate(station.pitch), 
          parseCoordinate(station.roll)
        ]
      }
      console.log(`基站 ${result.mac} 数据:`, {
        coordinateX: station.coordinateX,
        coordinateY: station.coordinateY, 
        coordinateZ: station.coordinateZ,
        orientation: station.orientation,
        pitch: station.pitch,
        roll: station.roll,
        result: result
      })
      return result
    })
    
    // 构建POST URL
    if (!configForm.post_url) {
      const hostname = window.location.hostname
      configForm.post_url = `http://${hostname}:8080/api/realtime/paths/batch`
    }
    
    // 调试：打印最终配置
    console.log('=== 最终配置 ===')
    console.log('target_tags:', configForm.target_tags)
    console.log('locator_count:', configForm.locator_config.locator_count)
    console.log('locators:', configForm.locator_config.locators)
    
    // 数据验证
    if (validTags.length === 0) {
      console.warn('⚠️ 警告：没有找到有效的标签数据')
    }
    if (validStations.length === 0) {
      console.warn('⚠️ 警告：没有找到有效的基站数据')
    }
    
    // 返回实际的有效数量和配置数据
    return {
      validTagCount: validTags.length,
      validStationCount: validStations.length,
      config: { ...configForm } // 返回完整的配置数据
    }
  }

  const resetForm = () => {
    if (engineFormRef.value) {
      engineFormRef.value.resetFields()
    }
  }

  return {
    // 响应式数据
    engineList,
    mapList,
    tagList,
    stationList,
    loading,
    submitLoading,
    cleanupLoading,
    dialogVisible,
    dialogType,
    engineFormRef,
    uploadRef,
    resizeObserver,
    healthCheckInterval,
    searchForm,
    multipleSelection,
    engineForm,
    configForm,
    rules,
    uploadAction,
    uploadHeaders,
    uploadData,
    sortOrder,
    filteredEngineList,
    
    // 工具方法
    formatDateTime,
    updateTableHeight,
    setupResizeObserver,
    buildConfigFromData,
    resetForm
  }
}

