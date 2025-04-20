package com.wu.monitor.controller;
import com.wu.monitor.model.Path;
import com.wu.monitor.model.PathDataDto;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PathProcessor {
    private static final Logger logger = LoggerFactory.getLogger(PathProcessor.class);
    
    public static PathDataDto convertToDto(Path path) {
        PathDataDto dto = new PathDataDto();
        dto.setMac(path.getDeviceId());
        dto.setX(path.getX());
        dto.setY(path.getY());
        
        try {
            dto.setTimestamp(changeTime(path.getRawTimestamp()));
        } catch (Exception e) {
            logger.error("转换时间戳失败: {}", path.getRawTimestamp(), e);
            // 设置为当前时间作为默认值
            dto.setTimestamp(getCurrentTime());
        }
        
        return dto;
    }

    public static String changeTime(String t){
        if (t == null || t.isEmpty()) {
            logger.warn("时间戳为空");
            return getCurrentTime();
        }
        
        try {
            // 提取整数秒部分
            String[] parts = t.split("\\.");
            if (parts.length == 0) {
                return getCurrentTime();
            }
            
            long seconds = Long.parseLong(parts[0]);

            // 转换为 Instant（仅秒级）
            Instant instant = Instant.ofEpochSecond(seconds);

            // 定义日期时间格式（到秒）
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

            // UTC 时间
            return instant.atZone(ZoneId.of("UTC"))
                    .format(formatter);
        } catch (Exception e) {
            logger.error("解析时间戳失败: {}", t, e);
            return getCurrentTime();
        }
    }
    
    /**
     * 获取当前UTC时间作为默认值
     */
    private static String getCurrentTime() {
        Instant now = Instant.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        return now.atZone(ZoneId.of("UTC")).format(formatter);
    }
}