import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'

export function createStationData() {
  const { t } = useI18n()
  // 响应式数据
  const stationList = ref([])
  const mapList = ref([])
  const loading = ref(false)
  const submitLoading = ref(false)
  const checkAllLoading = ref(false)
  const batchRefreshLoading = ref(false)
  const refreshingStations = ref([]) // 正在刷新的基站ID列表
  const dialogVisible = ref(false)
  const dialogType = ref('add')
  const stationFormRef = ref(null)
  const tableMaxHeight = ref('calc(100vh - 320px)')
  const resizeObserver = ref(null)
  const autoRefreshTimer = ref(null) // 添加自动刷新定时器引用
  const testingConnection = ref(false) // 测试连接状态
  const udpConnected = ref(false) // UDP连接成功状态
  const enablingBroadcast = ref(false) // 开启标签广播状态
  const enablingScanning = ref(false) // 开启扫描状态
  const configDialogVisible = ref(false)
  const currentConfigStation = ref(null)
  const rssiValue = ref(-80)
  const selectedScanConfig = ref('')
  const applyScanConfigLoading = ref(false)
  const configRSSILoading = ref(false)
  const configTargetLoading = ref(false)
  const targetIp = ref('')
  const targetPort = ref(null)
  const fileInput = ref(null) // 添加文件输入引用

  // 搜索表单
  const searchForm = reactive({
    code: '',
    name: '',
    status: ''
  })

  // 表格多选
  const multipleSelection = ref([])

  // 基站表单
  const stationForm = reactive({
    id: null,
    code: '',
    name: '',
    macAddress: '',
    ipAddress: '',
    model: '',
    firmwareVersion: '',
    mapId: null,
    positionX: '',
    positionY: '',
    positionZ: '',
    orientation: 0,
    coordinateX: null,
    coordinateY: null,
    coordinateZ: null,
    status: 2,
    scanEnabled: null,
    remark: ''
  })

  // 表单校验规则 - 只校验可编辑字段
  const rules = {
    code: [
      { required: true, message: t('station.formValidation.codeRequired'), trigger: 'blur' },
      { pattern: /^[A-Za-z0-9_-]+$/, message: t('station.formValidation.codePattern'), trigger: 'blur' }
    ],
    name: [
      { required: true, message: t('station.formValidation.nameRequired'), trigger: 'blur' }
    ],
    ipAddress: [
      { required: true, message: t('station.formValidation.ipRequired'), trigger: 'blur' },
      { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: t('station.formValidation.ipPattern'), trigger: 'blur' }
    ],
    mapId: [
      { required: true, message: t('station.formValidation.mapRequired'), trigger: 'change' }
    ]
  }

  // 添加排序相关的变量
  const sortOrder = ref({
    prop: '',
    order: ''
  })

  // 计算属性：根据排序条件处理基站列表
  const filteredStationList = computed(() => {
    let list = [...stationList.value];
    
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
        
        // 特殊处理IP地址
        if (prop === 'ipAddress') {
          return compareIPAddresses(valueA, valueB, isAsc);
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
  });

  // RSSI值验证计算属性
  const isRssiValid = computed(() => {
    return rssiValue.value !== null && 
           rssiValue.value !== undefined && 
           rssiValue.value >= -100 && 
           rssiValue.value <= -40 &&
           Number.isInteger(rssiValue.value)
  })

  // RSSI错误信息计算属性
  const rssiErrorMessage = computed(() => {
    if (rssiValue.value === null || rssiValue.value === undefined) {
      return ''
    }
    if (rssiValue.value < -100) {
      return t('station.formValidation.rssiTooSmall')
    }
    if (rssiValue.value > -40) {
      return t('station.formValidation.rssiTooLarge')
    }
    if (!Number.isInteger(rssiValue.value)) {
      return t('station.formValidation.rssiNotInteger')
    }
    return ''
  })

  // 目标IP端口验证计算属性
  const isTargetValid = computed(() => {
    return isValidIpAddress(targetIp.value) && 
           targetPort.value !== null && 
           targetPort.value !== undefined && 
           targetPort.value >= 1 && 
           targetPort.value <= 65535 &&
           targetPort.value !== 8833 &&
           Number.isInteger(targetPort.value)
  })

  // 目标IP端口错误信息计算属性
  const targetErrorMessage = computed(() => {
    if (!targetIp.value && !targetPort.value) {
      return ''
    }
    
    if (targetIp.value && !isValidIpAddress(targetIp.value)) {
      return t('station.formValidation.targetIpInvalid')
    }
    
    if (targetPort.value !== null && targetPort.value !== undefined) {
      if (targetPort.value < 1) {
        return t('station.formValidation.portTooSmall')
      }
      if (targetPort.value > 65535) {
        return t('station.formValidation.portTooLarge')
      }
      if (targetPort.value === 8833) {
        return t('station.formValidation.portReserved')
      }
      if (!Number.isInteger(targetPort.value)) {
        return t('station.formValidation.portNotInteger')
      }
    }
    
    return ''
  })

  // 工具方法
  const formatCoordinate = (value) => {
    if (value === null || value === undefined) return '-';
    return parseFloat(value).toFixed(3);
  }

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return dateTimeStr;
      
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
    } catch (e) {
      return dateTimeStr;
    }
  }

  // IP地址排序辅助函数
  const compareIPAddresses = (ipA, ipB, isAsc) => {
    // 处理空值
    if (!ipA && !ipB) return 0;
    if (!ipA) return isAsc ? -1 : 1;
    if (!ipB) return isAsc ? 1 : -1;

    // 将IP地址转换为数值进行比较
    const ipToNumber = (ip) => {
      if (!ip) return 0;
      const parts = ip.split('.');
      if (parts.length !== 4) return 0;
      
      return parts.reduce((acc, part, i) => {
        return acc + (parseInt(part, 10) * Math.pow(256, 3 - i));
      }, 0);
    };

    const numA = ipToNumber(ipA);
    const numB = ipToNumber(ipB);
    
    return isAsc ? numA - numB : numB - numA;
  };

  // 验证IP地址格式的辅助函数
  const isValidIpAddress = (ip) => {
    if (!ip || ip.trim() === '') {
      return false
    }
    
    const parts = ip.split('.')
    if (parts.length !== 4) {
      return false
    }
    
    return parts.every(part => {
      const num = parseInt(part, 10)
      return !isNaN(num) && num >= 0 && num <= 255
    })
  }

  // 适应窗口大小调整表格高度
  const updateTableHeight = () => {
    const viewportHeight = window.innerHeight;
    tableMaxHeight.value = `${viewportHeight - 320}px`;
  }

  // 设置ResizeObserver
  const setupResizeObserver = () => {
    if (window.ResizeObserver) {
      resizeObserver.value = new ResizeObserver(() => {
        updateTableHeight();
      });
      resizeObserver.value.observe(document.documentElement);
    } else {
      window.addEventListener('resize', updateTableHeight);
    }
  }

  // 重置表单
  const resetForm = () => {
    if (stationFormRef.value) {
      stationFormRef.value.resetFields();
    }
  }

  return {
    // 响应式数据
    stationList,
    mapList,
    loading,
    submitLoading,
    checkAllLoading,
    batchRefreshLoading,
    refreshingStations,
    dialogVisible,
    dialogType,
    stationFormRef,
    tableMaxHeight,
    resizeObserver,
    autoRefreshTimer,
    testingConnection,
    udpConnected,
    enablingBroadcast,
    enablingScanning,
    configDialogVisible,
    currentConfigStation,
    rssiValue,
    selectedScanConfig,
    applyScanConfigLoading,
    configRSSILoading,
    configTargetLoading,
    targetIp,
    targetPort,
    fileInput,
    searchForm,
    multipleSelection,
    stationForm,
    rules,
    sortOrder,
    filteredStationList,
    isRssiValid,
    rssiErrorMessage,
    isTargetValid,
    targetErrorMessage,
    
    // 工具方法
    formatCoordinate,
    formatDateTime,
    compareIPAddresses,
    isValidIpAddress,
    updateTableHeight,
    setupResizeObserver,
    resetForm
  }
}
