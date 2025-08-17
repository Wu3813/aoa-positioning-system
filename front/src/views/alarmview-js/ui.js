/**
 * 报警页面UI配置和工具函数
 */

/**
 * 表格列配置
 */
export const tableColumns = [
  {
    prop: 'time',
    label: '时间',
    minWidth: 180,
    showOverflowTooltip: true,
    sortable: 'custom'
  },
  {
    prop: 'geofenceName',
    label: '围栏名称',
    minWidth: 150,
    showOverflowTooltip: true,
    sortable: 'custom'
  },
  {
    prop: 'mapName',
    label: '地图名称',
    minWidth: 150,
    showOverflowTooltip: true,
    sortable: 'custom'
  },
  {
    prop: 'alarmTag',
    label: '报警标签',
    minWidth: 120,
    showOverflowTooltip: true
  },
  {
    prop: 'coordinates',
    label: '报警坐标',
    width: 150
  }
]

/**
 * 搜索表单配置
 */
export const searchFormConfig = {
  geofenceName: {
    label: '围栏名称',
    placeholder: '请输入围栏名称',
    width: 150,
    type: 'input'
  },
  mapId: {
    label: '所属地图',
    placeholder: '请选择地图',
    width: 150,
    type: 'select'
  },
  timeRange: {
    label: '时间',
    type: 'datetimerange',
    width: 380,
    shortcuts: true
  }
}

/**
 * 表格样式配置
 */
export const tableStyleConfig = {
  height: 'calc(100vh - 320px)',
  border: true,
  stripe: true,
  loading: true
}

/**
 * 分页配置
 */
export const paginationConfig = {
  pageSize: 20,
  pageSizes: [10, 20, 50, 100],
  layout: 'total, sizes, prev, pager, next, jumper'
}
