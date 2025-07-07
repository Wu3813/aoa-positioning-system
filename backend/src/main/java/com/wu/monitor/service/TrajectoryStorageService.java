package com.wu.monitor.service;

import com.wu.monitor.model.TrajectoryRecord;
import java.time.LocalDateTime;
import java.util.List;

public interface TrajectoryStorageService {
    

    void processAndStore();
    
    /**
     * 查询设备历史轨迹
     */
    List<TrajectoryRecord> getDeviceTrajectory(String deviceId, 
                                             Integer mapId,
                                             LocalDateTime startTime, 
                                             LocalDateTime endTime, 
                                             int page, int size);
    
    /**
     * 确保分区存在
     */
    void ensurePartitionExists(LocalDateTime timestamp);
} 