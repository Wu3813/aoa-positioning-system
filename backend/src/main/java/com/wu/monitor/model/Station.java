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
    private String positionX; // X轴加速度(十六进制)
    private String positionY; // Y轴加速度(十六进制)
    private String positionZ; // Z轴加速度(十六进制)
    private Double orientation;
    private Double coordinateX; // X坐标(米)
    private Double coordinateY; // Y坐标(米)
    private Double coordinateZ; // Z坐标(米)
    private Integer status;
    private Boolean scanEnabled;  // 扫描功能是否开启
    private Integer rssi;         // RSSI配置值(dBm)
    private String targetIp;      // 目标IP地址
    private Integer targetPort;   // 目标端口
    private String scanConfigType; // 扫描配置类型(config1/config2)
    private LocalDateTime lastCommunication;
    private LocalDateTime createTime;
    private String remark;
    
    // 关联的地图名称（非数据库字段，用于前端显示）
    private String mapName;
    
    // 自定义setter，确保MAC地址统一为小写
    public void setMacAddress(String macAddress) {
        this.macAddress = macAddress != null ? macAddress.toLowerCase() : null;
    }
} 