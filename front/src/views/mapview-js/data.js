import { ref, reactive, computed } from 'vue'

// 响应式数据
export const createMapData = () => {
  const mapList = ref([])
  const loading = ref(false)
  const dialogVisible = ref(false)
  const dialogType = ref('add')
  const mapFormRef = ref(null)
  const uploadRef = ref(null)

  // 搜索表单
  const searchForm = reactive({
    mapName: ''
  })

  // 表格多选
  const multipleSelection = ref([])

  // 添加/编辑表单
  const mapForm = reactive({
    mapId: '',
    name: '',
    file: null,
    width: 0,
    height: 0,
    originX: null,
    originY: null,
    scale: null,
    point1X: null,
    point1Y: null,
    point2X: null,
    point2Y: null,
    realDistance: 0
  })

  // 排序相关
  const sortOrder = ref({
    prop: '',
    order: ''
  })

  // 比例尺计算相关
  const scaleForm = reactive({
    points: [],
    pixelDistance: 0,
    realDistance: 1,
    pointInputs: [
      { x: 0, y: 0 },
      { x: 0, y: 0 }
    ]
  })

  // 图片信息
  const imageInfo = reactive({
    width: 0,
    height: 0,
    scale: { x: 1, y: 1 },
    originalImage: null,
    display: null
  })

  // 预览相关
  const previewContainer = ref(null)
  const previewImage = ref(null)
  const previewLoading = ref(false)
  const previewImageUrl = ref(null)

  // 表单校验规则
  const rules = {
    mapId: [
      { required: true, message: '请输入地图ID', trigger: 'blur' },
      { pattern: /^[A-Za-z0-9_-]+$/, message: '地图ID只能包含字母、数字、下划线和横线', trigger: 'blur' }
    ],
    name: [{ required: true, message: '请输入地图名称', trigger: 'blur' }],
  }

  // 状态管理
  const isMeasuring = ref(false)
  const isSettingOrigin = ref(false)
  const currentMapId = ref(null)
  const hasCompletedScale = ref(false)

  // 计算属性：根据排序条件处理地图列表
  const filteredMapList = computed(() => {
    let list = [...mapList.value];
    
    // 如果有排序条件，则进行排序
    if (sortOrder.value.prop && sortOrder.value.order) {
      const { prop, order } = sortOrder.value;
      const isAsc = order === 'ascending';
      
      list.sort((a, b) => {
        let valueA = a[prop];
        let valueB = b[prop];
        
        // 特殊处理日期时间字段
        if (prop === 'createTime') {
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
  });

  return {
    // 响应式数据
    mapList,
    loading,
    dialogVisible,
    dialogType,
    mapFormRef,
    uploadRef,
    searchForm,
    multipleSelection,
    mapForm,
    sortOrder,
    scaleForm,
    imageInfo,
    previewContainer,
    previewImage,
    previewLoading,
    previewImageUrl,
    rules,
    isMeasuring,
    isSettingOrigin,
    currentMapId,
    hasCompletedScale,
    filteredMapList
  }
}
