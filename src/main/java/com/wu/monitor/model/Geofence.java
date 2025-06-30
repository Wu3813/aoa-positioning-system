package com.wu.monitor.model;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class Geofence {
    private Long id;
    private String name;                    // 围栏名称  
    private Long mapId;                     // 对应的地图ID
    private String coordinates;             // 坐标点JSON字符串，格式：[{"x":1.0,"y":2.0},{"x":3.0,"y":4.0}]
    private Boolean enabled;                // 是否启用
    private LocalDateTime createTime;       // 创建时间
    private String remark;                  // 备注
    
    // 非数据库字段，用于前端传输
    private String mapName;                 // 地图名称
    private List<GeofencePoint> points;     // 坐标点列表
    
    @Data
    public static class GeofencePoint {
        private Double x;
        private Double y;
    }
} 