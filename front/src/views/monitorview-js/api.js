import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

// API操作
export const createMonitorAPI = (data) => {
  const { t } = useI18n()

  // 获取地图列表
  const fetchMapList = async () => {
    try {
      data.mapList.value = await data.mapStore.fetchMapList()
      
      // 尝试获取上次选择的地图ID
      const savedMapId = data.mapStore.getPageMapSelection('monitor')
      
      // 查找保存的地图是否在当前地图列表中（使用mapId）
      const savedMapExists = savedMapId && data.mapList.value.some(map => map.mapId === savedMapId)
      
      // 如果存在已保存的选择，使用它；否则使用第一张地图
      if (savedMapExists) {
        data.selectedMapId.value = savedMapId
      } else if (data.mapList.value.length > 0 && !data.selectedMapId.value) {
        data.selectedMapId.value = data.mapList.value[0].mapId
      }
      
      if (data.selectedMapId.value) {
        await handleMapChange(data.selectedMapId.value, true) // 标记为初始加载
      }
    } catch (error) {
      console.error('获取地图列表失败:', error)
      ElMessage.error(t('monitor.fetchMapListFailed'))
    }
  }

  // 处理地图切换
  const handleMapChange = async (mapId, isInitialLoad = false) => {
    try {
      await data.mapStore.selectMap(mapId, 'monitor') // 传入页面名称参数
      
      // 调用过滤函数，确保只显示与当前地图匹配的传感器
      data.trackingStore.filterSensorsByMapId();
      
      // 加载当前地图的电子围栏
      await data.trackingStore.fetchGeofences(mapId);
      
      // 启动WebSocket连接
      if (!data.trackingStore.wsConnected) {
        data.trackingStore.connect();
      }
    } catch (error) {
      console.error('切换地图失败:', error)
      ElMessage.error(t('monitor.switchMapFailed'))
    }
  }

  return {
    fetchMapList,
    handleMapChange
  }
}
