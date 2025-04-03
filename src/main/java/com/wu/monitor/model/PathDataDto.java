package com.wu.monitor.model;

import lombok.Data;
@Data
public class PathDataDto {

    private String mac;
    private Double x;
    private Double y;
    private String timestamp; // 或使用 LocalDateTime 类型


}
