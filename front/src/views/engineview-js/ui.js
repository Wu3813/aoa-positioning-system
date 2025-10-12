import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'

export function createEngineUI(data, api) {
  const { t } = useI18n()

  // 搜索处理
  const handleSearch = () => {
    api.fetchEngines()
  }

  // 重置搜索
  const handleResetSearch = () => {
    data.searchForm.name = ''
    data.searchForm.status = ''
    api.fetchEngines()
  }

  // 选择变更处理
  const handleSelectionChange = (selection) => {
    data.multipleSelection.value = selection
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (data.multipleSelection.value.length === 0) {
      ElMessage.warning(t('engine.messages.selectAtLeastOne'))
      return
    }
    
    ElMessageBox.confirm(
      t('engine.messages.confirmBatchDelete', { count: data.multipleSelection.value.length }),
      t('common.warning'),
      {
        confirmButtonText: t('engine.confirm'),
        cancelButtonText: t('engine.cancel'),
        type: 'warning',
      }
    ).then(async () => {
      try {
        const ids = data.multipleSelection.value.map(item => item.id)
        const success = await api.batchDeleteEngines(ids)
        if (success) {
          api.fetchEngines()
        }
      } catch (error) {
        console.error('Batch delete engine error:', error)
      }
    }).catch(() => {
      // Cancel delete, do nothing
    })
  }

  // 添加引擎
  const handleAdd = () => {
    data.dialogType.value = 'add'
    Object.assign(data.engineForm, {
      id: null,
      name: '',
      managementUrl: '',
      mapId: null,
      status: 0,
      remark: ''
    })
    
    // Reset config form to default values
    Object.assign(data.configForm, {
      log_level: 'info',
      post_url: `http://${window.location.hostname}:8080/api/realtime/paths/batch`,
      target_tags: [],
      config_api_port: 9999,
      udp_iq_port: 777,
      current_model_path: '', // Empty when creating new
      ai_engine: {
        model_path: '', // Empty when creating new
        sequence_timeout_ms: 1000,
        max_threads: 30,
        min_samples_per_locator: 3
      },
      classic_engine: {
        moving_sequence_count: 4,
        moving_trigger_sequence_count: 1,
        num_angle_threads: 3,
        num_position_threads: 3,
        static_window_keep_size: 30,
        static_window_max_size: 60
      },
      kalman_filter: {
        process_noise: 0.01,
        measurement_noise: 0.1
      },
      locator_config: {
        locator_count: 0,
        locators: []
      },
      enable_iq_correction: true
    })
    
    data.dialogVisible.value = true
    
    nextTick(() => {
      if (data.engineFormRef.value) {
        data.engineFormRef.value.clearValidate()
      }
    })
  }

  // 编辑引擎
  const handleEdit = async (row) => {
    data.dialogType.value = 'edit'
    const rowData = JSON.parse(JSON.stringify(row))
    Object.assign(data.engineForm, rowData)
    data.dialogVisible.value = true
    
    // 加载引擎配置
    await api.loadEngineConfig(row)
    
    nextTick(() => {
      if (data.engineFormRef.value) {
        data.engineFormRef.value.clearValidate()
      }
    })
  }

  // 健康检查（手动触发）
  const handleHealthCheck = async (row) => {
    const isHealthy = await api.performHealthCheck(row)
    
    if (isHealthy) {
      ElMessage.success(t('engine.messages.healthCheckSuccess'))
    } else {
      ElMessage.warning(t('engine.messages.healthCheckFailed'))
    }
  }

  // 删除单个引擎
  const handleDelete = (row) => {
    ElMessageBox.confirm(
      t('engine.messages.confirmDelete', { name: row.name }),
      t('common.warning'),
      {
        confirmButtonText: t('engine.confirm'),
        cancelButtonText: t('engine.cancel'),
        type: 'warning',
      }
    ).then(async () => {
      try {
        const success = await api.deleteEngine(row.id)
        if (success) {
          api.fetchEngines()
        }
      } catch (error) {
        console.error('删除引擎错误:', error)
      }
    }).catch(() => {
      // Cancel delete, do nothing
    })
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!data.engineFormRef.value) return
    
    await data.engineFormRef.value.validate(async (valid) => {
      if (valid) {
        data.submitLoading.value = true
        try {
          // 1. 先保存引擎基本信息
          if (data.dialogType.value === 'add') {
            const success = await api.addEngine(data.engineForm)
            if (success) {
              data.dialogVisible.value = false
              api.fetchEngines()
            }
          } else {
            const success = await api.updateEngine(data.engineForm.id, data.engineForm)
            
            if (success) {
              // 2. 如果是编辑模式，还需要更新引擎的配置
              try {
                const configData = await data.buildConfigFromData()
                // 如果用户输入了新的模型路径，则使用新路径；否则保持当前路径
                if (configData.config.ai_engine.model_path && configData.config.ai_engine.model_path.trim()) {
                  // 用户输入了新模型路径，使用新路径
                  console.log('使用新模型路径:', configData.config.ai_engine.model_path)
                } else {
                  // 用户没有输入新模型路径，保持当前路径
                  configData.config.ai_engine.model_path = data.configForm.current_model_path
                  console.log('保持当前模型路径:', data.configForm.current_model_path)
                }
                const updateSuccess = await api.updateEngineConfig(data.engineForm.id, configData.config)
                
                if (updateSuccess) {
                  ElMessage.success(t('engine.messages.configUpdateSuccess'))
                } else {
                  ElMessage.warning(t('engine.messages.configUpdateFailed'))
                }
              } catch (configError) {
                console.error('配置更新错误:', configError)
                // 简化错误信息显示
                let errorMsg = '配置更新失败'
                if (configError.response?.data?.error) {
                  const errorText = configError.response.data.error
                  // 如果是400错误，提取关键信息
                  if (errorText.includes('400 Bad Request')) {
                    errorMsg = '配置参数错误，请检查标签和基站数据'
                  } else if (errorText.includes('配置更新失败')) {
                    errorMsg = '配置更新失败，请检查配置参数'
                  } else {
                    // 提取错误信息的前100个字符
                    errorMsg = errorText.length > 100 ? errorText.substring(0, 100) + '...' : errorText
                  }
                } else if (configError.message) {
                  errorMsg = configError.message.length > 50 ? configError.message.substring(0, 50) + '...' : configError.message
                }
                ElMessage.warning(t('engine.messages.configUpdateFailed') + ': ' + errorMsg)
              }
              
              data.dialogVisible.value = false
            }
          }
        } catch (error) {
          console.error('保存引擎错误:', error)
          ElMessage.error(
            (data.dialogType.value === 'add' ? t('engine.messages.addFailed') + ': ' : t('engine.messages.updateFailed') + ': ') + 
            (error.response?.data?.message || error.message || t('engine.messages.unknownError'))
          )
        } finally {
          data.submitLoading.value = false
        }
      } else {
        return false
      }
    })
  }

  // 处理排序变化
  const handleSortChange = ({ prop, order }) => {
    data.sortOrder.value = { prop, order }
  }

  // 文件上传前验证
  const beforeUpload = (file) => {
    // 检查文件类型
    const isRknn = file.name.toLowerCase().endsWith('.rknn')
    if (!isRknn) {
      ElMessage.error(t('engine.messages.uploadRknnFile'))
      return false
    }
    
    // 检查文件大小 (限制为100MB)
    const isLt100M = file.size / 1024 / 1024 < 100
    if (!isLt100M) {
      ElMessage.error(t('engine.messages.modelFileTooLarge'))
      return false
    }
    
    // 检查是否有选中的引擎
    const engine = data.engineList.value.find(e => e.id === data.engineForm.id)
    if (!engine) {
      ElMessage.error(t('engine.messages.selectAtLeastOneEngine'))
      return false
    }
    
    ElMessage.info(`开始上传模型文件: ${file.name}`)
    return true
  }

  // 文件上传成功回调
  const onUploadSuccess = (response, file) => {
    console.log('上传成功响应:', response)
    
    if (response && response.success) {
      ElMessage.success(t('engine.messages.uploadModelSuccess') + `: ${response.filename}`)
      
      // 更新当前模型路径（只读）
      if (response.file_path) {
        data.configForm.current_model_path = response.file_path
        // 清空新模型路径输入框
        data.configForm.ai_engine.model_path = ''
      }
      
      // 如果返回了当前配置，更新配置表单
      if (response.current_config) {
        // 保存当前的 post_url 默认值
        const defaultPostUrl = `http://${window.location.hostname}:8080/api/realtime/paths/batch`
        
        // 正确处理嵌套的配置数据结构
        let engineConfig = {}
        if (response.current_config.config) {
          // 如果返回的是嵌套结构 { config: { ... } }
          engineConfig = { ...response.current_config.config }
        } else {
          // 如果返回的是扁平结构
          engineConfig = { ...response.current_config }
        }
        
        // 合并引擎配置，保留引擎的目录和参数设置
        Object.assign(data.configForm, {
          // 保留引擎的配置
          log_level: engineConfig.log_level || data.configForm.log_level,
          config_api_port: engineConfig.config_api_port || data.configForm.config_api_port,
          udp_iq_port: engineConfig.udp_iq_port || data.configForm.udp_iq_port,
          enable_iq_correction: engineConfig.enable_iq_correction !== undefined ? engineConfig.enable_iq_correction : data.configForm.enable_iq_correction,
          
          // 强制使用本机的 POST URL
          post_url: defaultPostUrl
        })
        
        // 单独处理 ai_engine 配置，确保保留引擎的 model_path
        if (engineConfig.ai_engine) {
          // 更新当前模型路径（只读）
          data.configForm.current_model_path = engineConfig.ai_engine.model_path || data.configForm.current_model_path
          Object.assign(data.configForm.ai_engine, {
            model_path: data.configForm.ai_engine.model_path, // 保持用户输入的新模型路径
            sequence_timeout_ms: engineConfig.ai_engine.sequence_timeout_ms || data.configForm.ai_engine.sequence_timeout_ms,
            max_threads: engineConfig.ai_engine.max_threads || data.configForm.ai_engine.max_threads,
            min_samples_per_locator: engineConfig.ai_engine.min_samples_per_locator || data.configForm.ai_engine.min_samples_per_locator
          })
        }
        
        // 单独处理 kalman_filter 配置
        if (engineConfig.kalman_filter) {
          Object.assign(data.configForm.kalman_filter, {
            process_noise: engineConfig.kalman_filter.process_noise || data.configForm.kalman_filter.process_noise,
            measurement_noise: engineConfig.kalman_filter.measurement_noise || data.configForm.kalman_filter.measurement_noise
          })
        }
      }
      
    } else {
      ElMessage.error(t('engine.messages.uploadModelFailed') + ': ' + (response?.message || t('engine.messages.unknownError')))
    }
  }

  // 文件上传失败回调
  const onUploadError = (error, file) => {
    console.error('上传失败:', error)
    ElMessage.error(t('engine.messages.uploadModelFailed') + `: ${error.message || t('engine.messages.networkError')}`)
  }

  // 清理模型
  const handleCleanupModels = async () => {
    const engine = data.engineList.value.find(e => e.id === data.engineForm.id)
    if (!engine) {
      ElMessage.error(t('engine.messages.selectAtLeastOneEngine'))
      return
    }
    
    // 确认对话框
    try {
      await ElMessageBox.confirm(
        t('engine.messages.confirmCleanupModels', { name: engine.name }),
        t('common.warning'),
        {
          confirmButtonText: t('engine.cleanupModels'),
          cancelButtonText: t('engine.cancel'),
          type: 'warning',
        }
      )
    } catch {
      return // 用户取消
    }
    
    data.cleanupLoading.value = true
    try {
      const response = await api.cleanupModels(engine.id)
      
      if (response && response.success) {
        const { deleted_count, deleted_files, total_size_freed, current_model } = response
        
        // 构建成功消息
        let message = `模型清理完成，删除了 ${deleted_count} 个文件`
        if (total_size_freed) {
          const sizeMB = (total_size_freed / 1024 / 1024).toFixed(2)
          message += `，释放空间 ${sizeMB}MB`
        }
        
        ElMessage.success(t('engine.messages.cleanupModelsSuccess'))
        
        // 如果返回了当前配置，更新配置表单
        if (response.current_config) {
          // 保存当前的 post_url 默认值
          const defaultPostUrl = `http://${window.location.hostname}:8080/api/realtime/paths/batch`
          
          // 正确处理嵌套的配置数据结构
          let engineConfig = {}
          if (response.current_config.config) {
            // 如果返回的是嵌套结构 { config: { ... } }
            engineConfig = { ...response.current_config.config }
          } else {
            // 如果返回的是扁平结构
            engineConfig = { ...response.current_config }
          }
          
          // 合并引擎配置，保留引擎的目录和参数设置
          Object.assign(data.configForm, {
            // 保留引擎的配置
            log_level: engineConfig.log_level || data.configForm.log_level,
            config_api_port: engineConfig.config_api_port || data.configForm.config_api_port,
            udp_iq_port: engineConfig.udp_iq_port || data.configForm.udp_iq_port,
            enable_iq_correction: engineConfig.enable_iq_correction !== undefined ? engineConfig.enable_iq_correction : data.configForm.enable_iq_correction,
            
            // 强制使用本机的 POST URL
            post_url: defaultPostUrl
          })
          
          // 单独处理 ai_engine 配置，确保保留引擎的 model_path
          if (engineConfig.ai_engine) {
            // 更新当前模型路径（只读）
            data.configForm.current_model_path = engineConfig.ai_engine.model_path || data.configForm.current_model_path
            Object.assign(data.configForm.ai_engine, {
              model_path: data.configForm.ai_engine.model_path, // 保持用户输入的新模型路径
              sequence_timeout_ms: engineConfig.ai_engine.sequence_timeout_ms || data.configForm.ai_engine.sequence_timeout_ms,
              max_threads: engineConfig.ai_engine.max_threads || data.configForm.ai_engine.max_threads,
              min_samples_per_locator: engineConfig.ai_engine.min_samples_per_locator || data.configForm.ai_engine.min_samples_per_locator
            })
          }
          
          // 单独处理 kalman_filter 配置
          if (engineConfig.kalman_filter) {
            Object.assign(data.configForm.kalman_filter, {
              process_noise: engineConfig.kalman_filter.process_noise || data.configForm.kalman_filter.process_noise,
              measurement_noise: engineConfig.kalman_filter.measurement_noise || data.configForm.kalman_filter.measurement_noise
            })
          }
        }
        
        // 显示详细信息
        if (deleted_files && deleted_files.length > 0) {
          console.log('已删除的文件:', deleted_files)
        }
        
        if (current_model) {
          console.log('当前使用的模型:', current_model)
        }
      } else {
        ElMessage.error(t('engine.messages.cleanupModelsFailed') + ': ' + (response?.message || t('engine.messages.unknownError')))
      }
    } catch (error) {
      console.error('清理模型错误:', error)
      let errorMessage = t('engine.messages.cleanupModelsFailed')
      
      if (error.response) {
        // 服务器返回错误
        errorMessage += ': ' + (error.response.data?.message || error.response.statusText)
      } else if (error.request) {
        // 网络错误
        errorMessage += ': ' + t('engine.messages.networkError')
      } else {
        // 其他错误
        errorMessage += ': ' + error.message
      }
      
      ElMessage.error(errorMessage)
    } finally {
      data.cleanupLoading.value = false
    }
  }

  // 定期健康检查所有引擎
  const startPeriodicHealthCheck = () => {
    // 每30秒检查一次所有引擎的健康状态
    data.healthCheckInterval.value = setInterval(async () => {
      for (const engine of data.engineList.value) {
        try {
          await api.performHealthCheck(engine)
        } catch (error) {
          console.error(`健康检查失败 ${engine.name}:`, error)
        }
      }
    }, 30000) // 30秒间隔
  }

  // 停止定期健康检查
  const stopPeriodicHealthCheck = () => {
    if (data.healthCheckInterval.value) {
      clearInterval(data.healthCheckInterval.value)
      data.healthCheckInterval.value = null
    }
  }

  return {
    handleSearch,
    handleResetSearch,
    handleSelectionChange,
    handleBatchDelete,
    handleAdd,
    handleEdit,
    handleHealthCheck,
    handleDelete,
    handleSubmit,
    handleSortChange,
    beforeUpload,
    onUploadSuccess,
    onUploadError,
    handleCleanupModels,
    startPeriodicHealthCheck,
    stopPeriodicHealthCheck
  }
}
