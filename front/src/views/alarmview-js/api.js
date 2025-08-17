import axios from 'axios'

/**
 * 获取报警列表
 * @param {Object} params - 查询参数
 * @returns {Promise} API响应
 */
export const fetchAlarms = async (params = {}) => {
  try {
    const response = await axios.get('/api/alarms', { params })
    return response.data
  } catch (error) {
    console.error('获取报警列表错误:', error)
    throw error
  }
}

/**
 * 获取地图列表
 * @returns {Promise} API响应
 */
export const fetchMaps = async () => {
  try {
    const response = await axios.get('/api/maps')
    return response.data
  } catch (error) {
    console.error('获取地图列表错误:', error)
    throw error
  }
}

/**
 * 获取标签列表
 * @returns {Promise} API响应
 */
export const fetchTags = async () => {
  try {
    const response = await axios.get('/api/tags')
    return response.data
  } catch (error) {
    console.error('获取标签列表错误:', error)
    throw error
  }
}
