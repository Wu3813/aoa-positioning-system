package com.wu.monitor.service.impl;

import com.wu.monitor.controller.PathProcessor;
import com.wu.monitor.model.Path;
import com.wu.monitor.model.PathDataDto;
import com.wu.monitor.service.RealTimeTrackingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class RealTimeTrackingServiceImpl implements RealTimeTrackingService {
    
    private final RedisTemplate<String, Object> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    
    // Redis key 前缀
    private static final String DEVICE_LATEST_PREFIX = "device:latest:";
    private static final String DEVICE_HISTORY_PREFIX = "device:history:";
    private static final String ACTIVE_DEVICES_KEY = "active:devices";
    
    // 数据过期时间（秒）
    private static final long DATA_EXPIRE_TIME = 3600; // 1小时
    
    // 创建固定大小的线程池，处理批量数据
    private ExecutorService executorService;
    
    // 批处理大小
    private static final int BATCH_SIZE = 50;
    
    @PostConstruct
    public void init() {
        // 创建一个适合处理高并发的线程池
        // 线程数设置为可用处理器数量的2倍，以处理IO密集型任务
        int processors = Runtime.getRuntime().availableProcessors();
        executorService = Executors.newFixedThreadPool(processors * 2);
        log.info("初始化线程池，线程数量: {}", processors * 2);
    }
    
    @Override
    public void receiveTrackingData(Path pathData) {
        try {
            if (pathData == null || pathData.getRawTimestamp() == null) {
                log.warn("接收到空数据或时间戳为空的数据: {}", pathData);
                return;
            }
            
            String deviceId = pathData.getDeviceId();
            PathDataDto dto = PathProcessor.convertToDto(pathData);
            
            // 保存最新位置
            redisTemplate.opsForValue().set(
                DEVICE_LATEST_PREFIX + deviceId, 
                dto,
                DATA_EXPIRE_TIME,
                TimeUnit.SECONDS
            );
            
            // 保存到历史记录
            redisTemplate.opsForList().leftPush(DEVICE_HISTORY_PREFIX + deviceId, dto);
            redisTemplate.opsForList().trim(DEVICE_HISTORY_PREFIX + deviceId, 0, 499); // 保留最近500条记录
            
            // 添加到活跃设备集合
            redisTemplate.opsForSet().add(ACTIVE_DEVICES_KEY, deviceId);
            
            // 通过WebSocket推送到前端
            messagingTemplate.convertAndSend("/topic/pathData", dto);
        } catch (Exception e) {
            log.error("处理单条轨迹数据异常", e);
        }
    }
    
    @Override
    public void receiveBatchTrackingData(List<Path> pathDataList) {
        if (pathDataList == null || pathDataList.isEmpty()) {
            log.warn("接收到空批量数据");
            return;
        }
        
        log.info("接收批量数据: {} 条", pathDataList.size());
        
        // 分批处理大量数据
        int totalSize = pathDataList.size();
        int batchCount = (totalSize + BATCH_SIZE - 1) / BATCH_SIZE; // 向上取整
        
        List<CompletableFuture<Void>> futures = new ArrayList<>();
        
        for (int i = 0; i < batchCount; i++) {
            final int startIdx = i * BATCH_SIZE;
            final int endIdx = Math.min(startIdx + BATCH_SIZE, totalSize);
            List<Path> batch = pathDataList.subList(startIdx, endIdx);
            
            // 异步处理每个批次
            CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                processBatch(batch);
            }, executorService);
            
            futures.add(future);
        }
        
        // 等待所有批次处理完成
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
            .exceptionally(ex -> {
                log.error("批量处理发生异常", ex);
                return null;
            });
    }
    
    private void processBatch(List<Path> batch) {
        try {
            for (Path path : batch) {
                if (path != null && path.getRawTimestamp() != null) {
                    receiveTrackingData(path);
                }
            }
        } catch (Exception e) {
            log.error("处理批量数据异常", e);
        }
    }
    
    @Override
    public PathDataDto getLatestPosition(String deviceId) {
        try {
            return (PathDataDto) redisTemplate.opsForValue().get(DEVICE_LATEST_PREFIX + deviceId);
        } catch (ClassCastException e) {
            log.error("类型转换异常: {}", e.getMessage());
            // 从Redis中获取原始数据
            Object rawData = redisTemplate.opsForValue().get(DEVICE_LATEST_PREFIX + deviceId);
            log.warn("原始数据类型: {}", rawData != null ? rawData.getClass().getName() : "null");
            return null;
        }
    }
    
    @Override
    public List<PathDataDto> getDeviceHistory(String deviceId, int limit) {
        List<Object> history = redisTemplate.opsForList().range(
            DEVICE_HISTORY_PREFIX + deviceId,
            0,
            limit - 1
        );
        
        List<PathDataDto> result = new ArrayList<>();
        if (history != null) {
            for (Object item : history) {
                try {
                    result.add((PathDataDto) item);
                } catch (ClassCastException e) {
                    log.error("历史数据类型转换异常: {}", e.getMessage());
                }
            }
        }
        return result;
    }
    
    @Override
    public List<String> getActiveDevices() {
        Set<Object> devices = redisTemplate.opsForSet().members(ACTIVE_DEVICES_KEY);
        List<String> result = new ArrayList<>();
        if (devices != null) {
            devices.forEach(device -> result.add((String) device));
        }
        return result;
    }
    
    @Override
    public void cleanExpiredData(String deviceId) {
        redisTemplate.delete(DEVICE_LATEST_PREFIX + deviceId);
        redisTemplate.delete(DEVICE_HISTORY_PREFIX + deviceId);
        redisTemplate.opsForSet().remove(ACTIVE_DEVICES_KEY, deviceId);
    }
    
    // 定时清理过期数据
    @Scheduled(fixedRate = 3600000) // 每小时执行一次
    public void scheduleCleanup() {
        List<String> activeDevices = getActiveDevices();
        for (String deviceId : activeDevices) {
            PathDataDto latest = getLatestPosition(deviceId);
            if (latest == null) {
                cleanExpiredData(deviceId);
            }
        }
    }
}