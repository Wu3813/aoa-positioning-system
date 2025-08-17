import axios from 'axios'
import { ElMessage } from 'element-plus'

export function createUserAPI(data) {
  // 获取用户列表
  const fetchUsers = async () => {
    data.loading.value = true
    try {
      const params = {}
      
      // 只有当搜索关键词存在且不为空时才添加到查询参数中
      if (data.searchForm.username && data.searchForm.username.trim()) {
        params.username = data.searchForm.username.trim()
      }
      
      const response = await axios.get('/api/users', { params })
      // 简化数据处理
      if (response.data && response.data.content) {
        data.userList.value = response.data.content
      } else {
        data.userList.value = Array.isArray(response.data) ? response.data : []
      }
    } catch (error) {
      ElMessage.error('获取用户列表失败')
      console.error('获取用户列表错误:', error)
      data.userList.value = [] // 出错时设置为空数组
    } finally {
      data.loading.value = false
    }
  }

  // 添加用户
  const addUser = async (userData) => {
    try {
      await axios.post('/api/users', userData)
      ElMessage.success('添加成功')
      return true
    } catch (error) {
      ElMessage.error('添加失败')
      console.error('添加用户错误:', error)
      return false
    }
  }

  // 更新用户
  const updateUser = async (id, userData) => {
    try {
      // 如果密码为空，不更新密码
      const updateData = { ...userData }
      if (!updateData.password) {
        delete updateData.password
      }
      await axios.put(`/api/users/${id}`, updateData)
      ElMessage.success('编辑成功')
      return true
    } catch (error) {
      ElMessage.error('编辑失败')
      console.error('更新用户错误:', error)
      return false
    }
  }

  // 删除用户
  const deleteUser = async (id) => {
    try {
      await axios.delete(`/api/users/${id}`)
      ElMessage.success('删除成功')
      return true
    } catch (error) {
      ElMessage.error('删除失败')
      console.error('删除用户错误:', error)
      return false
    }
  }

  // 批量删除用户
  const batchDeleteUsers = async (ids) => {
    try {
      await axios.delete('/api/users/batch', { data: ids })
      ElMessage.success('批量删除成功')
      return true
    } catch (error) {
      ElMessage.error('批量删除失败')
      console.error('批量删除用户错误:', error)
      return false
    }
  }

  return {
    fetchUsers,
    addUser,
    updateUser,
    deleteUser,
    batchDeleteUsers
  }
}
