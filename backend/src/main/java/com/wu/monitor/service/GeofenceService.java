package com.wu.monitor.service;

import com.wu.monitor.model.Geofence;
import java.util.List;

public interface GeofenceService {
    
    /**
     * 获取所有电子围栏
     * @param name 围栏名称（可选）
     * @param mapId 地图ID（可选）
     * @param enabled 是否启用（可选）
     * @return 围栏列表
     */
    List<Geofence> getAllGeofences(String name, Long mapId, Boolean enabled);
    
    /**
     * 根据ID获取电子围栏
     * @param id 围栏ID
     * @return 围栏信息
     */
    Geofence getGeofenceById(Long id);
    
    /**
     * 根据地图ID获取电子围栏
     * @param mapId 地图ID
     * @return 围栏列表
     */
    List<Geofence> getGeofencesByMapId(Long mapId);
    
    /**
     * 根据地图ID获取启用的电子围栏
     * @param mapId 地图ID
     * @return 启用的围栏列表
     */
    List<Geofence> getEnabledGeofencesByMapId(Long mapId);
    
    /**
     * 创建电子围栏
     * @param geofence 围栏信息
     * @return 创建的围栏信息
     */
    Geofence createGeofence(Geofence geofence);
    
    /**
     * 更新电子围栏
     * @param geofence 围栏信息
     * @return 更新的围栏信息
     */
    Geofence updateGeofence(Geofence geofence);
    
    /**
     * 切换围栏启用状态
     * @param id 围栏ID
     * @param enabled 是否启用
     * @return 更新后的围栏信息
     */
    Geofence toggleGeofenceEnabled(Long id, Boolean enabled);
    
    /**
     * 删除电子围栏
     * @param id 围栏ID
     */
    void deleteGeofence(Long id);
    
    /**
     * 批量删除电子围栏
     * @param ids 围栏ID列表
     */
    void batchDeleteGeofences(List<Long> ids);
    
    /**
     * 检查围栏名称是否存在
     * @param name 围栏名称
     * @param excludeId 排除的ID（更新时使用）
     * @return 是否存在
     */
    boolean isGeofenceNameExists(String name, Long excludeId);
    
    /**
     * 验证坐标点是否在围栏内
     * @param geofenceId 围栏ID
     * @param x X坐标
     * @param y Y坐标
     * @return 是否在围栏内
     */
    boolean isPointInGeofence(Long geofenceId, Double x, Double y);
    
    /**
     * 验证坐标点是否在任何启用的围栏内
     * @param mapId 地图ID
     * @param x X坐标
     * @param y Y坐标
     * @return 匹配的围栏列表
     */
    List<Geofence> getMatchingGeofences(Long mapId, Double x, Double y);
} 