import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'

export function createUserData() {
  const { t } = useI18n()
  
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
      { required: true, message: t('users.usernameRequired'), trigger: 'blur' },
      { min: 3, max: 20, message: t('users.usernameLength'), trigger: 'blur' }
    ],
    password: [
      { required: true, message: t('users.passwordRequired'), trigger: 'blur', validator: (rule, value, callback) => {
        if (dialogType.value === 'add' && (!value || value.trim() === '')) {
          callback(new Error(t('users.passwordRequired')))
        } else {
          callback()
        }
      }}
    ],
    role: [
      { required: true, message: t('users.roleRequired'), trigger: 'change' }
    ]
  }

  // 工具方法
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return dateTimeStr;
      
      // 根据当前语言设置日期格式
      const locale = localStorage.getItem('locale') || 'zh-CN';
      const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      
      return new Intl.DateTimeFormat(locale, options).format(date);
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
