import { ElMessageBox } from 'element-plus'

export function createUserUI(data, api) {
  // 搜索处理
  const handleSearch = () => {
    api.fetchUsers()
  }

  // 重置搜索
  const handleResetSearch = () => {
    data.searchForm.username = ''
    api.fetchUsers()
  }

  // 表格多选处理
  const handleSelectionChange = (selection) => {
    data.multipleSelection.value = selection
  }

  // 添加用户
  const handleAdd = () => {
    data.dialogType.value = 'add'
    Object.assign(data.userForm, {
      id: null,
      username: '',
      password: '',
      role: 'user'
    })
    data.dialogVisible.value = true
  }

  // 编辑用户
  const handleEdit = (row) => {
    data.dialogType.value = 'edit'
    Object.assign(data.userForm, {
      id: row.id,
      username: row.username,
      password: '', // 编辑时密码置空
      role: row.role
    })
    data.dialogVisible.value = true
  }

  // 删除用户
  const handleDelete = (row) => {
    ElMessageBox.confirm(
      `确定要删除用户 ${row.username} 吗？`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).then(async () => {
      const success = await api.deleteUser(row.id)
      if (success) {
        api.fetchUsers() // 重新加载用户列表
      }
    }).catch(() => {
      // 取消删除，不做处理
    })
  }

  // 批量删除用户
  const handleBatchDelete = () => {
    if (data.multipleSelection.value.length === 0) {
      ElMessageBox.alert('请至少选择一条记录', '提示')
      return
    }
    
    ElMessageBox.confirm(
      `确定要删除选中的 ${data.multipleSelection.value.length} 条记录吗？`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).then(async () => {
      const ids = data.multipleSelection.value.map(item => item.id)
      const success = await api.batchDeleteUsers(ids)
      if (success) {
        api.fetchUsers() // 重新加载用户列表
      }
    }).catch(() => {
      // 取消删除，不做处理
    })
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!data.userFormRef.value) return
    
    data.userFormRef.value.validate(async (valid) => {
      if (valid) {
        let success = false
        
        if (data.dialogType.value === 'add') {
          success = await api.addUser(data.userForm)
        } else {
          success = await api.updateUser(data.userForm.id, data.userForm)
        }
        
        if (success) {
          data.dialogVisible.value = false
          api.fetchUsers() // 重新加载用户列表
        }
      }
    })
  }

  return {
    handleSearch,
    handleResetSearch,
    handleSelectionChange,
    handleAdd,
    handleEdit,
    handleDelete,
    handleBatchDelete,
    handleSubmit
  }
}
