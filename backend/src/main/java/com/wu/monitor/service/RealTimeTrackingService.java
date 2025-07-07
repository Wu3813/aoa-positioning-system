package com.wu.monitor.service;

import com.wu.monitor.model.TrackingData;
import java.util.List;

public interface RealTimeTrackingService {
    // 接收新的轨迹数据
    void receiveTrackingData(TrackingData pathData);
    
    // 批量接收轨迹数据
    void receiveBatchTrackingData(List<TrackingData> pathDataList);
    
    // 获取指定设备的最新位置
    TrackingData getLatestPosition(String deviceId);
    
    // 获取指定设备的历史轨迹
    List<TrackingData> getDeviceHistory(String deviceId, int limit);
    
    // 获取所有活跃设备的ID
    List<String> getActiveDevices();
    
    // 清除过期数据
    void cleanExpiredData(String deviceId);
}