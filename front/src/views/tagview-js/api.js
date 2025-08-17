import axios from 'axios'
import { ElMessage } from 'element-plus'

export function createTagAPI(data) {
  // 获取标签列表
  const fetchTags = async () => {
    data.loading.value = true;
    try {
      const params = {};
      
      if (data.searchForm.name && data.searchForm.name.trim()) {
        params.name = data.searchForm.name.trim();
      }

      if (data.searchForm.status !== '') {
        params.status = data.searchForm.status;
      }
      
      const response = await axios.get('/api/tags', { params });
      
      if (response.data && Array.isArray(response.data.content)) {
        data.tagList.value = response.data.content;
      } else if (Array.isArray(response.data)) {
        data.tagList.value = response.data;
      } else {
        data.tagList.value = [];
      }
    } catch (error) {
      console.error('获取标签列表错误:', error);
      ElMessage.error('获取标签列表失败: ' + (error.response?.data?.message || error.message || '未知错误'));
      data.tagList.value = [];
    } finally {
      data.loading.value = false;
    }
  }

  // 获取地图列表并缓存
  const fetchMapsToCache = async () => {
    try {
      const response = await axios.get('/api/maps');
      const maps = Array.isArray(response.data) ? response.data : 
                   (response.data && Array.isArray(response.data.content)) ? response.data.content : [];
      
      data.mapCache.value.clear();
      maps.forEach(map => {
        data.mapCache.value.set(map.mapId, map.name);
      });
    } catch (error) {
      console.error('获取地图列表错误:', error);
    }
  }

  // 添加标签
  const addTag = async (tagData) => {
    try {
      await axios.post('/api/tags', tagData);
      ElMessage.success('添加成功');
      return true;
    } catch (error) {
      console.error('添加标签错误:', error);
      ElMessage.error('添加失败: ' + (error.response?.data?.message || error.message || '未知错误'));
      return false;
    }
  }

  // 更新标签
  const updateTag = async (id, tagData) => {
    try {
      await axios.put(`/api/tags/${id}`, tagData);
      ElMessage.success('更新成功');
      return true;
    } catch (error) {
      console.error('更新标签错误:', error);
      ElMessage.error('更新失败: ' + (error.response?.data?.message || error.message || '未知错误'));
      return false;
    }
  }

  // 删除标签
  const deleteTag = async (id) => {
    try {
      await axios.delete(`/api/tags/${id}`);
      ElMessage.success('删除成功');
      return true;
    } catch (error) {
      console.error('删除标签错误:', error);
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message || '未知错误'));
      return false;
    }
  }

  // 批量删除标签
  const batchDeleteTags = async (ids) => {
    try {
      await axios.delete('/api/tags/batch', { data: ids });
      ElMessage.success('批量删除成功');
      return true;
    } catch (error) {
      console.error('批量删除标签错误:', error);
      ElMessage.error('批量删除失败: ' + (error.response?.data?.message || error.message || '未知错误'));
      return false;
    }
  }

  // 更新标签状态
  const updateTagStatus = async (id, tagStatus) => {
    try {
      await axios.put(`/api/tags/${id}/status`, tagStatus);
      ElMessage.success('状态更新成功');
      return true;
    } catch (error) {
      console.error('更新标签状态错误:', error);
      ElMessage.error('状态更新失败: ' + (error.response?.data?.message || error.message || '未知错误'));
      return false;
    }
  }

  return {
    fetchTags,
    fetchMapsToCache,
    addTag,
    updateTag,
    deleteTag,
    batchDeleteTags,
    updateTagStatus
  }
}
