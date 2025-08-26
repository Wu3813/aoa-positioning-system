import { onMounted, onBeforeUnmount } from 'vue'
import { createTagData } from './data'
import { createTagAPI } from './api'
import { createTagUI } from './ui'

export function useTagView() {
  // 创建数据管理
  const data = createTagData()
  
  // 创建API操作
  const api = createTagAPI(data)
  
  // 创建UI交互
  const ui = createTagUI(data, api)

  // 生命周期处理
  const onMountedHandler = async () => {
    await api.fetchMapsToCache()  // 先获取地图数据
    api.fetchTags()               // 再获取标签数据
    
    // 设置表格高度和ResizeObserver
    data.updateTableHeight();
    data.setupResizeObserver();
    
    // 启动自动刷新
    ui.startAutoRefresh();
    
    // 设置MAC地址监听器
    ui.setupMacAddressWatcher();
  }

  const onBeforeUnmountHandler = () => {
    // 清理ResizeObserver
    if (data.resizeObserver.value) {
      data.resizeObserver.value.disconnect();
    } else {
      window.removeEventListener('resize', data.updateTableHeight);
    }
    
    // 停止自动刷新
    ui.stopAutoRefresh();
  }

  return {
    // 响应式数据
    tagList: data.tagList,
    loading: data.loading,
    submitLoading: data.submitLoading,
    dialogVisible: data.dialogVisible,
    dialogType: data.dialogType,
    tagFormRef: data.tagFormRef,
    tableMaxHeight: data.tableMaxHeight,
    searchForm: data.searchForm,
    multipleSelection: data.multipleSelection,
    tagForm: data.tagForm,
    rules: data.rules,
    filteredTagList: data.filteredTagList,
    
    // 工具方法
    getBatteryStatus: data.getBatteryStatus,
    formatCoordinate: data.formatCoordinate,
    formatDateTime: data.formatDateTime,
    formatMacAddress: data.formatMacAddress,
    getMapNameById: data.getMapNameById,
    resetForm: data.resetForm,
    
    // UI方法
    handleSearch: ui.handleSearch,
    handleResetSearch: ui.handleResetSearch,
    handleSelectionChange: ui.handleSelectionChange,
    handleBatchDelete: ui.handleBatchDelete,
    handleAdd: ui.handleAdd,
    handleEdit: ui.handleEdit,
    handleDelete: ui.handleDelete,
    handleSubmit: ui.handleSubmit,
    handleSortChange: ui.handleSortChange,
    
    // 生命周期
    onMountedHandler,
    onBeforeUnmountHandler
  }
}
