import { ElMessage, ElMessageBox } from 'element-plus'

export function createStationUI(data, api) {
  // 搜索处理
  const handleSearch = () => {
    api.fetchStations();
  }

  // 重置搜索
  const handleResetSearch = () => {
    data.searchForm.code = '';
    data.searchForm.name = '';
    data.searchForm.status = '';
    api.fetchStations();
  }

  // 选择变更处理
  const handleSelectionChange = (selection) => {
    data.multipleSelection.value = selection;
  }

  // 添加基站
  const handleAdd = () => {
    data.dialogType.value = 'add';
    data.udpConnected.value = false; // 重置UDP连接状态
    Object.assign(data.stationForm, {
      id: null,
      code: '',
      name: '',
      macAddress: '',
      ipAddress: '',
      model: '',
      firmwareVersion: '',
      mapId: null,
      positionX: '',
      positionY: '',
      positionZ: '',
      orientation: 0,
      coordinateX: null,
      coordinateY: null,
      coordinateZ: null,
      status: 2,
      scanEnabled: null,
      remark: ''
    });
    data.dialogVisible.value = true;
    
    // 异步设置表单引用，确保DOM已更新
    setTimeout(() => {
      if (data.stationFormRef.value) {
        data.stationFormRef.value.clearValidate();
      }
    }, 0);
  }

  // 编辑基站
  const handleEdit = (row) => {
    data.dialogType.value = 'edit';
    data.udpConnected.value = false; // 重置UDP连接状态
    // 深拷贝以避免直接修改表格数据
    const rowData = JSON.parse(JSON.stringify(row));
    Object.assign(data.stationForm, rowData);
    data.dialogVisible.value = true;
    
    // 异步设置表单引用，确保DOM已更新
    setTimeout(() => {
      if (data.stationFormRef.value) {
        data.stationFormRef.value.clearValidate();
      }
    }, 0);
  }

  // 删除单个基站
  const handleDelete = (row) => {
    ElMessageBox.confirm(
      `确定要删除基站 "${row.name}" 吗？`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).then(async () => {
      await api.deleteStation(row);
    }).catch(() => {
      // 取消删除，不做处理
    });
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!data.stationFormRef.value) return;
    
    await data.stationFormRef.value.validate(async (valid) => {
      if (valid) {
        data.submitLoading.value = true;
        try {
          const success = await api.submitForm();
          if (success) {
            data.submitLoading.value = false;
          }
        } catch (error) {
          console.error('提交表单错误:', error);
        } finally {
          data.submitLoading.value = false;
        }
      } else {
        return false;
      }
    });
  }

  // 刷新单个基站状态
  const handleRefreshStation = (row) => {
    api.refreshStation(row);
  }

  // 检查所有基站状态
  const handleCheckAllStatus = () => {
    api.checkAllStatus();
  }

  // 批量刷新选中的基站
  const handleBatchRefresh = () => {
    api.batchRefresh();
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (data.multipleSelection.value.length === 0) {
      ElMessage.warning('请至少选择一条记录');
      return;
    }
    
    ElMessageBox.confirm(
      `确定要删除选中的 ${data.multipleSelection.value.length} 条记录吗？`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).then(async () => {
      await api.batchDelete();
    }).catch(() => {
      // 取消删除，不做处理
    });
  }

  // 测试连接
  const handleTestConnection = () => {
    api.testConnection();
  }

  // 开启标签广播数据上报
  const handleEnableBroadcast = () => {
    api.enableBroadcast();
  }

  // 开启扫描
  const handleEnableScanning = () => {
    api.enableScanning();
  }

  // 恢复出厂设置
  const handleFactoryReset = (row) => {
    ElMessageBox.confirm(
      `确定要恢复基站 "${row.name}" 的出厂设置吗？此操作不可逆！`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).then(async () => {
      await api.factoryReset(row);
    }).catch(() => {
      // 取消操作，不做处理
    });
  }

  // 重启基站
  const handleRestart = (row) => {
    ElMessageBox.confirm(
      `确定要重启基站 "${row.name}" 吗？`,
      '确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).then(async () => {
      await api.restartStation(row);
    }).catch(() => {
      // 取消操作，不做处理
    });
  }

  // 定位基站
  const handleLocate = (row) => {
    ElMessageBox.confirm(
      `确定要定位基站 "${row.name}" 吗？基站灯将闪烁100次。`,
      '确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      }
    ).then(async () => {
      await api.locateStation(row);
    }).catch(() => {
      // 取消操作，不做处理
    });
  }

  // 更新基站
  const handleUpdate = (row) => {
    ElMessage.info(`更新基站功能暂未实现 - 基站: ${row.name}`);
    // TODO: 实现更新基站功能
  }

  // 配置基站
  const handleConfig = (row) => {
    data.currentConfigStation.value = row
    data.selectedScanConfig.value = row.scanConfigType || '' // 使用基站当前的扫描配置类型
    data.rssiValue.value = row.rssi || -80 // 使用基站当前的RSSI值，如果没有则使用默认值-80
    data.targetIp.value = row.targetIp || '' // 使用基站当前的目标IP，如果没有则为空
    data.targetPort.value = row.targetPort || null // 使用基站当前的目标端口，如果没有则为null
    data.configDialogVisible.value = true
  }

  // 应用扫描配置
  const handleApplyScanConfig = () => {
    api.applyScanConfig();
  }

  // 配置RSSI
  const handleConfigRSSI = () => {
    api.configRSSI();
  }

  // 配置目标IP端口
  const handleConfigTarget = () => {
    api.configTarget();
  }

  // 处理排序变化
  const handleSortChange = ({ prop, order }) => {
    data.sortOrder.value = { prop, order };
  }

  // 批量导入坐标
  const handleImportCoordinates = () => {
    // 触发隐藏的文件输入点击
    data.fileInput.value.click();
  }

  // 处理文件选择
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      ElMessage.error('请上传JSON格式文件');
      event.target.value = null; // 清空选择
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // 解析JSON内容
        const content = JSON.parse(e.target.result);
        
        // 确保JSON格式正确
        if (!content.detected_base_station || !Array.isArray(content.detected_base_station)) {
          ElMessage.error('JSON格式不正确，缺少detected_base_station数组');
          return;
        }
        
        // 过滤出有效的基站配置
        const validStations = content.detected_base_station.filter(station => 
          station.base_mac && station.x !== undefined && 
          station.y !== undefined && station.z !== undefined && 
          station.orientation_deg !== undefined
        );
        
        if (validStations.length === 0) {
          ElMessage.error('没有找到有效的基站配置信息');
          return;
        }
        
        // 构建MAC地址与基站的映射
        const macToStationMap = {};
        data.stationList.value.forEach(station => {
          if (station.macAddress) {
            // 移除所有分隔符并转为大写，以便进行比较
            const normalizedMac = station.macAddress.replace(/[:-]/g, '').toUpperCase();
            macToStationMap[normalizedMac] = station;
          }
        });
        
        // 收集要更新的基站数据
        const stationsToUpdate = [];
        const skippedStations = [];
        
        validStations.forEach(jsonStation => {
          // 标准化MAC地址
          const normalizedMac = jsonStation.base_mac.replace(/[:-]/g, '').toUpperCase();
          
          if (macToStationMap[normalizedMac]) {
            const station = macToStationMap[normalizedMac];
            stationsToUpdate.push({
              id: station.id,
              coordinateX: jsonStation.x,
              coordinateY: jsonStation.y,
              coordinateZ: jsonStation.z,
              orientation: jsonStation.orientation_deg
            });
          } else {
            skippedStations.push(normalizedMac);
          }
        });
        
        if (stationsToUpdate.length === 0) {
          ElMessage.warning('没有匹配到任何基站，请检查MAC地址');
          return;
        }
        
        // 提示确认
        ElMessageBox.confirm(
          `发现${stationsToUpdate.length}个基站需要更新坐标，${skippedStations.length}个基站未匹配。是否继续？`,
          '批量导入坐标',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        ).then(async () => {
          // 发送批量更新请求
          await api.batchUpdateCoordinates(stationsToUpdate);
        }).catch(() => {
          // 用户取消操作
        });
        
      } catch (error) {
        console.error('处理JSON文件错误:', error);
        ElMessage.error('解析JSON文件失败: ' + error.message);
      } finally {
        event.target.value = null; // 清空文件选择
      }
    };
    
    reader.readAsText(file);
  }

  // 添加自动刷新机制
  const startAutoRefresh = () => {
    data.autoRefreshTimer.value = setInterval(async () => {
      // 只有在对话框关闭且没有正在加载时才刷新
      if (!data.dialogVisible.value && !data.configDialogVisible.value && !data.loading.value) {
        await api.fetchStations();
      }
    }, 30000); // 每30秒刷新一次
  }

  // 停止自动刷新机制
  const stopAutoRefresh = () => {
    if (data.autoRefreshTimer.value) {
      clearInterval(data.autoRefreshTimer.value);
      data.autoRefreshTimer.value = null;
    }
  }

  return {
    handleSearch,
    handleResetSearch,
    handleSelectionChange,
    handleAdd,
    handleEdit,
    handleDelete,
    handleSubmit,
    handleRefreshStation,
    handleCheckAllStatus,
    handleBatchRefresh,
    handleBatchDelete,
    handleTestConnection,
    handleEnableBroadcast,
    handleEnableScanning,
    handleFactoryReset,
    handleRestart,
    handleLocate,
    handleUpdate,
    handleConfig,
    handleApplyScanConfig,
    handleConfigRSSI,
    handleConfigTarget,
    handleSortChange,
    handleImportCoordinates,
    handleFileChange,
    startAutoRefresh,
    stopAutoRefresh
  }
}
