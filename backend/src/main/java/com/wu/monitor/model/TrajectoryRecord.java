package com.wu.monitor.model;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonGetter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

@Data
public class TrajectoryRecord {
    private Long id;
    
    @JsonIgnore  // 不直接序列化 byte[] 到 JSON
    private byte[] deviceId;  // MAC地址，6字节二进制
    
    private Integer mapId;
    private LocalDateTime timestamp;
    private Float x;  // 改为Float降低精度节省空间
    private Float y;  // 改为Float降低精度节省空间
    
    /**
     * 用于 JSON 序列化的 deviceId getter
     * 将 byte[] 转换为 MAC 地址字符串格式
     */
    @JsonGetter("deviceId")
    public String getDeviceIdAsString() {
        return macBytesToString(deviceId);
    }
    
    public TrajectoryRecord() {}
    
    public TrajectoryRecord(String deviceId, TrackingData trackingData) {
        this.deviceId = macStringToBytes(deviceId);
        this.mapId = trackingData.getMapId();
        this.timestamp = parseTimestamp(trackingData.getTimestamp());
        this.x = trackingData.getX() != null ? trackingData.getX().floatValue() : null;
        this.y = trackingData.getY() != null ? trackingData.getY().floatValue() : null;
    }
    
    /**
     * 将MAC地址字符串转换为6字节数组
     * 支持两种格式: 
     * 1. "AA:BB:CC:DD:EE:FF" (带冒号)
     * 2. "aabbccddeeff" (不带冒号)
     */
    public static byte[] macStringToBytes(String mac) {
        if (mac == null || mac.isEmpty()) {
            return new byte[6];
        }
        
        try {
            // 移除所有可能的分隔符（冒号、短横线、空格）
            String cleanMac = mac.replaceAll("[:\\-\\s]", "").toLowerCase();
            
            // 检查长度是否为12个字符（6字节 * 2个十六进制字符）
            if (cleanMac.length() != 12) {
                return new byte[6];
            }
            
            byte[] bytes = new byte[6];
            for (int i = 0; i < 6; i++) {
                String hexByte = cleanMac.substring(i * 2, i * 2 + 2);
                bytes[i] = (byte) Integer.parseInt(hexByte, 16);
            }
            return bytes;
        } catch (Exception e) {
            return new byte[6];
        }
    }
    
    /**
     * 将6字节数组转换为MAC地址字符串
     * byte[6] -> "AA:BB:CC:DD:EE:FF"
     */
    public static String macBytesToString(byte[] bytes) {
        if (bytes == null || bytes.length != 6) {
            return "";
        }
        
        StringBuilder sb = new StringBuilder(17);
        for (int i = 0; i < 6; i++) {
            if (i > 0) {
                sb.append(':');
            }
            sb.append(String.format("%02X", bytes[i] & 0xFF));
        }
        return sb.toString();
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