import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

export function createStationAPI(data) {
  const { t } = useI18n()
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
      ElMessage.error(t('station.messages.fetchStationsFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.unknownError')));
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
      ElMessage.error(t('station.messages.fetchMapsFailed'));
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
          ElMessage.success(t('station.messages.refreshSuccess'));
        } else {
          ElMessage.warning(t('station.messages.statusUpdated'));
        }
      } else {
        ElMessage.warning(response.data.message || t('station.messages.refreshFailed'));
      }
    } catch (error) {
      console.error('刷新基站状态错误:', error);
      ElMessage.error(t('station.messages.refreshFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.networkError')));
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
        ElMessage.warning(response.data.message || t('station.messages.checkAllFailed'));
      }
    } catch (error) {
      console.error('检查所有基站状态错误:', error);
      ElMessage.error(t('station.messages.checkAllFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.networkError')));
    } finally {
      data.checkAllLoading.value = false;
    }
  }

  // 批量刷新选中的基站
  const batchRefresh = async () => {
    if (data.multipleSelection.value.length === 0) {
      ElMessage.warning(t('station.messages.selectAtLeastOneStation'));
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
        ElMessage.warning(response.data.message || t('station.messages.batchRefreshFailed'));
      }
    } catch (error) {
      console.error('批量刷新基站错误:', error);
      ElMessage.error(t('station.messages.batchRefreshFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.networkError')));
    } finally {
      data.batchRefreshLoading.value = false;
    }
  }

  // 批量删除
  const batchDelete = async () => {
    if (data.multipleSelection.value.length === 0) {
      ElMessage.warning(t('station.messages.selectAtLeastOne'));
      return;
    }
    
    try {
      const ids = data.multipleSelection.value.map(item => item.id);
      await axios.delete('/api/stations/batch', { data: ids });
      ElMessage.success(t('station.messages.batchDeleteSuccess'));
      fetchStations(); // 重新加载基站列表
    } catch (error) {
      console.error('批量删除基站错误:', error);
      ElMessage.error(t('station.messages.batchDeleteFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.unknownError')));
    }
  }

  // 测试连接
  const testConnection = async () => {
    if (!data.stationForm.ipAddress || !data.stationForm.ipAddress.trim()) {
      ElMessage.warning(t('station.messages.inputIPFirst'));
      return;
    }
    
    data.testingConnection.value = true;
    try {
      const response = await axios.post('/api/stations/test-connection', { 
        ipAddress: data.stationForm.ipAddress.trim() 
      });
      
      if (response.data.success) {
        ElMessage.success(t('station.messages.testConnectionSuccess'));
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
        ElMessage.warning(response.data.message || t('station.messages.testConnectionFailed'));
        data.udpConnected.value = false; // 连接失败时重置状态
      }
    } catch (error) {
      console.error('测试连接错误:', error);
      ElMessage.error(t('station.messages.testConnectionFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.networkError')));
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
        ElMessage.success(t('station.messages.addSuccess'));
      } else {
        // 更新基站
        await axios.put(`/api/stations/${submitData.id}`, submitData);
        ElMessage.success(t('station.messages.updateSuccess'));
      }
      data.dialogVisible.value = false;
      fetchStations(); // 重新加载基站列表
      return true;
    } catch (error) {
      console.error('保存基站错误:', error);
      ElMessage.error(
        (data.dialogType.value === 'add' ? t('station.messages.addFailed') + ': ' : t('station.messages.updateFailed') + ': ') + 
        (error.response?.data?.message || error.message || t('station.messages.unknownError'))
      );
      return false;
    }
  }

  // 删除单个基站
  const deleteStation = async (row) => {
    try {
      await axios.delete(`/api/stations/${row.id}`);
      ElMessage.success(t('station.messages.deleteSuccess'));
      fetchStations(); // 重新加载基站列表
    } catch (error) {
      console.error('删除基站错误:', error);
      ElMessage.error(t('station.messages.deleteFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.unknownError')));
    }
  }

  // 开启标签广播数据上报
  const enableBroadcast = async () => {
    if (!data.stationForm.ipAddress || !data.stationForm.ipAddress.trim()) {
      ElMessage.warning(t('station.messages.inputIPFirst'));
      return;
    }
    
    data.enablingBroadcast.value = true;
    try {
      const response = await axios.post('/api/stations/enable-broadcast', {
        ipAddress: data.stationForm.ipAddress.trim()
      });
      
      if (response.data.success) {
        ElMessage.success(t('station.messages.enableBroadcastSuccess'));
      } else {
        ElMessage.warning(response.data.message || t('station.messages.enableBroadcastFailed'));
      }
    } catch (error) {
      console.error('开启标签广播数据上报错误:', error);
      ElMessage.error(t('station.messages.enableBroadcastFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.networkError')));
    } finally {
      data.enablingBroadcast.value = false;
    }
  }

  // 开启扫描
  const enableScanning = async () => {
    if (!data.stationForm.ipAddress || !data.stationForm.ipAddress.trim()) {
      ElMessage.warning(t('station.messages.inputIPFirst'));
      return;
    }
    
    data.enablingScanning.value = true;
    try {
      const response = await axios.post('/api/stations/enable-scanning', {
        ipAddress: data.stationForm.ipAddress.trim()
      });
      
      if (response.data.success) {
        ElMessage.success(t('station.messages.enableScanningSuccess'));
      } else {
        ElMessage.warning(response.data.message || t('station.messages.enableScanningFailed'));
      }
    } catch (error) {
      console.error('开启扫描错误:', error);
      ElMessage.error(t('station.messages.enableScanningFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.networkError')));
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
        ElMessage.warning(response.data.message || t('station.messages.factoryResetFailed'));
      }
    } catch (error) {
      console.error('恢复出厂设置错误:', error);
      ElMessage.error(t('station.messages.factoryResetFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.networkError')));
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
        ElMessage.warning(response.data.message || t('station.messages.restartFailed'));
      }
    } catch (error) {
      console.error('基站重启错误:', error);
      ElMessage.error(t('station.messages.restartFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.networkError')));
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
        ElMessage.warning(response.data.message || t('station.messages.locateFailed'));
      }
    } catch (error) {
      console.error('基站定位错误:', error);
      ElMessage.error(t('station.messages.locateFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.networkError')));
    }
  }

  // 应用扫描配置
  const applyScanConfig = async () => {
    const row = data.currentConfigStation.value
    
    if (!data.selectedScanConfig.value) {
      ElMessage.warning(t('station.messages.selectScanConfig'));
      return;
    }
    
    data.applyScanConfigLoading.value = true
    
    try {
      const configName = data.selectedScanConfig.value === 'config1' ? t('station.config1') : t('station.config2');
      const response = await axios.post(`/api/stations/${data.selectedScanConfig.value}`, {
        ipAddress: row.ipAddress
      });
      
      if (response.data.success) {
        ElMessage.success(t('station.messages.applyConfigSuccess', { configName }));
        data.configDialogVisible.value = false
        // 刷新基站列表以显示最新的扫描配置
        await fetchStations()
      } else {
        ElMessage.warning(response.data.message || t('station.messages.applyConfigFailed', { configName }));
      }
    } catch (error) {
      const configName = data.selectedScanConfig.value === 'config1' ? t('station.config1') : t('station.config2');
      console.error(`基站${configName}错误:`, error);
      ElMessage.error(t('station.messages.applyConfigFailed', { configName }) + ': ' + (error.response?.data?.message || error.message || t('station.messages.networkError')));
    } finally {
      data.applyScanConfigLoading.value = false
    }
  }

  // 配置RSSI
  const configRSSI = async () => {
    const row = data.currentConfigStation.value
    
    // 最后检查（虽然按钮应该已经被禁用）
    if (!data.isRssiValid.value) {
      ElMessage.warning(t('station.messages.inputValidRSSI'))
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
        ElMessage.warning(response.data.message || t('station.messages.configRSSIFailed'));
      }
    } catch (error) {
      console.error('基站配置RSSI错误:', error);
      ElMessage.error(t('station.messages.configRSSIFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.networkError')));
    } finally {
      data.configRSSILoading.value = false
    }
  }

  // 配置目标IP端口
  const configTarget = async () => {
    const row = data.currentConfigStation.value
    
    // 最后检查（虽然按钮应该已经被禁用）
    if (!data.isTargetValid.value) {
      ElMessage.warning(t('station.messages.inputValidTarget'))
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
        ElMessage.warning(response.data.message || t('station.messages.configTargetFailed'));
      }
    } catch (error) {
      console.error('基站配置目标IP端口错误:', error);
      ElMessage.error(t('station.messages.configTargetFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.networkError')));
    } finally {
      data.configTargetLoading.value = false
    }
  }

  // 批量更新坐标
  const batchUpdateCoordinates = async (stationsToUpdate) => {
    try {
      const response = await axios.post('/api/stations/batch/update-coordinates', stationsToUpdate);
      
      if (response.data.success) {
        ElMessage.success(t('station.messages.batchUpdateSuccess', { count: stationsToUpdate.length }));
        // 重新加载基站列表
        fetchStations();
      } else {
        ElMessage.warning(response.data.message || t('station.messages.batchUpdateFailed'));
      }
    } catch (error) {
      console.error('批量更新基站坐标错误:', error);
      ElMessage.error(t('station.messages.batchUpdateFailed') + ': ' + (error.response?.data?.message || error.message || t('station.messages.networkError')));
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
