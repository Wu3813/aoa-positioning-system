package com.wu.monitor.mapper;

import com.wu.monitor.model.Geofence;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface GeofenceMapper {
    
    /**
     * 查询所有电子围栏
     * @param name 围栏名称（可选）
     * @param mapId 地图ID（可选）
     * @param enabled 是否启用（可选）
     * @return 围栏列表
     */
    List<Geofence> selectAllGeofences(@Param("name") String name,
                                     @Param("mapId") Long mapId,
                                     @Param("enabled") Boolean enabled);
    
    /**
     * 根据ID查询电子围栏
     * @param id 围栏ID
     * @return 围栏信息
     */
    Geofence selectGeofenceById(@Param("id") Long id);
    
    /**
     * 根据地图ID查询电子围栏
     * @param mapId 地图ID
     * @return 围栏列表
     */
    List<Geofence> selectGeofencesByMapId(@Param("mapId") Long mapId);
    
    /**
     * 根据地图ID查询启用的电子围栏
     * @param mapId 地图ID
     * @return 启用的围栏列表
     */
    List<Geofence> selectEnabledGeofencesByMapId(@Param("mapId") Long mapId);
    
    /**
     * 插入电子围栏
     * @param geofence 围栏信息
     * @return 影响行数
     */
    int insertGeofence(Geofence geofence);
    
    /**
     * 更新电子围栏
     * @param geofence 围栏信息
     * @return 影响行数
     */
    int updateGeofence(Geofence geofence);
    
    /**
     * 更新围栏启用状态
     * @param id 围栏ID
     * @param enabled 是否启用
     * @return 影响行数
     */
    int updateGeofenceEnabled(@Param("id") Long id, @Param("enabled") Boolean enabled);
    
    /**
     * 删除电子围栏
     * @param id 围栏ID
     * @return 影响行数
     */
    int deleteGeofenceById(@Param("id") Long id);
    
    /**
     * 批量删除电子围栏
     * @param ids 围栏ID列表
     */
    void batchDeleteGeofences(@Param("ids") List<Long> ids);
    
    /**
     * 根据名称查询电子围栏（用于检查重名）
     * @param name 围栏名称
     * @param excludeId 排除的ID（更新时使用）
     * @return 围栏信息
     */
    Geofence selectGeofenceByName(@Param("name") String name, @Param("excludeId") Long excludeId);
} 