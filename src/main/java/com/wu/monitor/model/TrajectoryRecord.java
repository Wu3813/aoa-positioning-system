package com.wu.monitor.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TrajectoryRecord {
    private Long id;
    private String deviceId;
    private Integer mapId;
    private LocalDateTime timestamp;
    private Double x;
    private Double y;
    private Integer rssi;
    private Integer battery;
    private Integer pointCount;
    
    public TrajectoryRecord() {}
    
    public TrajectoryRecord(String deviceId, TrackingData trackingData) {
        this.deviceId = deviceId;
        this.mapId = trackingData.getMapId();
        this.timestamp = parseTimestamp(trackingData.getTimestamp());
        this.x = trackingData.getX();
        this.y = trackingData.getY();
        this.rssi = trackingData.getRssi();
        this.battery = trackingData.getBattery();
        this.pointCount = 1;
    }
    
    /**
     * 解析时间戳
     */
    private LocalDateTime parseTimestamp(String timestamp) {
        if (timestamp == null || timestamp.isEmpty()) {
            return LocalDateTime.now();
        }
        
        try {
            String[] parts = timestamp.split("\\.");
            if (parts.length == 0) {
                return LocalDateTime.now();
            }
            
            long seconds = Long.parseLong(parts[0]);
            return LocalDateTime.ofEpochSecond(seconds, 0, java.time.ZoneOffset.UTC);
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }
    
    /**
     * 合并另一个轨迹点
     */
    public void merge(TrackingData other) {
        // 更新为最新的位置信息
        this.x = other.getX();
        this.y = other.getY();
        this.rssi = other.getRssi();
        this.battery = other.getBattery();
        this.timestamp = parseTimestamp(other.getTimestamp());
        this.pointCount++;
    }
} 