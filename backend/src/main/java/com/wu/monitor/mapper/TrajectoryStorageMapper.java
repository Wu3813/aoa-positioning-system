package com.wu.monitor.mapper;

import com.wu.monitor.model.TrajectoryRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Mapper
public interface TrajectoryStorageMapper {
    
    /**
     * 批量插入轨迹存储记录
     */
    void insertBatch(@Param("records") List<TrajectoryRecord> records);
    
    /**
     * 查询设备历史轨迹存储记录（分页）
     */
    List<TrajectoryRecord> selectByDeviceId(@Param("deviceId") String deviceId, 
                                           @Param("mapId") Integer mapId,
                                           @Param("startTime") LocalDateTime startTime,
                                           @Param("endTime") LocalDateTime endTime,
                                           @Param("offset") int offset,
                                           @Param("limit") int limit);
    
    /**
     * 创建轨迹存储分区（按天）
     */
    void createPartition(@Param("date") LocalDate date);
    
    /**
     * 删除轨迹存储分区（按天）
     */
    void dropPartition(@Param("date") LocalDate date);
    
    /**
     * 获取最旧的分区日期
     */
    LocalDate getOldestPartitionDate();
    
    /**
     * 检查轨迹存储分区是否存在
     */
    int checkPartitionExists(@Param("partitionName") String partitionName);
    
    /**
     * 获取数据库磁盘使用信息
     */
    Map<String, Object> getDiskSpaceInfo();
}