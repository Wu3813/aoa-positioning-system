// 围栏告警翻译工具函数
export function createGeofenceTranslationFunction(locale) {
  if (locale === 'zh-CN') {
    return (key, params) => {
      const translations = {
        'geofenceAlarm.title': '围栏告警',
        'geofenceAlarm.message': `标签 ${params?.tagId || ''} 离开围栏 ${params?.geofenceName || '未知'}`,
        'geofenceAlarm.handleNotificationFailed': '处理通知失败',
        'geofenceAlarm.registerListenerSuccess': '告警通知监听器注册成功',
        'geofenceAlarm.loadGeofencesSuccess': `已加载 ${params?.count || 0} 个围栏`,
        'geofenceAlarm.fetchListFailed': '获取围栏列表失败',
        'geofenceAlarm.fetchListError': '获取围栏列表出错'
      }
      return translations[key] || key
    }
  } else if (locale === 'zh-TW') {
    return (key, params) => {
      const translations = {
        'geofenceAlarm.title': '圍欄告警',
        'geofenceAlarm.message': `標籤 ${params?.tagId || ''} 離開圍欄 ${params?.geofenceName || '未知'}`,
        'geofenceAlarm.handleNotificationFailed': '處理通知失敗',
        'geofenceAlarm.registerListenerSuccess': '告警通知監聽器註冊成功',
        'geofenceAlarm.loadGeofencesSuccess': `已加載 ${params?.count || 0} 個圍欄`,
        'geofenceAlarm.fetchListFailed': '獲取圍欄列表失敗',
        'geofenceAlarm.fetchListError': '獲取圍欄列表出錯'
      }
      return translations[key] || key
    }
  } else {
    return (key, params) => {
      const translations = {
        'geofenceAlarm.title': 'Geofence Alarm',
        'geofenceAlarm.message': `Tag ${params?.tagId || ''} left geofence ${params?.geofenceName || 'Unknown'}`,
        'geofenceAlarm.handleNotificationFailed': 'Failed to handle notification',
        'geofenceAlarm.registerListenerSuccess': 'Alarm notification listener registered successfully',
        'geofenceAlarm.loadGeofencesSuccess': `Loaded ${params?.count || 0} geofences`,
        'geofenceAlarm.fetchListFailed': 'Failed to fetch geofence list',
        'geofenceAlarm.fetchListError': 'Error fetching geofence list'
      }
      return translations[key] || key
    }
  }
}
