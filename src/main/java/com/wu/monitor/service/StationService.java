package com.wu.monitor.service;

import com.wu.monitor.model.Station;
import java.util.List;

public interface StationService {
    /**
     * 获取所有基站
     * @param code 基站编号（可选）
     * @param name 基站名称（可选）
     * @param status 基站状态（可选）
     * @return 基站列表
     */
    List<Station> getAllStations(String code, String name, Integer status);
    
    /**
     * 根据ID获取基站
     * @param id 基站ID
     * @return 基站信息
     */
    Station getStationById(Long id);
    
    /**
     * 创建基站
     * @param station 基站信息
     * @return 创建后的基站信息
     */
    Station createStation(Station station);
    
    /**
     * 更新基站
     * @param id 基站ID
     * @param station 基站信息
     * @return 更新后的基站信息
     */
    Station updateStation(Long id, Station station);
    
    /**
     * 删除基站
     * @param id 基站ID
     */
    void deleteStation(Long id);
    
    /**
     * 批量删除基站
     * @param ids 基站ID列表
     */
    void batchDeleteStations(List<Long> ids);
    
    /**
     * 获取指定地图下的所有基站
     * @param mapId 地图ID
     * @return 基站列表
     */
    List<Station> getStationsByMapId(Long mapId);
    
    /**
     * 更新基站状态
     * @param id 基站ID
     * @param status 状态
     * @return 更新后的基站信息
     */
    Station updateStationStatus(Long id, Integer status);
} 