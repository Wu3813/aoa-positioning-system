<template>
  <div class="user-view-container">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-wrapper">
        <h2>{{ $t('users.title') }}</h2>
        <!-- 搜索/过滤栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
            <el-form-item :label="$t('users.searchUsername')">
              <el-input v-model="searchForm.username" :placeholder="$t('users.searchUsernamePlaceholder')" clearable />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon> {{ $t('users.query') }}
              </el-button>
              <el-button @click="handleResetSearch">
                <el-icon><Refresh /></el-icon> {{ $t('users.reset') }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        <!-- 操作栏 -->
        <div class="action-bar">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> {{ $t('users.add') }}
          </el-button>
          <el-button type="danger" @click="handleBatchDelete" :disabled="!multipleSelection.length">
            <el-icon><Delete /></el-icon> {{ $t('users.batchDelete') }}
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
          @sort-change="handleSortChange"
          v-loading="loading"
          height="100%"
          border
          stripe
          class="user-table"
        >
          <el-table-column type="selection" width="40" fixed="left" />
          <el-table-column prop="username" :label="$t('users.username')" min-width="150" show-overflow-tooltip sortable />
          <el-table-column prop="role" :label="$t('users.role')" min-width="120" sortable>
            <template #default="scope">
              <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'info'">
                {{ scope.row.role === 'admin' ? $t('users.admin') : $t('users.user') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" :label="$t('users.createTime')" min-width="160" show-overflow-tooltip sortable>
            <template #default="scope">
              {{ formatDateTime(scope.row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('users.operation')" fixed="right" width="140">
            <template #default="scope">
              <div class="operation-buttons">
                <el-button-group class="operation-row">
                  <el-button type="default" size="small" @click="handleEdit(scope.row)">
                    {{ $t('users.edit') }}
                  </el-button>
                  <el-button type="default" size="small" @click="handleDelete(scope.row)">
                    {{ $t('users.delete') }}
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
      :title="dialogType === 'add' ? $t('users.addUser') : $t('users.editUser')"
      width="500px"
      @close="resetForm"
    >
      <el-form 
        :model="userForm" 
        :rules="rules"
        ref="userFormRef"
        label-width="100px"
      >
        <el-form-item :label="$t('users.username')" prop="username">
          <el-input v-model="userForm.username" :placeholder="$t('users.usernamePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('users.password')" prop="password">
          <el-input v-model="userForm.password" type="password" :placeholder="$t('users.passwordPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('users.role')" prop="role">
          <el-select v-model="userForm.role" style="width: 100%" :placeholder="$t('users.rolePlaceholder')">
            <el-option :label="$t('users.admin')" value="admin" />
            <el-option :label="$t('users.user')" value="user" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">{{ $t('users.cancel') }}</el-button>
          <el-button type="primary" @click="handleSubmit">{{ $t('users.confirm') }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { Search, Refresh, Plus, Delete } from '@element-plus/icons-vue'
import { useUserView } from './userview-js'

// 使用用户页面逻辑
const {
  // 响应式数据
  userList,
  loading,
  dialogVisible,
  dialogType,
  userFormRef,
  searchForm,
  multipleSelection,
  userForm,
  rules,
  
  // 工具方法
  formatDateTime,
  resetForm,
  
  // UI方法
  handleSearch,
  handleResetSearch,
  handleSelectionChange,
  handleSortChange,
  handleAdd,
  handleEdit,
  handleDelete,
  handleBatchDelete,
  handleSubmit,
  
  // 生命周期
  onMountedHandler
} = useUserView()

// 页面加载时执行
onMounted(() => {
  onMountedHandler()
})
</script>

<style scoped>
@import '../assets/styles/user-view.css';
</style>