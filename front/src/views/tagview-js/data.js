import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'

export function createTagData() {
  const { t } = useI18n()

  // 响应式数据
  const tagList = ref([])
  const mapCache = ref(new Map()) // 地图缓存
  const loading = ref(false)
  const submitLoading = ref(false)
  const dialogVisible = ref(false)
  const dialogType = ref('add')
  const tagFormRef = ref(null)
  const tableMaxHeight = ref('calc(100vh - 320px)')
  const resizeObserver = ref(null)
  const refreshTimer = ref(null)

  // 搜索表单
  const searchForm = reactive({
    name: '',
    status: ''
  })

  // 表格多选
  const multipleSelection = ref([])

  // 标签表单
  const tagForm = reactive({
    id: null,
    name: '',
    macAddress: '',
    model: '',
    firmwareVersion: '',
    remark: ''
  })

  // 表单校验规则
  const rules = {
    name: [
      { required: true, message: t('tags.nameRequired'), trigger: 'blur' }
    ],
    macAddress: [
      { required: true, message: t('tags.macAddressRequired'), trigger: 'blur' },
      { pattern: /^[0-9A-Fa-f]{12}$/, message: t('tags.macAddressFormatError'), trigger: 'blur' }
    ],
    model: [
      { required: true, message: t('tags.modelRequired'), trigger: 'blur' }
    ],
    firmwareVersion: [
      { required: true, message: t('tags.firmwareVersionRequired'), trigger: 'blur' }
    ]
  }

  // 排序相关变量
  const sortOrder = ref({
    prop: 'createTime',
    order: 'ascending'
  })

  // 计算属性：根据排序条件处理标签列表
  const filteredTagList = computed(() => {
    let list = [...tagList.value];
    
    if (sortOrder.value.prop && sortOrder.value.order) {
      const { prop, order } = sortOrder.value;
      const isAsc = order === 'ascending';
      
      list.sort((a, b) => {
        let valueA = a[prop];
        let valueB = b[prop];
        
        // 特殊处理日期时间字段
        if (prop === 'lastSeen' || prop === 'createTime') {
          valueA = valueA ? new Date(valueA).getTime() : 0;
          valueB = valueB ? new Date(valueB).getTime() : 0;
        }
        
        // 特殊处理MAC地址
        if (prop === 'macAddress') {
          valueA = valueA ? valueA.replace(/[:-]/g, '').toLowerCase() : '';
          valueB = valueB ? valueB.replace(/[:-]/g, '').toLowerCase() : '';
        }
        
        // 特殊处理状态字段（1=在线，0=离线）
        if (prop === 'status') {
          // 确保状态值为数字类型进行比较
          valueA = valueA === 1 ? 1 : 0;
          valueB = valueB === 1 ? 1 : 0;
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
  const getBatteryStatus = (batteryLevel) => {
    if (!batteryLevel) return '';
    if (batteryLevel <= 20) return 'exception';
    if (batteryLevel <= 50) return 'warning';
    return 'success';
  }

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

  const formatMacAddress = (macAddress) => {
    if (!macAddress) return '-';
    const macLower = macAddress.toLowerCase();
    if (macLower.length === 12) {
      return macLower.replace(/(.{2})/g, '$1:').slice(0, -1);
    }
    return macLower;
  }

  const formatMacInput = (value) => {
    if (!value) return '';
    return value.replace(/[^0-9A-Fa-f]/g, '').toLowerCase().substring(0, 12);
  }

  const getMapNameById = (mapId) => {
    if (!mapId) return '-';
    return mapCache.value.get(mapId) || t('tags.unknownMap');
  }

  const updateTableHeight = () => {
    const viewportHeight = window.innerHeight;
    tableMaxHeight.value = `${viewportHeight - 320}px`;
  }

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

  const resetForm = () => {
    if (tagFormRef.value) {
      tagFormRef.value.resetFields();
    }
  }

  return {
    // 响应式数据
    tagList,
    mapCache,
    loading,
    submitLoading,
    dialogVisible,
    dialogType,
    tagFormRef,
    tableMaxHeight,
    resizeObserver,
    refreshTimer,
    searchForm,
    multipleSelection,
    tagForm,
    rules,
    sortOrder,
    filteredTagList,
    
    // 工具方法
    getBatteryStatus,
    formatCoordinate,
    formatDateTime,
    formatMacAddress,
    formatMacInput,
    getMapNameById,
    updateTableHeight,
    setupResizeObserver,
    resetForm
  }
}
