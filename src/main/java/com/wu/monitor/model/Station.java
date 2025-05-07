package com.wu.monitor.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Station {
    private Long id;
    private String code;
    private String name;
    private String macAddress;
    private String ipAddress;
    private String model;
    private String firmwareVersion;
    private Long mapId;
    private Double positionX;
    private Double positionY;
    private Double positionZ;
    private Double orientation;
    private Integer status;
    private LocalDateTime lastCommunication;
    private LocalDateTime createTime;
    private String remark;
    
    // 关联的地图名称（非数据库字段，用于前端显示）
    private String mapName;
} 