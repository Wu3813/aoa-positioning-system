import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'

export function createTagUI(data, api) {
  const { t } = useI18n()

  // 搜索处理
  const handleSearch = () => {
    api.fetchTags();
  }

  // 重置搜索
  const handleResetSearch = () => {
    data.searchForm.name = '';
    data.searchForm.status = '';
    api.fetchTags();
  }

  // 选择变更处理
  const handleSelectionChange = (selection) => {
    data.multipleSelection.value = selection;
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (data.multipleSelection.value.length === 0) {
      ElMessage.warning(t('tags.selectAtLeastOne'));
      return;
    }
    
    ElMessageBox.confirm(
      t('tags.batchDeleteConfirm', { count: data.multipleSelection.value.length }),
      t('common.warning'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    ).then(async () => {
      try {
        const ids = data.multipleSelection.value.map(item => item.id);
        const success = await api.batchDeleteTags(ids);
        if (success) {
          api.fetchTags();
        }
      } catch (error) {
        console.error('批量删除标签错误:', error);
      }
    }).catch(() => {
      // 取消删除，不做处理
    });
  }

  // 添加标签
  const handleAdd = () => {
    data.dialogType.value = 'add';
    Object.assign(data.tagForm, {
      id: null,
      name: '',
      macAddress: '',
      model: '',
      firmwareVersion: '',
      remark: ''
    });
    data.dialogVisible.value = true;
    
    nextTick(() => {
      if (data.tagFormRef.value) {
        data.tagFormRef.value.clearValidate();
      }
    });
  }

  // 编辑标签
  const handleEdit = (row) => {
    data.dialogType.value = 'edit';
    Object.assign(data.tagForm, {
      id: row.id,
      name: row.name || '',
      macAddress: row.macAddress || '',
      model: row.model || '',
      firmwareVersion: row.firmwareVersion || '',
      remark: row.remark || ''
    });
    data.dialogVisible.value = true;
    
    nextTick(() => {
      if (data.tagFormRef.value) {
        data.tagFormRef.value.clearValidate();
      }
    });
  }

  // 删除单个标签
  const handleDelete = (row) => {
    ElMessageBox.confirm(
      t('tags.deleteConfirm', { name: row.name }),
      t('common.warning'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    ).then(async () => {
      try {
        const success = await api.deleteTag(row.id);
        if (success) {
          api.fetchTags();
        }
      } catch (error) {
        console.error('删除标签错误:', error);
      }
    }).catch(() => {
      // 取消删除，不做处理
    });
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!data.tagFormRef.value) return;
    
    await data.tagFormRef.value.validate(async (valid) => {
      if (valid) {
        data.submitLoading.value = true;
        try {
          const submitData = { ...data.tagForm };
          if (submitData.macAddress) {
            submitData.macAddress = submitData.macAddress.toLowerCase();
          }
          
          let success = false;
          if (data.dialogType.value === 'add') {
            success = await api.addTag(submitData);
          } else {
            success = await api.updateTag(submitData.id, submitData);
          }
          
          if (success) {
            data.dialogVisible.value = false;
            api.fetchTags();
          }
        } catch (error) {
          console.error('保存标签错误:', error);
        } finally {
          data.submitLoading.value = false;
        }
      } else {
        return false;
      }
    });
  }

  // 处理排序变化
  const handleSortChange = ({ prop, order }) => {
    data.sortOrder.value = { prop, order };
  }

  // 自动刷新数据
  const startAutoRefresh = () => {
    data.refreshTimer.value = setInterval(() => {
      if (!data.dialogVisible.value && !data.loading.value && data.multipleSelection.value.length === 0) {
        api.fetchTags();
      }
    }, 5000);
  }

  // 停止自动刷新
  const stopAutoRefresh = () => {
    if (data.refreshTimer.value) {
      clearInterval(data.refreshTimer.value);
      data.refreshTimer.value = null;
    }
  }

  // 监听MAC地址输入变化
  const setupMacAddressWatcher = () => {
    watch(() => data.tagForm.macAddress, (newValue) => {
      if (newValue) {
        data.tagForm.macAddress = data.formatMacInput(newValue);
      }
    });
  }

  // 批量导入处理
  const handleBatchImport = () => {
    // 触发隐藏的文件输入点击
    if (data.fileInput.value) {
      data.fileInput.value.click();
    } else {
      console.error('File input ref is not available');
      ElMessage.error('文件输入组件未正确初始化');
    }
  }

  // CSV解析函数
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV文件至少需要包含标题行和一行数据');
    }
    
    // 解析标题行
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // 查找必需的列
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('名称'));
    const macIndex = headers.findIndex(h => h.includes('mac') || h.includes('地址'));
    const modelIndex = headers.findIndex(h => h.includes('model') || h.includes('型号'));
    const firmwareIndex = headers.findIndex(h => h.includes('firmware') || h.includes('固件') || h.includes('version'));
    const remarkIndex = headers.findIndex(h => h.includes('remark') || h.includes('备注') || h.includes('note'));
    
    if (nameIndex === -1 || macIndex === -1 || modelIndex === -1 || firmwareIndex === -1) {
      throw new Error('CSV文件缺少必需的列：name, macAddress, model, firmwareVersion');
    }
    
    const tagsData = [];
    
    // 解析数据行
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length < headers.length) {
        console.warn(`第${i+1}行数据不完整，跳过`);
        continue;
      }
      
      const tag = {
        name: values[nameIndex],
        macAddress: values[macIndex].replace(/[:\-]/g, '').toLowerCase(), // 清理MAC地址格式
        model: values[modelIndex],
        firmwareVersion: values[firmwareIndex],
        remark: remarkIndex !== -1 ? values[remarkIndex] : ''
      };
      
      // 验证必需字段
      if (tag.name && tag.macAddress && tag.model && tag.firmwareVersion) {
        tagsData.push(tag);
      }
    }
    
    return tagsData;
  }

  // 处理文件选择
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    const isJSON = file.type === 'application/json' || file.name.endsWith('.json');
    const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
    
    if (!isJSON && !isCSV) {
      ElMessage.error(t('tags.uploadJSONOrCSVFile'));
      event.target.value = null; // 清空选择
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let tagsData = [];
        
        if (isJSON) {
          // 解析JSON内容
          const content = JSON.parse(e.target.result);
          
          // 确保JSON格式正确 - 支持数组格式或对象包含数组的格式
          if (Array.isArray(content)) {
            tagsData = content;
          } else if (content.tags && Array.isArray(content.tags)) {
            tagsData = content.tags;
          } else if (content.data && Array.isArray(content.data)) {
            tagsData = content.data;
          } else {
            ElMessage.error(t('tags.invalidJSONFormat'));
            return;
          }
        } else if (isCSV) {
          // 解析CSV内容
          tagsData = parseCSV(e.target.result);
        }
        
        // 过滤出有效的标签数据
        const validTags = tagsData.filter(tag => 
          tag.name && tag.macAddress && tag.model && tag.firmwareVersion
        );
        
        if (validTags.length === 0) {
          ElMessage.error(t('tags.noValidTagData'));
          return;
        }
        
        // 确认导入
        try {
          await ElMessageBox.confirm(
            t('tags.importConfirm', { count: validTags.length }),
            t('common.warning'),
            {
              confirmButtonText: t('common.confirm'),
              cancelButtonText: t('common.cancel'),
              type: 'warning',
            }
          );
          
          // 执行批量导入
          const success = await api.batchImportTags(validTags);
          if (success) {
            // 刷新标签列表
            api.fetchTags();
          }
        } catch (confirmError) {
          // 用户取消导入
          console.log('用户取消导入');
        }
        
      } catch (parseError) {
        console.error('解析文件错误:', parseError);
        if (isJSON) {
          ElMessage.error(t('tags.invalidJSONFormat'));
        } else {
          ElMessage.error(t('tags.invalidCSVFormat') + ': ' + parseError.message);
        }
      }
    };
    
    reader.readAsText(file);
    // 清空文件选择
    event.target.value = null;
  }

  // 下载CSV模板
  const handleDownloadTemplate = () => {
    // 创建CSV模板内容（中文列名）
    const csvContent = [
      '名称,MAC地址,型号,固件版本,备注',
      '标签示例1,84fd27eee603,Model-A,1.0.0,这是一个示例标签',
      '标签示例2,84fd27eee604,Model-B,1.0.1,另一个示例标签',
      '标签示例3,84fd27eee605,Model-C,1.0.2,第三个示例标签'
    ].join('\n');

    // 创建Blob对象
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 创建下载链接
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '标签导入模板.csv');
    link.style.visibility = 'hidden';
    
    // 添加到DOM并触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放URL对象
    URL.revokeObjectURL(url);
    
    ElMessage.success(t('tags.templateDownloaded'));
  }

  return {
    handleSearch,
    handleResetSearch,
    handleSelectionChange,
    handleBatchDelete,
    handleBatchImport,
    handleDownloadTemplate,
    handleFileChange,
    handleAdd,
    handleEdit,
    handleDelete,
    handleSubmit,
    handleSortChange,
    startAutoRefresh,
    stopAutoRefresh,
    setupMacAddressWatcher
  }
}
