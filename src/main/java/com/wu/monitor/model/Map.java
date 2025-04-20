package com.wu.monitor.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Map {
    private Long id;
    private String mapId;  // 已经存在，不需要修改
    private String name;
    private String imagePath;
    private Double xMin;
    private Double xMax;
    private Double yMin;
    private Double yMax;
    private LocalDateTime createTime;
}