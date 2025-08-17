import { ref, reactive } from 'vue'

export function createUserData() {
  // 响应式数据
  const userList = ref([])
  const loading = ref(false)
  const dialogVisible = ref(false)
  const dialogType = ref('add')
  const userFormRef = ref(null)

  // 搜索表单
  const searchForm = reactive({
    username: ''
  })

  // 表格多选
  const multipleSelection = ref([])

  // 用户表单
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

  // 工具方法
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

  const resetForm = () => {
    if (userFormRef.value) {
      userFormRef.value.resetFields()
    }
  }

  return {
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
    resetForm
  }
}
