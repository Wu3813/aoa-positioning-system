import { ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'

export function createUserUI(data, api) {
  const { t } = useI18n()
  
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

  // 排序处理
  const handleSortChange = ({ prop, order }) => {
    data.sortOrder.value = {
      prop: prop || '',
      order: order || ''
    }
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
      t('users.deleteConfirm', { username: row.username }),
      t('users.warning'),
      {
        confirmButtonText: t('users.confirm'),
        cancelButtonText: t('users.cancel'),
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
      ElMessageBox.alert(t('users.selectAtLeastOne'), t('users.tip'))
      return
    }
    
    ElMessageBox.confirm(
      t('users.batchDeleteConfirm', { count: data.multipleSelection.value.length }),
      t('users.warning'),
      {
        confirmButtonText: t('users.confirm'),
        cancelButtonText: t('users.cancel'),
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
    handleSortChange,
    handleAdd,
    handleEdit,
    handleDelete,
    handleBatchDelete,
    handleSubmit
  }
}
