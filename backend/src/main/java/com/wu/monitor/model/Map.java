package com.wu.monitor.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Map {
    private Long id;
    private Long mapId;
    private String name;
    private String imagePath;
    private Integer width;
    private Integer height;
    private Integer originX;
    private Integer originY;
    private Double scale;
    private Integer point1X;
    private Integer point1Y;
    private Integer point2X;
    private Integer point2Y;
    private Double realDistance;
    private LocalDateTime createTime;
}