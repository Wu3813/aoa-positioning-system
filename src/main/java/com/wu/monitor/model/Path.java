package com.wu.monitor.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;


@Data
public class Path {
    // 核心字段
    @JsonProperty("tag_mac")
    private String deviceId;

    @JsonProperty("x")
    private Double x;

    @JsonProperty("y")
    private Double y;

    @JsonProperty("z")
    private Double z;

    // 标准差字段（处理"null"字符串）
    @JsonProperty("x_stdev")
    private Double xStdev;

    @JsonProperty("y_stdev")
    private Double yStdev;

    @JsonProperty("z_stdev")
    private Double zStdev;

    // 原始时间戳字段（用于接收JSON中的字符串）
    @JsonProperty("timestamp")
    private String rawTimestamp;

}
