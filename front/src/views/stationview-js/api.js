import axios from 'axios'
import { ElMessage } from 'element-plus'

export function createStationAPI(data) {
  // 获取基站列表
  const fetchStations = async () => {
    data.loading.value = true;
    try {
      const params = {};
      
      // 只有当搜索关键词存在且不为空时才添加到查询参数中
      if (data.searchForm.code && data.searchForm.code.trim()) {
        params.code = data.searchForm.code.trim();
      }
      if (data.searchForm.name && data.searchForm.name.trim()) {
        params.name = data.searchForm.name.trim();
      }
      if (data.searchForm.status !== '') {
        params.status = data.searchForm.status;
      }
      
      // 添加时间戳避免缓存
      params._t = new Date().getTime();
      
      const response = await axios.get('/api/stations', { params });
      
      // 处理数据
      if (response.data && Array.isArray(response.data.content)) {
        data.stationList.value = response.data.content;
      } else if (Array.isArray(response.data)) {
        data.stationList.value = response.data;
      } else {
        data.stationList.value = [];
      }
    } catch (error) {
      console.error('获取基站列表错误:', error);
      ElMessage.error('获取基站列表失败: ' + (error.response?.data?.message || error.message || '未知错误'));
      data.stationList.value = []; // 出错时设置为空数组
    } finally {
      data.loading.value = false;
    }
  }

  // 获取地图列表（用于选择基站所属地图）
  const fetchMaps = async () => {
    try {
      const response = await axios.get('/api/maps');
      if (Array.isArray(response.data)) {
        data.mapList.value = response.data;
      } else if (response.data && Array.isArray(response.data.content)) {
        data.mapList.value = response.data.content;
      } else {
        data.mapList.value = [];
      }
    } catch (error) {
      console.error('获取地图列表错误:', error);
      ElMessage.error('获取地图列表失败');
      data.mapList.value = [];
    }
  }

  // 刷新单个基站状态
  const refreshStation = async (row) => {
    data.refreshingStations.value.push(row.id);
    try {
      const response = await axios.post(`/api/stations/${row.id}/refresh`);
      if (response.data.success && response.data.data) {
        // 无论成功还是失败，都更新基站数据
        const index = data.stationList.value.findIndex(station => station.id === row.id);
        if (index !== -1) {
          Object.assign(data.stationList.value[index], response.data.data);
        }
        
        // 根据基站状态显示不同的消息
        if (response.data.data.status === 1) {
          ElMessage.success('基站信息刷新成功');
        } else {
          ElMessage.warning('状态已更新');
        }
      } else {
        ElMessage.warning(response.data.message || '刷新失败');
      }
    } catch (error) {
      console.error('刷新基站状态错误:', error);
      ElMessage.error('刷新失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    } finally {
      const index = data.refreshingStations.value.indexOf(row.id);
      if (index > -1) {
        data.refreshingStations.value.splice(index, 1);
      }
    }
  }

  // 检查所有基站状态
  const checkAllStatus = async () => {
    data.checkAllLoading.value = true;
    try {
      const response = await axios.post('/api/stations/check-all-status');
      if (response.data.success) {
        ElMessage.success(response.data.message);
        // 稍等片刻确保后端更新完成，然后重新加载基站列表
        setTimeout(async () => {
          await fetchStations();
        }, 500); // 延迟500ms确保数据库更新完成
      } else {
        ElMessage.warning(response.data.message || '检查失败');
      }
    } catch (error) {
      console.error('检查所有基站状态错误:', error);
      ElMessage.error('检查失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    } finally {
      data.checkAllLoading.value = false;
    }
  }

  // 批量刷新选中的基站
  const batchRefresh = async () => {
    if (data.multipleSelection.value.length === 0) {
      ElMessage.warning('请至少选择一个基站');
      return;
    }
    
    data.batchRefreshLoading.value = true;
    try {
      const ids = data.multipleSelection.value.map(station => station.id);
      const response = await axios.post('/api/stations/batch/refresh', { ids });
      
      if (response.data.success) {
        ElMessage.success(response.data.message);
        // 重新加载基站列表以显示最新状态
        await fetchStations();
      } else {
        ElMessage.warning(response.data.message || '批量刷新失败');
      }
    } catch (error) {
      console.error('批量刷新基站错误:', error);
      ElMessage.error('批量刷新失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    } finally {
      data.batchRefreshLoading.value = false;
    }
  }

  // 批量删除
  const batchDelete = async () => {
    if (data.multipleSelection.value.length === 0) {
      ElMessage.warning('请至少选择一条记录');
      return;
    }
    
    try {
      const ids = data.multipleSelection.value.map(item => item.id);
      await axios.delete('/api/stations/batch', { data: ids });
      ElMessage.success('批量删除成功');
      fetchStations(); // 重新加载基站列表
    } catch (error) {
      console.error('批量删除基站错误:', error);
      ElMessage.error('批量删除失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    }
  }

  // 测试连接
  const testConnection = async () => {
    if (!data.stationForm.ipAddress || !data.stationForm.ipAddress.trim()) {
      ElMessage.warning('请先输入IP地址');
      return;
    }
    
    data.testingConnection.value = true;
    try {
      const response = await axios.post('/api/stations/test-connection', { 
        ipAddress: data.stationForm.ipAddress.trim() 
      });
      
      if (response.data.success) {
        ElMessage.success('UDP连接测试成功，自动获取基站信息');
        data.udpConnected.value = true; // 设置UDP连接成功状态
        
        // 自动填充获取到的信息
        const responseData = response.data.data;
        if (responseData) {
          if (responseData.macAddress) data.stationForm.macAddress = responseData.macAddress.toLowerCase();
          if (responseData.model) data.stationForm.model = responseData.model;
          if (responseData.firmwareVersion) data.stationForm.firmwareVersion = responseData.firmwareVersion;
          if (responseData.scanEnabled !== undefined) data.stationForm.scanEnabled = responseData.scanEnabled;
          
          // 填充加速度数据
          if (responseData.accelerationInfo) {
            if (responseData.accelerationInfo.accelerationX) data.stationForm.positionX = responseData.accelerationInfo.accelerationX;
            if (responseData.accelerationInfo.accelerationY) data.stationForm.positionY = responseData.accelerationInfo.accelerationY;
            if (responseData.accelerationInfo.accelerationZ) data.stationForm.positionZ = responseData.accelerationInfo.accelerationZ;
          }
        }
      } else {
        ElMessage.warning(response.data.message || 'UDP连接测试失败，请检查IP地址或网络连接');
        data.udpConnected.value = false; // 连接失败时重置状态
      }
    } catch (error) {
      console.error('测试连接错误:', error);
      ElMessage.error('UDP连接测试失败: ' + (error.response?.data?.message || error.message || '网络错误'));
      data.udpConnected.value = false; // 连接失败时重置状态
    } finally {
      data.testingConnection.value = false;
    }
  }

  // 提交表单
  const submitForm = async () => {
    if (!data.stationFormRef.value) return false;
    
    try {
      // 为空的硬件信息字段填充占位数据
      const submitData = { ...data.stationForm };
      
      // 确保MAC地址为小写
      if (submitData.macAddress) {
        submitData.macAddress = submitData.macAddress.toLowerCase();
      }
      
      // 判断是否获取到硬件信息，如果没有则设置为初始化状态
      const hasHardwareInfo = submitData.macAddress && 
                             submitData.macAddress.trim() !== '' && 
                             submitData.macAddress !== '待获取';
      
      if (!submitData.macAddress || submitData.macAddress.trim() === '') {
        submitData.macAddress = '待获取';
      }
      if (!submitData.model || submitData.model.trim() === '') {
        submitData.model = '待获取';
      }
      if (!submitData.firmwareVersion || submitData.firmwareVersion.trim() === '') {
        submitData.firmwareVersion = '待获取';
      }
      if (!submitData.positionX || submitData.positionX === '') {
        submitData.positionX = '0';
      }
      if (!submitData.positionY || submitData.positionY === '') {
        submitData.positionY = '0';
      }
      if (!submitData.positionZ || submitData.positionZ === '') {
        submitData.positionZ = '0';
      }
      
      // 如果是添加操作且没有获取到硬件信息，设置为初始化状态
      if (data.dialogType.value === 'add' && !hasHardwareInfo) {
        submitData.status = 2; // 初始化状态
      }
      
      if (data.dialogType.value === 'add') {
        // 添加基站
        await axios.post('/api/stations', submitData);
        ElMessage.success('添加成功');
      } else {
        // 更新基站
        await axios.put(`/api/stations/${submitData.id}`, submitData);
        ElMessage.success('更新成功');
      }
      data.dialogVisible.value = false;
      fetchStations(); // 重新加载基站列表
      return true;
    } catch (error) {
      console.error('保存基站错误:', error);
      ElMessage.error(
        (data.dialogType.value === 'add' ? '添加失败: ' : '更新失败: ') + 
        (error.response?.data?.message || error.message || '未知错误')
      );
      return false;
    }
  }

  // 删除单个基站
  const deleteStation = async (row) => {
    try {
      await axios.delete(`/api/stations/${row.id}`);
      ElMessage.success('删除成功');
      fetchStations(); // 重新加载基站列表
    } catch (error) {
      console.error('删除基站错误:', error);
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    }
  }

  // 开启标签广播数据上报
  const enableBroadcast = async () => {
    if (!data.stationForm.ipAddress || !data.stationForm.ipAddress.trim()) {
      ElMessage.warning('请先输入IP地址');
      return;
    }
    
    data.enablingBroadcast.value = true;
    try {
      const response = await axios.post('/api/stations/enable-broadcast', {
        ipAddress: data.stationForm.ipAddress.trim()
      });
      
      if (response.data.success) {
        ElMessage.success('标签广播数据上报开启成功');
      } else {
        ElMessage.warning(response.data.message || '开启标签广播数据上报失败');
      }
    } catch (error) {
      console.error('开启标签广播数据上报错误:', error);
      ElMessage.error('开启标签广播数据上报失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    } finally {
      data.enablingBroadcast.value = false;
    }
  }

  // 开启扫描
  const enableScanning = async () => {
    if (!data.stationForm.ipAddress || !data.stationForm.ipAddress.trim()) {
      ElMessage.warning('请先输入IP地址');
      return;
    }
    
    data.enablingScanning.value = true;
    try {
      const response = await axios.post('/api/stations/enable-scanning', {
        ipAddress: data.stationForm.ipAddress.trim()
      });
      
      if (response.data.success) {
        ElMessage.success('扫描开启成功');
      } else {
        ElMessage.warning(response.data.message || '开启扫描失败');
      }
    } catch (error) {
      console.error('开启扫描错误:', error);
      ElMessage.error('开启扫描失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    } finally {
      data.enablingScanning.value = false;
    }
  }

  // 恢复出厂设置
  const factoryReset = async (row) => {
    try {
      const response = await axios.post('/api/stations/factory-reset', {
        ipAddress: row.ipAddress
      });
      
      if (response.data.success) {
        ElMessage.success(response.data.message);
      } else {
        ElMessage.warning(response.data.message || '恢复出厂设置失败');
      }
    } catch (error) {
      console.error('恢复出厂设置错误:', error);
      ElMessage.error('恢复出厂设置失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    }
  }

  // 重启基站
  const restartStation = async (row) => {
    try {
      const response = await axios.post('/api/stations/restart', {
        ipAddress: row.ipAddress
      });
      
      if (response.data.success) {
        ElMessage.success(response.data.message);
      } else {
        ElMessage.warning(response.data.message || '基站重启失败');
      }
    } catch (error) {
      console.error('基站重启错误:', error);
      ElMessage.error('基站重启失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    }
  }

  // 定位基站
  const locateStation = async (row) => {
    try {
      const response = await axios.post('/api/stations/locate', {
        ipAddress: row.ipAddress
      });
      
      if (response.data.success) {
        ElMessage.success(response.data.message);
      } else {
        ElMessage.warning(response.data.message || '基站定位失败');
      }
    } catch (error) {
      console.error('基站定位错误:', error);
      ElMessage.error('基站定位失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    }
  }

  // 应用扫描配置
  const applyScanConfig = async () => {
    const row = data.currentConfigStation.value
    
    if (!data.selectedScanConfig.value) {
      ElMessage.warning('请选择一个扫描配置');
      return;
    }
    
    data.applyScanConfigLoading.value = true
    
    try {
      const configName = data.selectedScanConfig.value === 'config1' ? '配置1' : '配置2';
      const response = await axios.post(`/api/stations/${data.selectedScanConfig.value}`, {
        ipAddress: row.ipAddress
      });
      
      if (response.data.success) {
        ElMessage.success(`基站${configName}应用成功`);
        data.configDialogVisible.value = false
        // 刷新基站列表以显示最新的扫描配置
        await fetchStations()
      } else {
        ElMessage.warning(response.data.message || `基站${configName}应用失败`);
      }
    } catch (error) {
      const configName = data.selectedScanConfig.value === 'config1' ? '配置1' : '配置2';
      console.error(`基站${configName}错误:`, error);
      ElMessage.error(`基站${configName}应用失败: ` + (error.response?.data?.message || error.message || '网络错误'));
    } finally {
      data.applyScanConfigLoading.value = false
    }
  }

  // 配置RSSI
  const configRSSI = async () => {
    const row = data.currentConfigStation.value
    
    // 最后检查（虽然按钮应该已经被禁用）
    if (!data.isRssiValid.value) {
      ElMessage.warning('请输入有效的RSSI值（-100到-40dBm的整数）')
      return
    }
    
    data.configRSSILoading.value = true
    try {
      const response = await axios.post('/api/stations/config-rssi', {
        ipAddress: row.ipAddress,
        rssi: data.rssiValue.value
      });
      
      if (response.data.success) {
        ElMessage.success(response.data.message);
        data.configDialogVisible.value = false
        // 刷新基站列表以显示最新的RSSI值
        await fetchStations()
      } else {
        ElMessage.warning(response.data.message || '基站配置RSSI失败');
      }
    } catch (error) {
      console.error('基站配置RSSI错误:', error);
      ElMessage.error('基站配置RSSI失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    } finally {
      data.configRSSILoading.value = false
    }
  }

  // 配置目标IP端口
  const configTarget = async () => {
    const row = data.currentConfigStation.value
    
    // 最后检查（虽然按钮应该已经被禁用）
    if (!data.isTargetValid.value) {
      ElMessage.warning('请输入有效的目标IP地址和端口')
      return
    }
    
    data.configTargetLoading.value = true
    try {
      const response = await axios.post('/api/stations/config-target', {
        ipAddress: row.ipAddress,
        targetIp: data.targetIp.value,
        targetPort: data.targetPort.value
      });
      
      if (response.data.success) {
        ElMessage.success(response.data.message);
        data.configDialogVisible.value = false
        // 刷新基站列表以显示最新数据
        await fetchStations()
      } else {
        ElMessage.warning(response.data.message || '基站配置目标IP端口失败');
      }
    } catch (error) {
      console.error('基站配置目标IP端口错误:', error);
      ElMessage.error('基站配置目标IP端口失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    } finally {
      data.configTargetLoading.value = false
    }
  }

  // 批量更新坐标
  const batchUpdateCoordinates = async (stationsToUpdate) => {
    try {
      const response = await axios.post('/api/stations/batch/update-coordinates', stationsToUpdate);
      
      if (response.data.success) {
        ElMessage.success(`成功更新了${stationsToUpdate.length}个基站的坐标数据`);
        // 重新加载基站列表
        fetchStations();
      } else {
        ElMessage.warning(response.data.message || '部分基站更新失败');
      }
    } catch (error) {
      console.error('批量更新基站坐标错误:', error);
      ElMessage.error('批量更新失败: ' + (error.response?.data?.message || error.message || '网络错误'));
    }
  }

  return {
    fetchStations,
    fetchMaps,
    refreshStation,
    checkAllStatus,
    batchRefresh,
    batchDelete,
    testConnection,
    submitForm,
    deleteStation,
    enableBroadcast,
    enableScanning,
    factoryReset,
    restartStation,
    locateStation,
    applyScanConfig,
    configRSSI,
    configTarget,
    batchUpdateCoordinates
  }
}
