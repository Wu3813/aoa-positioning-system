package com.wu.monitor.service.impl;

import com.wu.monitor.model.TrackingData;
import com.wu.monitor.mapper.TagMapper;
import com.wu.monitor.service.AlarmService;
import com.wu.monitor.service.RealTimeTrackingService;
import com.wu.monitor.service.TagService;
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
    private final TagService tagService;
    private final TagMapper tagMapper;
    private final AlarmService alarmService; // 添加AlarmService依赖
    
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
    public void receiveTrackingData(TrackingData trackingData) {
        try {
            if (trackingData == null || trackingData.getTimestamp() == null) {
                log.warn("接收到空数据或时间戳为空的数据: {}", trackingData);
                return;
            }
            
            String deviceId = trackingData.getDeviceId();
                 // 先立即推送到前端，减少实时显示延迟
        messagingTemplate.convertAndSend("/topic/pathData", trackingData);
        
        // 异步处理存储操作，避免阻塞实时推送
        CompletableFuture.runAsync(() -> {
            try {
                // 检查标签是否已登记，如果未登记则不存储但不影响前端显示
                if (!isTagRegistered(deviceId)) {
                    log.debug("标签 {} 未在标签管理中登记，跳过存储操作", deviceId);
                    return;
                }
                
                // 保存最新位置
                redisTemplate.opsForValue().set(
                    DEVICE_LATEST_PREFIX + deviceId, 
                    trackingData,
                    DATA_EXPIRE_TIME,
                    TimeUnit.SECONDS
                );
                
                // 保存到历史记录
                redisTemplate.opsForList().leftPush(DEVICE_HISTORY_PREFIX + deviceId, trackingData);
                redisTemplate.opsForList().trim(DEVICE_HISTORY_PREFIX + deviceId, 0, 499); // 保留最近500条记录
                
                // 添加到活跃设备集合
                redisTemplate.opsForSet().add(ACTIVE_DEVICES_KEY, deviceId);
                
                // 根据MAC地址更新标签状态和位置信息
                updateTagFromTrackingData(trackingData);
                
                // 检查围栏告警 - 添加围栏检测逻辑
                if (trackingData.getMapId() != null) {
                    // 不再需要额外的同步，AlarmServiceImpl内部已经有锁机制
                    alarmService.checkGeofenceIntrusion(trackingData);
                }
                
            } catch (Exception e) {
                log.error("异步处理存储操作异常: {}", e.getMessage(), e);
            }
        }, executorService);
        } catch (Exception e) {
            log.error("处理单条轨迹数据异常", e);
        }
    }
    
    @Override
    public void receiveBatchTrackingData(List<TrackingData> trackingDataList) {
        if (trackingDataList == null || trackingDataList.isEmpty()) {
            log.warn("接收到空批量数据");
            return;
        }
        
        log.info("接收批量数据: {} 条", trackingDataList.size());
        
        // 分批处理大量数据
        int totalSize = trackingDataList.size();
        int batchCount = (totalSize + BATCH_SIZE - 1) / BATCH_SIZE; // 向上取整
        
        List<CompletableFuture<Void>> futures = new ArrayList<>();
        
        for (int i = 0; i < batchCount; i++) {
            final int startIdx = i * BATCH_SIZE;
            final int endIdx = Math.min(startIdx + BATCH_SIZE, totalSize);
            List<TrackingData> batch = trackingDataList.subList(startIdx, endIdx);
            
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
    
    private void processBatch(List<TrackingData> batch) {
        try {
            for (TrackingData trackingData : batch) {
                if (trackingData != null && trackingData.getTimestamp() != null) {
                    receiveTrackingData(trackingData);
                }
            }
        } catch (Exception e) {
            log.error("处理批量数据异常", e);
        }
    }
    
    @Override
    public TrackingData getLatestPosition(String deviceId) {
        try {
            // 确保MAC地址统一为小写
            if (deviceId != null) {
                deviceId = deviceId.toLowerCase();
            }
            
            return (TrackingData) redisTemplate.opsForValue().get(DEVICE_LATEST_PREFIX + deviceId);
        } catch (ClassCastException e) {
            log.error("类型转换异常: {}", e.getMessage());
            // 从Redis中获取原始数据
            Object rawData = redisTemplate.opsForValue().get(DEVICE_LATEST_PREFIX + deviceId);
            log.warn("原始数据类型: {}", rawData != null ? rawData.getClass().getName() : "null");
            return null;
        }
    }
    
    @Override
    public List<TrackingData> getDeviceHistory(String deviceId, int limit) {
        // 确保MAC地址统一为小写
        if (deviceId != null) {
            deviceId = deviceId.toLowerCase();
        }
        
        List<Object> history = redisTemplate.opsForList().range(
            DEVICE_HISTORY_PREFIX + deviceId,
            0,
            limit - 1
        );
        
        List<TrackingData> result = new ArrayList<>();
        if (history != null) {
            for (Object item : history) {
                try {
                    result.add((TrackingData) item);
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
        // 确保MAC地址统一为小写
        if (deviceId != null) {
            deviceId = deviceId.toLowerCase();
        }
        
        redisTemplate.delete(DEVICE_LATEST_PREFIX + deviceId);
        redisTemplate.delete(DEVICE_HISTORY_PREFIX + deviceId);
        redisTemplate.opsForSet().remove(ACTIVE_DEVICES_KEY, deviceId);
    }
    
    /**
     * 检查标签是否已在标签管理中登记
     * @param macAddress MAC地址
     * @return 是否已登记
     */
    private boolean isTagRegistered(String macAddress) {
        try {
            // 确保MAC地址统一为小写
            if (macAddress != null) {
                macAddress = macAddress.toLowerCase();
            }
            
            // 通过TagMapper直接查询数据库
            return tagMapper.selectTagByMacAddress(macAddress) != null;
        } catch (Exception e) {
            log.error("检查标签登记状态异常: {}", e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * 根据跟踪数据更新标签状态
     * @param trackingData 跟踪数据
     */
    private void updateTagFromTrackingData(TrackingData trackingData) {
        try {
            String macAddress = trackingData.getDeviceId(); // deviceId即为MAC地址
            // 确保MAC地址统一为小写
            if (macAddress != null) {
                macAddress = macAddress.toLowerCase();
            }
            
            Double positionX = trackingData.getX();
            Double positionY = trackingData.getY();
            Double positionZ = 0.0; // 默认Z坐标为0，如果需要可以扩展
            Integer rssi = trackingData.getRssi();
            Integer batteryLevel = trackingData.getBattery();
            Integer mapId = trackingData.getMapId(); // 从JSON数据中获取地图ID
            
            // 调用标签服务更新标签状态
            boolean updated = tagService.updateTagStatusByMac(
                macAddress, 
                rssi, 
                positionX, 
                positionY, 
                positionZ, 
                batteryLevel,
                mapId
            );
            
            if (updated) {
                log.debug("成功更新标签状态: MAC={}, X={}, Y={}, RSSI={}, Battery={}, MapId={}", 
                         macAddress, positionX, positionY, rssi, batteryLevel, mapId);
            } else {
                log.debug("标签不存在或更新失败: MAC={}", macAddress);
            }
        } catch (Exception e) {
            log.error("更新标签状态异常: {}", e.getMessage(), e);
        }
    }
    
    // 定时清理过期数据
    @Scheduled(fixedRate = 3600000) // 每小时执行一次
    public void scheduleCleanup() {
        List<String> activeDevices = getActiveDevices();
        for (String deviceId : activeDevices) {
            TrackingData latest = getLatestPosition(deviceId);
            if (latest == null) {
                cleanExpiredData(deviceId);
            }
        }
    }
}