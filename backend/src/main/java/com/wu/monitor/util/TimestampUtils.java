package com.wu.monitor.util;

import java.time.LocalDateTime;

/**
 * 时间戳工具类
 */
public class TimestampUtils {
    
    /**
     * 解析Unix时间戳为LocalDateTime
     * @param timestamp 时间戳字符串
     * @return 转换后的LocalDateTime对象
     */
    public static LocalDateTime parseTimestamp(String timestamp) {
        if (timestamp == null || timestamp.isEmpty()) {
            return LocalDateTime.now();
        }
        
        try {
            String[] parts = timestamp.split("\\.");
            if (parts.length == 0) {
                return LocalDateTime.now();
            }
            
            long seconds = Long.parseLong(parts[0]);
            return LocalDateTime.ofEpochSecond(seconds, 0, java.time.ZoneOffset.UTC);
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }
} 