package com.wu.monitor.controller;
import com.wu.monitor.model.Path;
import com.wu.monitor.model.PathDataDto;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public class PathProcessor {
    public static PathDataDto convertToDto(Path path) {
        PathDataDto dto = new PathDataDto();
        dto.setMac(path.getDeviceId());
        dto.setX(path.getX());
        dto.setY(path.getY());
        dto.setTimestamp(changeTime(path.getRawTimestamp()));
        return dto;
    }

    public static String changeTime(String t){
        // 提取整数秒部分
        long seconds = Long.parseLong(t.split("\\.")[0]);

        // 转换为 Instant（仅秒级）
        Instant instant = Instant.ofEpochSecond(seconds);

        // 定义日期时间格式（到秒）
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        // UTC 时间
        String utcTime = instant.atZone(ZoneId.of("UTC"))
                .format(formatter);
        return utcTime;
    }
}