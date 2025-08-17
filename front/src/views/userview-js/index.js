import { onMounted } from 'vue'
import { createUserData } from './data'
import { createUserAPI } from './api'
import { createUserUI } from './ui'

export function useUserView() {
  // 创建数据管理
  const data = createUserData()
  
  // 创建API操作
  const api = createUserAPI(data)
  
  // 创建UI交互
  const ui = createUserUI(data, api)

  // 生命周期处理
  const onMountedHandler = async () => {
    api.fetchUsers()
  }

  return {
    // 响应式数据
    userList: data.userList,
    loading: data.loading,
    dialogVisible: data.dialogVisible,
    dialogType: data.dialogType,
    userFormRef: data.userFormRef,
    searchForm: data.searchForm,
    multipleSelection: data.multipleSelection,
    userForm: data.userForm,
    rules: data.rules,
    
    // 工具方法
    formatDateTime: data.formatDateTime,
    resetForm: data.resetForm,
    
    // UI方法
    handleSearch: ui.handleSearch,
    handleResetSearch: ui.handleResetSearch,
    handleSelectionChange: ui.handleSelectionChange,
    handleAdd: ui.handleAdd,
    handleEdit: ui.handleEdit,
    handleDelete: ui.handleDelete,
    handleBatchDelete: ui.handleBatchDelete,
    handleSubmit: ui.handleSubmit,
    
    // 生命周期
    onMountedHandler
  }
}
