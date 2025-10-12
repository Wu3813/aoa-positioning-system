import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

export function createEngineAPI(data) {
  const { t } = useI18n()

  // 获取引擎列表
  const fetchEngines = async () => {
    data.loading.value = true
    try {
      const params = {}
      
      if (data.searchForm.name && data.searchForm.name.trim()) {
        params.name = data.searchForm.name.trim()
      }
      if (data.searchForm.status !== '') {
        params.status = data.searchForm.status
      }
      
      const response = await axios.get('/api/engines', { params })
      
      // 直接使用返回的数据，后端返回的是数组
      let engines = []
      if (Array.isArray(response.data)) {
        engines = response.data
      } else {
        // 兼容处理，防止返回格式变化
        if (response.data && Array.isArray(response.data.content)) {
          engines = response.data.content
        } else {
          engines = []
        }
      }
      
      // 直接使用后端返回的数据
      data.engineList.value = engines.map(engine => ({
        ...engine,
        tagCount: engine.tagCount || 0,
        stationCount: engine.stationCount || 0
      }))
    } catch (error) {
      console.error('Get engine list error:', error)
      ElMessage.error(t('engine.fetchEnginesFailed') + ': ' + (error.response?.data?.message || error.message || 'Unknown error'))
      data.engineList.value = []
    } finally {
      data.loading.value = false
    }
  }

  // 获取地图列表
  const fetchMaps = async () => {
    try {
      const response = await axios.get('/api/maps')
      if (Array.isArray(response.data)) {
        data.mapList.value = response.data
      } else if (response.data && Array.isArray(response.data.content)) {
        data.mapList.value = response.data.content
      } else {
        data.mapList.value = []
      }
    } catch (error) {
      console.error('Get map list error:', error)
      ElMessage.error(t('engine.fetchMapsFailed'))
      data.mapList.value = []
    }
  }

  // 获取标签列表
  const fetchTags = async () => {
    try {
      const response = await axios.get('/api/tags')
      if (Array.isArray(response.data)) {
        data.tagList.value = response.data
      } else if (response.data && Array.isArray(response.data.content)) {
        data.tagList.value = response.data.content
      } else {
        data.tagList.value = []
      }
    } catch (error) {
      console.error('Get tag list error:', error)
      ElMessage.error(t('engine.fetchTagsFailed'))
      data.tagList.value = []
    }
  }

  // 获取基站列表
  const fetchStations = async () => {
    try {
      const response = await axios.get('/api/stations')
      if (Array.isArray(response.data)) {
        data.stationList.value = response.data
      } else if (response.data && Array.isArray(response.data.content)) {
        data.stationList.value = response.data.content
      } else {
        data.stationList.value = []
      }
    } catch (error) {
      console.error('Get station list error:', error)
      ElMessage.error(t('engine.fetchStationsFailed'))
      data.stationList.value = []
    }
  }

  // 添加引擎
  const addEngine = async (engineData) => {
    try {
      await axios.post('/api/engines', engineData)
      ElMessage.success(t('engine.messages.addSuccess'))
      return true
    } catch (error) {
      console.error('Add engine error:', error)
      ElMessage.error(t('engine.messages.addFailed') + ': ' + (error.response?.data?.message || error.message || 'Unknown error'))
      return false
    }
  }

  // 更新引擎
  const updateEngine = async (id, engineData) => {
    try {
      await axios.put(`/api/engines/${id}`, engineData)
      ElMessage.success(t('engine.messages.updateSuccess'))
      return true
    } catch (error) {
      console.error('Update engine error:', error)
      ElMessage.error(t('engine.messages.updateFailed') + ': ' + (error.response?.data?.message || error.message || 'Unknown error'))
      return false
    }
  }

  // 删除引擎
  const deleteEngine = async (id) => {
    try {
      await axios.delete(`/api/engines/${id}`)
      ElMessage.success(t('engine.messages.deleteSuccess'))
      return true
    } catch (error) {
      console.error('Delete engine error:', error)
      ElMessage.error(t('engine.messages.deleteFailed') + ': ' + (error.response?.data?.message || error.message || 'Unknown error'))
      return false
    }
  }

  // 批量删除引擎
  const batchDeleteEngines = async (ids) => {
    try {
      await axios.delete('/api/engines/batch', { data: ids })
      ElMessage.success(t('engine.messages.batchDeleteSuccess'))
      return true
    } catch (error) {
      console.error('Batch delete engines error:', error)
      ElMessage.error(t('engine.messages.batchDeleteFailed') + ': ' + (error.response?.data?.message || error.message || 'Unknown error'))
      return false
    }
  }

  // 更新引擎状态
  const updateEngineStatus = async (id, status) => {
    try {
      await axios.put(`/api/engines/${id}/status`, { status })
      return true
    } catch (error) {
      console.error('更新引擎状态错误:', error)
      return false
    }
  }

  // 执行健康检查并更新状态
  const performHealthCheck = async (row) => {
    try {
      // 使用后端代理进行健康检查
      const response = await axios.get(`/api/engines/proxy/${row.id}/health`, { timeout: 5000 })
      
      const isHealthy = response.data && response.data.status === 'healthy'
      const newStatus = isHealthy ? 1 : 0
      
      // 无论状态是否变化，都更新最后通信时间（后端已经处理）
      // 如果状态发生变化，更新后端状态
      if (row.status !== newStatus) {
        await updateEngineStatus(row.id, newStatus)
        row.status = newStatus
        data.engineForm.status = newStatus
      }
      
      return isHealthy
    } catch (error) {
      console.error('健康检查错误:', error)
      // 健康检查失败，设置为离线状态
      const newStatus = 0
      if (row.status !== newStatus) {
        try {
          await updateEngineStatus(row.id, newStatus)
          row.status = newStatus
          data.engineForm.status = newStatus
        } catch (updateError) {
          console.error('更新状态失败:', updateError)
        }
      }
      
      return false
    }
  }

  // 加载引擎配置
  const loadEngineConfig = async (engine) => {
    let counts = { validTagCount: 0, validStationCount: 0 }
    
    try {
      // 使用后端代理获取当前配置
      const response = await axios.get(`/api/engines/proxy/${engine.id}/config/current`, { timeout: 5000 })
      
      if (response.data) {
        // 保存当前的 post_url 默认值
        const defaultPostUrl = `http://${window.location.hostname}:8080/api/realtime/paths/batch`
        
        // 后端已经处理了嵌套结构，直接使用返回的数据
        const engineConfig = { ...response.data }
        
        console.log('从引擎加载的配置:', engineConfig)
        console.log('引擎配置中的 ai_engine:', engineConfig.ai_engine)
        console.log('引擎配置中的 model_path:', engineConfig.ai_engine?.model_path)
        console.log('引擎配置中的 classic_engine:', engineConfig.classic_engine)
        
        // 先构建本地配置（标签和基站数据）
        counts = await data.buildConfigFromData()
        
        // 然后合并引擎配置，保留引擎的目录和参数设置
        Object.assign(data.configForm, {
          // 保留引擎的配置
          log_level: engineConfig.log_level || 'info',
          config_api_port: engineConfig.config_api_port || 9999,
          udp_iq_port: engineConfig.udp_iq_port || 777,
          enable_iq_correction: engineConfig.enable_iq_correction !== undefined ? engineConfig.enable_iq_correction : true,
          
          // 强制使用本机的 POST URL
          post_url: defaultPostUrl
        })
        
        // 单独处理 ai_engine 配置，确保保留引擎的 model_path
        if (engineConfig.ai_engine) {
          console.log('合并前的 configForm.ai_engine.model_path:', data.configForm.ai_engine.model_path)
          // 设置当前模型路径（只读）
          data.configForm.current_model_path = engineConfig.ai_engine.model_path || ''
          // 新模型路径初始化为空，用户可以输入新的路径
          Object.assign(data.configForm.ai_engine, {
            model_path: '', // 新模型路径初始化为空
            sequence_timeout_ms: engineConfig.ai_engine.sequence_timeout_ms || 1000,
            max_threads: engineConfig.ai_engine.max_threads || 30,
            min_samples_per_locator: engineConfig.ai_engine.min_samples_per_locator || 3
          })
          console.log('合并后的 configForm.current_model_path:', data.configForm.current_model_path)
          console.log('合并后的 configForm.ai_engine.model_path:', data.configForm.ai_engine.model_path)
        }
        
        // 单独处理 classic_engine 配置
        if (engineConfig.classic_engine) {
          Object.assign(data.configForm.classic_engine, {
            moving_sequence_count: engineConfig.classic_engine.moving_sequence_count || 4,
            moving_trigger_sequence_count: engineConfig.classic_engine.moving_trigger_sequence_count || 1,
            num_angle_threads: engineConfig.classic_engine.num_angle_threads || 3,
            num_position_threads: engineConfig.classic_engine.num_position_threads || 3,
            static_window_keep_size: engineConfig.classic_engine.static_window_keep_size || 30,
            static_window_max_size: engineConfig.classic_engine.static_window_max_size || 60
          })
        }
        
        // 单独处理 kalman_filter 配置
        if (engineConfig.kalman_filter) {
          Object.assign(data.configForm.kalman_filter, {
            process_noise: engineConfig.kalman_filter.process_noise || 0.01,
            measurement_noise: engineConfig.kalman_filter.measurement_noise || 0.1
          })
        }
        
        console.log('合并后的完整配置:', data.configForm)
      } else {
        console.warn('配置加载失败，使用默认配置')
        // 如果引擎配置加载失败，仍然构建本地配置
        counts = await data.buildConfigFromData()
      }
    } catch (error) {
      console.error('加载配置错误:', error)
      ElMessage.warning('无法加载引擎配置，将使用默认配置')
      // 如果引擎配置加载失败，仍然构建本地配置
      counts = await data.buildConfigFromData()
    }
    
    // 更新统计数据
    engine.tagCount = counts.validTagCount
    engine.stationCount = counts.validStationCount
  }

  // 更新引擎配置
  const updateEngineConfig = async (id, configData) => {
    try {
      const response = await axios.post(`/api/engines/proxy/${id}/config/update`, configData)
      return response.data && response.data.success
    } catch (error) {
      console.error('配置更新错误:', error)
      throw error
    }
  }

  // 清理模型
  const cleanupModels = async (id) => {
    try {
      const cleanupUrl = `/api/engines/proxy/${id}/model/cleanup`
      const response = await axios.post(cleanupUrl, {}, { timeout: 15000 })
      return response.data
    } catch (error) {
      console.error('清理模型错误:', error)
      throw error
    }
  }

  return {
    fetchEngines,
    fetchMaps,
    fetchTags,
    fetchStations,
    addEngine,
    updateEngine,
    deleteEngine,
    batchDeleteEngines,
    updateEngineStatus,
    performHealthCheck,
    loadEngineConfig,
    updateEngineConfig,
    cleanupModels
  }
}
