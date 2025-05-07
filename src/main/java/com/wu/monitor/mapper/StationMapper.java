package com.wu.monitor.mapper;

import com.wu.monitor.model.Station;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.time.LocalDateTime;

@Mapper
public interface StationMapper {
    /**
     * 查询所有基站
     * @param code 基站编号（可选）
     * @param name 基站名称（可选）
     * @param status 基站状态（可选）
     * @return 基站列表
     */
    List<Station> selectAllStations(@Param("code") String code, 
                                   @Param("name") String name, 
                                   @Param("status") Integer status);
    
    /**
     * 根据ID查询基站
     * @param id 基站ID
     * @return 基站信息
     */
    Station selectStationById(@Param("id") Long id);
    
    /**
     * 根据MAC地址查询基站
     * @param macAddress MAC地址
     * @return 基站信息
     */
    Station selectStationByMacAddress(@Param("macAddress") String macAddress);
    
    /**
     * 根据编号查询基站
     * @param code 基站编号
     * @return 基站信息
     */
    Station selectStationByCode(@Param("code") String code);
    
    /**
     * 插入基站信息
     * @param station 基站信息
     * @return 影响行数
     */
    int insertStation(Station station);
    
    /**
     * 更新基站信息
     * @param station 基站信息
     * @return 影响行数
     */
    int updateStation(Station station);
    
    /**
     * 更新基站状态
     * @param id 基站ID
     * @param status 状态
     * @param lastCommunication 最后通信时间
     * @return 影响行数
     */
    int updateStationStatus(@Param("id") Long id, 
                           @Param("status") Integer status, 
                           @Param("lastCommunication") LocalDateTime lastCommunication);
    
    /**
     * 删除基站
     * @param id 基站ID
     * @return 影响行数
     */
    int deleteStationById(@Param("id") Long id);
    
    /**
     * 批量删除基站
     * @param ids 基站ID列表
     */
    void batchDeleteStations(@Param("ids") List<Long> ids);
    
    /**
     * 根据地图ID查询基站
     * @param mapId 地图ID
     * @return 基站列表
     */
    List<Station> selectStationsByMapId(@Param("mapId") Long mapId);
} 