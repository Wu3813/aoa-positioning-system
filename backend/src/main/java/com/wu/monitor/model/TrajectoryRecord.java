package com.wu.monitor.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TrajectoryRecord {
    private Long id;
    private String deviceId;
    private Integer mapId;
    private LocalDateTime timestamp;
    private Float x;  // 改为Float降低精度节省空间
    private Float y;  // 改为Float降低精度节省空间
    private Integer rssi;
    private Integer battery;
    
    public TrajectoryRecord() {}
    
    public TrajectoryRecord(String deviceId, TrackingData trackingData) {
        this.deviceId = deviceId;
        this.mapId = trackingData.getMapId();
        this.timestamp = parseTimestamp(trackingData.getTimestamp());
        this.x = trackingData.getX() != null ? trackingData.getX().floatValue() : null;
        this.y = trackingData.getY() != null ? trackingData.getY().floatValue() : null;
        this.rssi = trackingData.getRssi();
        this.battery = trackingData.getBattery();
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
    
} 