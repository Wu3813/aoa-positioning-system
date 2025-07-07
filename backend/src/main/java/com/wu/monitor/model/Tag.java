package com.wu.monitor.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Tag {
    private Long id;
    private String name;
    private String macAddress;
    private String model;
    private String firmwareVersion;
    private Long mapId;
    private Integer rssi;
    private Double positionX;
    private Double positionY;
    private Double positionZ;
    private Integer batteryLevel;
    private Integer status;  // 0-离线，1-在线
    private LocalDateTime lastSeen;
    private LocalDateTime createTime;
    private String remark;
} 