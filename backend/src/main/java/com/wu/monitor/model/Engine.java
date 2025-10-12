package com.wu.monitor.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Engine {
    private Long id;
    private String name;
    private String managementUrl;
    private Long mapId;
    private String mapName;
    private Integer status;
    private Integer configApiPort; // 配置API端口，用于构建完整的管理URL
    private LocalDateTime lastCommunication;
    private LocalDateTime lastConfigTime;
    private LocalDateTime createTime;
    private String remark;
    
    // 统计数据字段（不存储到数据库，仅用于前端显示）
    private Integer tagCount;
    private Integer stationCount;
} 