<template>
  <div class="user-view-container">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>用户管理</h2>
        <!-- 搜索/过滤栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
            <el-form-item label="用户名">
              <el-input v-model="searchForm.username" placeholder="请输入用户名" clearable />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon> 查询
              </el-button>
              <el-button @click="handleResetSearch">
                <el-icon><Refresh /></el-icon> 重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        <!-- 操作栏 -->
        <div class="action-bar">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> 新增
          </el-button>
          <el-button type="danger" @click="handleBatchDelete" :disabled="!multipleSelection.length">
            <el-icon><Delete /></el-icon> 批量删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 表格 -->
      <div class="user-table-wrapper">
        <el-table 
          :data="userList" 
          style="width: 100%"
          @selection-change="handleSelectionChange"
          v-loading="loading"
          height="100%"
          border
          stripe
          class="user-table"
        >
          <el-table-column type="selection" width="40" fixed="left" />
          <el-table-column prop="username" label="用户名" min-width="150" show-overflow-tooltip />
          <el-table-column prop="role" label="角色" min-width="120">
            <template #default="scope">
              <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'info'">
                {{ scope.row.role === 'admin' ? '管理员' : '普通用户' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" min-width="160" show-overflow-tooltip>
            <template #default="scope">
              {{ formatDateTime(scope.row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="140">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button-group class="operation-row">
                  <el-button type="default" size="small" @click="handleEdit(scope.row)">
                    修改
                  </el-button>
                  <el-button type="default" size="small" @click="handleDelete(scope.row)">
                    删除
                  </el-button>
                </el-button-group>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加用户' : '编辑用户'"
      width="500px"
      @close="resetForm"
    >
      <el-form 
        :model="userForm" 
        :rules="rules"
        ref="userFormRef"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" style="width: 100%" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete, Edit } from '@element-plus/icons-vue'
import axios from 'axios'

const userList = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('add')
const userFormRef = ref(null)

// 搜索表单
const searchForm = reactive({
  username: ''
})

// 移除分页数据
// const pagination = reactive({
//   currentPage: 1,
//   pageSize: 10,
//   total: 0
// })

// 表格多选
const multipleSelection = ref([])

const userForm = reactive({
  id: null,
  username: '',
  password: '',
  role: 'user'
})

// 表单校验规则
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur', validator: (rule, value, callback) => {
      if (dialogType.value === 'add' && (!value || value.trim() === '')) {
        callback(new Error('请输入密码'))
      } else {
        callback()
      }
    }}
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

// 获取用户列表
const fetchUsers = async () => {
  loading.value = true
  try {
    const params = {}
    
    // 只有当搜索关键词存在且不为空时才添加到查询参数中
    if (searchForm.username && searchForm.username.trim()) {
      params.username = searchForm.username.trim()
    }
    
    const response = await axios.get('/api/users', { params })
    // 简化数据处理
    if (response.data && response.data.content) {
      userList.value = response.data.content
    } else {
      userList.value = Array.isArray(response.data) ? response.data : []
    }
  } catch (error) {
    ElMessage.error('获取用户列表失败')
    console.error('获取用户列表错误:', error)
    userList.value = [] // 出错时设置为空数组
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  fetchUsers()
}

// 重置搜索
const handleResetSearch = () => {
  searchForm.username = ''
  fetchUsers()
}

// 移除分页处理函数
// const handleSizeChange = (size) => { ... }
// const handleCurrentChange = (page) => { ... }

// 其他函数保持不变
const handleSelectionChange = (selection) => {
  multipleSelection.value = selection
}

// 批量删除
const handleBatchDelete = () => {
  if (multipleSelection.value.length === 0) {
    ElMessage.warning('请至少选择一条记录')
    return
  }
  
  ElMessageBox.confirm(
    `确定要删除选中的 ${multipleSelection.value.length} 条记录吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const ids = multipleSelection.value.map(item => item.id)
      await axios.delete('/api/users/batch', { data: ids })
      ElMessage.success('批量删除成功')
      fetchUsers() // 重新加载用户列表
    } catch (error) {
      ElMessage.error('批量删除失败')
      console.error('批量删除用户错误:', error)
    }
  }).catch(() => {
    // 取消删除，不做处理
  })
}

const handleAdd = () => {
  dialogType.value = 'add'
  Object.assign(userForm, {
    id: null,
    username: '',
    password: '',
    role: 'user'
  })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogType.value = 'edit'
  Object.assign(userForm, {
    id: row.id,
    username: row.username,
    password: '', // 编辑时密码置空
    role: row.role
  })
  dialogVisible.value = true
}

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
    try {
      await axios.delete(`/api/users/${row.id}`)
      ElMessage.success('删除成功')
      fetchUsers() // 重新加载用户列表
    } catch (error) {
      ElMessage.error('删除失败')
      console.error('删除用户错误:', error)
    }
  }).catch(() => {
    // 取消删除，不做处理
  })
}

const resetForm = () => {
  if (userFormRef.value) {
    userFormRef.value.resetFields()
  }
}

const handleSubmit = async () => {
  if (!userFormRef.value) return
  
  userFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (dialogType.value === 'add') {
          await axios.post('/api/users', userForm)
          ElMessage.success('添加成功')
        } else {
          // 如果密码为空，不更新密码
          const updateData = { ...userForm }
          if (!updateData.password) {
            delete updateData.password
          }
          await axios.put(`/api/users/${userForm.id}`, updateData)
          ElMessage.success('编辑成功')
        }
        dialogVisible.value = false
        fetchUsers() // 重新加载用户列表
      } catch (error) {
        ElMessage.error(dialogType.value === 'add' ? '添加失败' : '编辑失败')
        console.error('保存用户错误:', error)
      }
    }
  })
}

// 格式化日期时间
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

// 页面加载时获取用户列表
onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-view-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.control-panel {
  padding: 0 20px;
  margin: 15px 0;
  display: flex;
  flex-shrink: 0;
}

.control-wrapper {
  border-radius: 4px;
  padding: 16px;
  background-color: #fff;
  flex: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.main-content {
  flex: 1;
  display: flex;
  padding: 0 20px;
  overflow: hidden;
  margin-bottom: 20px;
}

.user-table-wrapper {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.user-table {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.search-bar {
  margin-top: 15px;
  flex-shrink: 0;
}

.action-bar {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.operation-buttons {
  display: flex;
  flex-direction: column;
  gap: 1px;
  max-width: 130px;
}

.operation-row {
  display: flex;
  width: 100%;
}

.operation-buttons .el-button {
  flex: 1;
  font-size: 10px;
  padding: 3px 1px;
  height: 22px;
  min-width: 0;
}

/* 响应式布局适配 */
@media screen and (max-width: 768px) {
  .control-panel {
    padding: 0 10px;
    margin: 10px 0;
  }
  
  .main-content {
    padding: 0 10px;
  }
  
  .user-table-wrapper {
    padding: 10px;
  }
  
  .el-form-item {
    margin-bottom: 12px;
  }
}
</style>

<style>
/* 确保Element表格内部滚动正常工作 */
.el-table__body-wrapper {
  overflow-x: auto !important;
}

/* 确保表格底部边框显示正常 */
.el-table::before,
.el-table::after {
  display: none;
}

.el-table {
  border-bottom: 1px solid #ebeef5;
}

/* 美化表格内部滚动条 */
.el-table__body-wrapper::-webkit-scrollbar {
  height: 12px !important;
  display: block !important;
}

.el-table__body-wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 6px;
}

.el-table__body-wrapper::-webkit-scrollbar-thumb {
  background: #909399;
  border-radius: 6px;
  border: 2px solid #f1f1f1;
}

.el-table__body-wrapper::-webkit-scrollbar-thumb:hover {
  background: #606266;
}

.el-select {
  width: 100%;
}
</style>