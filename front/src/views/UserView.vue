<template>
  <div class="user-container">
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>用户管理</h2>
        <div class="control-buttons">
          <el-button type="primary" @click="handleAdd">添加用户</el-button>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="user-table">
        <el-table :data="userList" style="width: 100%">
          <el-table-column prop="username" label="用户名" width="180" />
          <el-table-column prop="role" label="角色" width="180">
            <template #default="scope">
              <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'info'">
                {{ scope.row.role === 'admin' ? '管理员' : '普通用户' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180" />
          <el-table-column label="操作">
            <template #default="scope">
              <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
              <el-button 
                size="small" 
                type="danger" 
                @click="handleDelete(scope.row)"
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加用户' : '编辑用户'"
      width="30%"
    >
      <el-form :model="userForm" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="userForm.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="userForm.password" type="password" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const userList = ref([])
const dialogVisible = ref(false)
const dialogType = ref('add')
const userForm = ref({
  username: '',
  password: '',
  role: 'user'
})

// 获取用户列表
const fetchUsers = async () => {
  try {
    const response = await axios.get('/api/users')
    // 确保response.data是数组
    userList.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    ElMessage.error('获取用户列表失败')
    console.error('获取用户列表错误:', error)
    userList.value = [] // 出错时设置为空数组
  }
}

const handleAdd = () => {
  dialogType.value = 'add'
  userForm.value = {
    username: '',
    password: '',
    role: 'user'
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogType.value = 'edit'
  userForm.value = {
    ...row,
    password: '' // 编辑时密码置空
  }
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

const handleSubmit = async () => {
  try {
    if (dialogType.value === 'add') {
      await axios.post('/api/users', userForm.value)
      ElMessage.success('添加成功')
    } else {
      await axios.put(`/api/users/${userForm.value.id}`, userForm.value)
      ElMessage.success('编辑成功')
    }
    dialogVisible.value = false
    fetchUsers() // 重新加载用户列表
  } catch (error) {
    ElMessage.error(dialogType.value === 'add' ? '添加失败' : '编辑失败')
    console.error('保存用户错误:', error)
  }
}

// 页面加载时获取用户列表
onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.control-panel {
  padding: 0 20px;
  margin: 20px 0;
  display: flex;
}

.control-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 16px;
  background-color: #fff;
  flex: 1;
}

.main-content {
  flex: 1;
  padding: 0 20px;
  overflow: hidden;
}

.user-table {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>