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
    private LocalDateTime lastCommunication;
    private LocalDateTime createTime;
    private String remark;
} 