package com.wu.monitor.model;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class TrackingData {
    // 设备标识 - 输入时使用tag_mac，输出时使用mac
    @JsonProperty("tag_mac")
    private String deviceId;
    
    // 坐标信息
    @JsonProperty("x")
    private Double x;
    
    @JsonProperty("y")
    private Double y;
    
    // 信号和电量信息
    @JsonProperty("rssi")
    private Integer rssi;
    
    @JsonProperty("battery")
    private Integer battery;
    
    // 地图ID
    @JsonProperty("map_id")
    private Integer mapId;
    
    // 时间戳
    @JsonProperty("timestamp")
    private String timestamp;
    
    // 获取设备ID（兼容DTO输出）
    @JsonProperty("mac")
    public String getMac() {
        return this.deviceId;
    }
    
    // 设置设备ID（兼容DTO输入）
    public void setMac(String mac) {
        this.deviceId = mac != null ? mac.toLowerCase() : null;
    }
    
    // 获取时间戳
    public String getTimestamp() {
        return timestamp;
    }
    
    // 设置时间戳
    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
    
    // 重写setDeviceId方法，确保MAC地址统一为小写
    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId != null ? deviceId.toLowerCase() : null;
    }
} 