package com.wu.monitor.service.impl;

import com.wu.monitor.mapper.TrajectoryStorageMapper;
import com.wu.monitor.model.TrackingData;
import com.wu.monitor.model.TrajectoryRecord;
import com.wu.monitor.service.TrajectoryStorageService;
import com.wu.monitor.util.TimestampUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrajectoryStorageServiceImpl implements TrajectoryStorageService {
    
    private final RedisTemplate<String, Object> redisTemplate;
    private final TrajectoryStorageMapper trajectoryStorageMapper;
    
    // Redis key前缀
    private static final String DEVICE_HISTORY_PREFIX = "device:history:";
    
    @Override
    public void processAndStore() {
        try {
            // 获取所有活跃设备
            Set<Object> activeDevices = redisTemplate.opsForSet().members("active:devices");
            if (activeDevices == null || activeDevices.isEmpty()) {
                return;
            }
            
            List<TrajectoryRecord> records = new ArrayList<>();
            
            for (Object device : activeDevices) {
                String deviceId = (String) device;
                
                // 处理设备最新数据
                TrajectoryRecord record = processDeviceLatestData(deviceId);
                if (record != null) {
                    records.add(record);
                }
            }
            
            if (!records.isEmpty()) {
                // 确保分区存在
                records.forEach(record -> ensurePartitionExists(record.getTimestamp()));
                
                // 批量插入数据库
                trajectoryStorageMapper.insertBatch(records);
                log.info("成功存储 {} 条轨迹记录", records.size());
            }
            
        } catch (Exception e) {
            log.error("处理轨迹数据异常", e);
        }
    }
    
    /**
     * 处理单个设备的最新数据
     */
    private TrajectoryRecord processDeviceLatestData(String deviceId) {
        try {
            // 从Redis获取最新数据（索引0是最新的）
            Object latestData = redisTemplate.opsForList().index(
                DEVICE_HISTORY_PREFIX + deviceId, 0);
            
            if (latestData == null || !(latestData instanceof TrackingData)) {
                return null;
            }
            
            TrackingData trackingData = (TrackingData) latestData;
            
            // 转换为TrajectoryRecord
            TrajectoryRecord record = convertToTrajectoryRecord(deviceId, trackingData);
            
            // 处理完成后完全清空Redis历史数据
            redisTemplate.delete(DEVICE_HISTORY_PREFIX + deviceId);
            
            // 记录日志
            log.info("设备 {} 存储了一条最新轨迹数据，时间: {}", deviceId, LocalDateTime.now());
            
            return record;
            
        } catch (Exception e) {
            log.error("处理设备 {} 数据异常", deviceId, e);
            return null;
        }
    }
    
    /**
     * 将单个TrackingData转换为TrajectoryRecord
     */
    private TrajectoryRecord convertToTrajectoryRecord(String deviceId, TrackingData data) {
        if (data.getTimestamp() == null) {
            log.warn("设备 {} 的时间戳为空，丢弃该条轨迹数据", deviceId);
            return null;
        }
        
        // 校验时间戳格式
        if (!isValidTimestampFormat(data.getTimestamp())) {
            log.error("设备 {} 的时间戳格式不正确: {}，丢弃该条轨迹数据", deviceId, data.getTimestamp());
            return null;
        }
            
        try {
            LocalDateTime timestamp = TimestampUtils.parseTimestamp(data.getTimestamp());
            TrajectoryRecord record = new TrajectoryRecord();
            record.setDeviceId(deviceId);
            record.setMapId(data.getMapId());
            record.setTimestamp(timestamp);
            record.setX(data.getX());
            record.setY(data.getY());
            record.setRssi(data.getRssi());
            record.setBattery(data.getBattery());
            record.setPointCount(1); // 每条记录只包含一个点
            
            return record;
                
        } catch (Exception e) {
            log.error("转换轨迹数据异常: {}", e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * 校验时间戳格式是否正确
     * @param timestamp 时间戳字符串
     * @return 如果格式正确返回true，否则返回false
     */
    private boolean isValidTimestampFormat(String timestamp) {
        if (timestamp == null || timestamp.trim().isEmpty()) {
            return false;
        }
        
        try {
            // 检查是否为纯数字（Unix时间戳）
            if (timestamp.matches("^\\d+(\\.\\d+)?$")) {
                // 验证时间戳是否在合理范围内（1970年到2100年）
                String[] parts = timestamp.split("\\.");
                long seconds = Long.parseLong(parts[0]);
                
                // 1970年1月1日到2100年12月31日的时间范围
                long minSeconds = 0L; // 1970-01-01 00:00:00
                long maxSeconds = 4102444800L; // 2100-01-01 00:00:00
                
                if (seconds < minSeconds || seconds > maxSeconds) {
                    log.warn("时间戳 {} 超出合理范围 ({} - {})", timestamp, minSeconds, maxSeconds);
                    return false;
                }
                
                return true;
            }
            
            // 如果不是纯数字格式，记录警告并返回false
            log.warn("时间戳 {} 不是有效的Unix时间戳格式", timestamp);
            return false;
            
        } catch (Exception e) {
            log.error("校验时间戳格式时发生异常: {}", e.getMessage(), e);
            return false;
        }
    }
    
    @Override
    public List<TrajectoryRecord> getDeviceTrajectory(String deviceId, 
                                                    Integer mapId,
                                                    LocalDateTime startTime, 
                                                    LocalDateTime endTime, 
                                                    int page, int size) {
        log.info("开始查询设备历史轨迹: 设备ID={}, 地图ID={}, 开始时间={}, 结束时间={}, page={}, size={}", 
                deviceId, mapId, startTime, endTime, page, size);
        
        int offset = page * size;
        
        // 直接使用传入的原始时间，不做任何转换处理
        List<TrajectoryRecord> records = trajectoryStorageMapper.selectByDeviceId(deviceId, mapId, startTime, endTime, offset, size);
        log.info("数据库查询结果: 找到{}条记录", records.size());
        
        // 查询后输出第一条和最后一条记录的时间，便于调试
        if (!records.isEmpty()) {
            TrajectoryRecord first = records.get(0);
            TrajectoryRecord last = records.get(records.size() - 1);
            log.info("查询到的数据范围: 第一条={}, 最后一条={}", 
                    first.getTimestamp(), last.getTimestamp());
        }
        
        // 确保按时间戳正序排序（从最早到最晚）
        records.sort((a, b) -> {
            if (a.getTimestamp() == null && b.getTimestamp() == null) return 0;
            if (a.getTimestamp() == null) return 1;
            if (b.getTimestamp() == null) return -1;
            return a.getTimestamp().compareTo(b.getTimestamp());
        });
        
        return records;
    }
    
    @Override
    public void ensurePartitionExists(LocalDateTime timestamp) {
        try {
            int year = timestamp.getYear();
            int month = timestamp.getMonthValue();
            
            String partitionName = String.format("p%d%02d", year, month);
            
            // 检查分区是否存在
            int exists = trajectoryStorageMapper.checkPartitionExists(partitionName);
            if (exists == 0) {
                // 创建分区
                trajectoryStorageMapper.createPartition(year, month);
                log.info("自动创建分区: {}", partitionName);
            }
            
        } catch (Exception e) {
            log.error("创建分区异常", e);
        }
    }
} 