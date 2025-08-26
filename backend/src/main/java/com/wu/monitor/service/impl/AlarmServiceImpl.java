package com.wu.monitor.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wu.monitor.mapper.AlarmMapper;
import com.wu.monitor.mapper.GeofenceMapper;
import com.wu.monitor.mapper.MapMapper;
import com.wu.monitor.model.Alarm;
import com.wu.monitor.model.Geofence;
import com.wu.monitor.model.MapEntity;
import com.wu.monitor.model.TrackingData;
import com.wu.monitor.model.TaskConfig;
import com.wu.monitor.service.AlarmService;
import com.wu.monitor.service.TaskConfigService;
import com.wu.monitor.util.TimestampUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * 报警服务实现类
 */
@Service
public class AlarmServiceImpl implements AlarmService {

    private static final Logger logger = LoggerFactory.getLogger(AlarmServiceImpl.class);
    
    // 类级别的锁，用于同步所有围栏检测
    private static final ReentrantLock ALARM_LOCK = new ReentrantLock();

    @Autowired
    private AlarmMapper alarmMapper;
    
    @Autowired
    private GeofenceMapper geofenceMapper;
    
    @Autowired
    private MapMapper mapMapper;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private TaskConfigService taskConfigService;
    
    // 围栏缓存，避免频繁查询数据库
    private Map<Long, List<Geofence>> geofenceCache = new HashMap<>();
    
    // 地图缓存，避免频繁查询数据库
    private Map<Long, MapEntity> mapCache = new HashMap<>();
    
    // 活跃告警缓存，key格式: deviceId-geofenceId, value: 告警ID
    // 使用ConcurrentHashMap提高并发性能
    private static final Map<String, Long> activeAlarms = new ConcurrentHashMap<>();
    
    // 记录标签最后活动时间，key为标签ID，value为最后活动时间
    private static final Map<String, Long> lastActivityTime = new ConcurrentHashMap<>();
    
    // 围栏边界缓存，key为geofenceId，value为围栏边界信息
    private Map<Long, GeofenceBounds> geofenceBoundsCache = new HashMap<>();
    
    // 上次清理缓存的时间
    private long lastCacheCleanTime = System.currentTimeMillis();
    
    // 缓存清理间隔（30秒）
    private static final long CACHE_CLEAN_INTERVAL = 30 * 1000;
    
    // 标签超时时间（毫秒）- 将从配置中获取
    private long tagTimeout = 30000; // 默认30秒
    
    // 告警过期时间（毫秒）
    private static final long ALARM_EXPIRY_TIME = 5 * 60 * 1000; // 5分钟
    
    /**
     * 围栏边界信息，用于快速边界框检测
     */
    private static class GeofenceBounds {
        double minX;
        double minY;
        double maxX;
        double maxY;
        
        public GeofenceBounds(List<Geofence.GeofencePoint> points) {
            this.minX = Double.MAX_VALUE;
            this.minY = Double.MAX_VALUE;
            this.maxX = Double.MIN_VALUE;
            this.maxY = Double.MIN_VALUE;
            
            // 计算边界
            for (Geofence.GeofencePoint point : points) {
                if (point.getX() < minX) minX = point.getX();
                if (point.getY() < minY) minY = point.getY();
                if (point.getX() > maxX) maxX = point.getX();
                if (point.getY() > maxY) maxY = point.getY();
            }
        }
        
        /**
         * 检查点是否在边界框内
         */
        public boolean containsPoint(double x, double y) {
            return x >= minX && x <= maxX && y >= minY && y <= maxY;
        }
    }
    
    @Override
    public Map<String, Object> addAlarm(Alarm alarm) {
        Map<String, Object> result = new HashMap<>();
        try {
            // 如果未提供时间，设置为当前时间
            if (alarm.getTime() == null) {
                alarm.setTime(new Date());
            }
            
            int rows = alarmMapper.insert(alarm);
            result.put("success", rows > 0);
            result.put("message", rows > 0 ? "添加报警记录成功" : "添加报警记录失败");
            result.put("data", alarm);
        } catch (Exception e) {
            logger.error("添加报警记录失败: {}", e.getMessage());
            result.put("success", false);
            result.put("message", "添加报警记录异常: " + e.getMessage());
        }
        return result;
    }

    @Override
    public Map<String, Object> getAlarmById(Long id) {
        Map<String, Object> result = new HashMap<>();
        try {
            Alarm alarm = alarmMapper.selectById(id);
            result.put("success", true);
            result.put("data", alarm);
        } catch (Exception e) {
            logger.error("获取报警记录失败: {}", e.getMessage());
            result.put("success", false);
            result.put("message", "获取报警记录异常: " + e.getMessage());
        }
        return result;
    }

    @Override
    public Map<String, Object> getAllAlarms() {
        Map<String, Object> result = new HashMap<>();
        try {
            List<Alarm> alarms = alarmMapper.selectAll();
            result.put("success", true);
            result.put("data", alarms);
        } catch (Exception e) {
            logger.error("获取所有报警记录失败: {}", e.getMessage());
            result.put("success", false);
            result.put("message", "获取所有报警记录异常: " + e.getMessage());
        }
        return result;
    }

    @Override
    public Map<String, Object> getAlarmsByCondition(String geofenceName, Long mapId, Date startTime, Date endTime, String sortField, String sortOrder) {
        Map<String, Object> result = new HashMap<>();
        try {
            List<Alarm> alarms = alarmMapper.selectByCondition(geofenceName, mapId, startTime, endTime, sortField, sortOrder);
            result.put("success", true);
            result.put("data", alarms);
        } catch (Exception e) {
            logger.error("条件查询报警记录失败: {}", e.getMessage());
            result.put("success", false);
            result.put("message", "条件查询报警记录异常: " + e.getMessage());
        }
        return result;
    }

    @Override
    public Map<String, Object> deleteAlarm(Long id) {
        Map<String, Object> result = new HashMap<>();
        try {
            int rows = alarmMapper.deleteById(id);
            result.put("success", rows > 0);
            result.put("message", rows > 0 ? "删除报警记录成功" : "删除报警记录失败，可能记录不存在");
        } catch (Exception e) {
            logger.error("删除报警记录失败: {}", e.getMessage());
            result.put("success", false);
            result.put("message", "删除报警记录异常: " + e.getMessage());
        }
        return result;
    }
    
    @Override
    public Alarm checkGeofenceIntrusion(TrackingData trackingData) {
        if (trackingData == null || trackingData.getX() == null || 
            trackingData.getY() == null || trackingData.getMapId() == null) {
            return null;
        }
        
        // 清理缓存(如果需要)
        cleanCacheIfNeeded();
        
        // 获取地图ID
        Long mapId = trackingData.getMapId().longValue();
        
        // 获取该地图下所有启用的围栏
        List<Geofence> geofences = getGeofencesForMap(mapId);
        if (geofences.isEmpty()) {
            return null;
        }
        
        // 获取地图信息，用于坐标转换
        MapEntity mapInfo = getMapInfo(mapId);
        if (mapInfo == null) {
            logger.warn("未找到地图信息，地图ID: {}", mapId);
            return null;
        }
        
        // 将传感器米制坐标转换为像素坐标
        double pixelX = meterToPixelX(trackingData.getX(), mapInfo);
        double pixelY = meterToPixelY(trackingData.getY(), mapInfo);
        String deviceId = trackingData.getDeviceId();
        
        // 更新标签最后活动时间
        lastActivityTime.put(deviceId, System.currentTimeMillis());
        
        // 使用类级别锁，确保整个围栏检测过程的原子性
        try {
            ALARM_LOCK.lock();
            
            // 检查每个围栏
            for (Geofence geofence : geofences) {
                Long geofenceId = geofence.getId();
                String alarmKey = deviceId + "-" + geofenceId;
                
                // 解析围栏坐标点
                List<Geofence.GeofencePoint> points = parseGeofencePoints(geofence);
                if (points == null || points.size() < 3) {
                    continue; // 忽略无效的围栏
                }
                
                // 获取或计算围栏边界
                GeofenceBounds bounds = getGeofenceBounds(geofence.getId(), points);
                
                boolean isInside;
                
                // 首先进行边界框快速检查
                if (!bounds.containsPoint(pixelX, pixelY)) {
                    isInside = false; // 在边界框外，肯定不在多边形内
                } else {
                    // 点在边界框内，进行精确的多边形检查
                    isInside = isPointInPolygon(pixelX, pixelY, points);
                }
                
                // 根据点是否在围栏内决定是创建还是关闭告警
                if (!isInside) {
                    // 点在围栏外，检查是否需要创建告警
                    if (!activeAlarms.containsKey(alarmKey)) {
                        // 创建新告警
                        Alarm alarm = createAlarmFromTracking(trackingData, geofence, mapInfo);
                        if (alarm != null && alarm.getId() != null) {
                            activeAlarms.put(alarmKey, alarm.getId());
                            return alarm;
                        }
                    }
                } else {
                    // 点在围栏内，如果有活跃告警则关闭
                    if (activeAlarms.containsKey(alarmKey)) {
                        Long alarmId = activeAlarms.get(alarmKey);
                        closeAlarm(alarmId);
                        activeAlarms.remove(alarmKey);
                    }
                }
            }
            
            // 所有围栏检查通过，没有新的告警
            return null;
        } catch (Exception e) {
            logger.error("检查围栏入侵异常: {}", e.getMessage());
            return null;
        } finally {
            ALARM_LOCK.unlock();
        }
    }
    
    /**
     * 定时检查标签活动状态，关闭长时间未活动标签的告警
     * 每5秒执行一次
     */
    @Scheduled(fixedRate = 5000)
    public void checkInactiveTags() {
        try {
            ALARM_LOCK.lock();
            
            long currentTime = System.currentTimeMillis();
            Set<String> inactiveTags = new HashSet<>();
            
            // 从配置中获取超时时间
            updateTimeoutFromConfig();
            
            // 找出超过配置时间未活动的标签
            for (Map.Entry<String, Long> entry : lastActivityTime.entrySet()) {
                String tagId = entry.getKey();
                long lastActive = entry.getValue();
                
                if (currentTime - lastActive > tagTimeout) {
                    inactiveTags.add(tagId);
                }
            }
            
            // 关闭这些标签的所有告警
            if (!inactiveTags.isEmpty()) {
                Set<String> keysToRemove = new HashSet<>();
                
                for (String alarmKey : activeAlarms.keySet()) {
                    // alarmKey格式为 "deviceId-geofenceId"
                    String[] parts = alarmKey.split("-", 2);
                    if (parts.length == 2) {
                        String tagId = parts[0];
                        if (inactiveTags.contains(tagId)) {
                            Long alarmId = activeAlarms.get(alarmKey);
                            closeAlarm(alarmId);
                            keysToRemove.add(alarmKey);
                            logger.info("关闭不活跃标签的告警: 标签={}, 告警ID={}", tagId, alarmId);
                        }
                    }
                }
                
                // 从活跃告警中移除已关闭的告警
                for (String key : keysToRemove) {
                    activeAlarms.remove(key);
                }
                
                // 清理不活跃标签的最后活动时间记录
                for (String tagId : inactiveTags) {
                    lastActivityTime.remove(tagId);
                }
            }
        } catch (Exception e) {
            logger.error("检查不活跃标签异常: {}", e.getMessage());
        } finally {
            ALARM_LOCK.unlock();
        }
    }
    
    /**
     * 关闭告警（标记已解决）
     * @param alarmId 告警ID
     */
    private void closeAlarm(Long alarmId) {
        try {
            // 发送告警关闭通知
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "geofenceAlarmClose");
            notification.put("alarmId", alarmId);
            
            // 发送WebSocket消息
            messagingTemplate.convertAndSend("/topic/alarmNotification", notification);
            
            logger.info("关闭围栏告警: ID={}", alarmId);
        } catch (Exception e) {
            logger.error("关闭告警失败: {}", e.getMessage());
        }
    }
    
    /**
     * 获取或计算围栏边界
     * @param geofenceId 围栏ID
     * @param points 围栏点列表
     * @return 围栏边界
     */
    private GeofenceBounds getGeofenceBounds(Long geofenceId, List<Geofence.GeofencePoint> points) {
        // 先查找缓存
        if (geofenceBoundsCache.containsKey(geofenceId)) {
            return geofenceBoundsCache.get(geofenceId);
        }
        
        // 计算边界框
        GeofenceBounds bounds = new GeofenceBounds(points);
        
        // 更新缓存
        geofenceBoundsCache.put(geofenceId, bounds);
        
        return bounds;
    }
    
    /**
     * 检查点是否在多边形内（射线法）
     * @param x 点的X坐标
     * @param y 点的Y坐标
     * @param polygon 多边形坐标点列表
     * @return 是否在多边形内
     */
    private boolean isPointInPolygon(double x, double y, List<Geofence.GeofencePoint> polygon) {
        boolean inside = false;
        int i, j;
        
        for (i = 0, j = polygon.size() - 1; i < polygon.size(); j = i++) {
            double xi = polygon.get(i).getX();
            double yi = polygon.get(i).getY();
            double xj = polygon.get(j).getX();
            double yj = polygon.get(j).getY();
            
            boolean intersect = ((yi > y) != (yj > y)) && 
                               (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) {
                inside = !inside;
            }
        }
        
        return inside;
    }
    
    /**
     * 将米制坐标转换为像素X坐标
     * @param meterX X坐标(米)
     * @param mapInfo 地图信息
     * @return 像素X坐标
     */
    private double meterToPixelX(double meterX, MapEntity mapInfo) {
        return mapInfo.getOriginX() + meterX * mapInfo.getScale();
    }
    
    /**
     * 将米制坐标转换为像素Y坐标
     * @param meterY Y坐标(米)
     * @param mapInfo 地图信息
     * @return 像素Y坐标
     */
    private double meterToPixelY(double meterY, MapEntity mapInfo) {
        // Y轴方向相反，图片坐标向下为正，物理坐标向上为正
        return mapInfo.getOriginY() - meterY * mapInfo.getScale();
    }
    
    /**
     * 从跟踪数据和围栏信息创建报警对象
     * @param trackingData 跟踪数据
     * @param geofence 围栏信息
     * @param mapInfo 地图信息
     * @return 报警对象
     */
    private Alarm createAlarmFromTracking(TrackingData trackingData, Geofence geofence, MapEntity mapInfo) {
        Alarm alarm = new Alarm();
        
        // 设置基本信息
        alarm.setGeofenceId(geofence.getId());
        alarm.setGeofenceName(geofence.getName());
        alarm.setMapId(geofence.getMapId());
        alarm.setMapName(mapInfo.getName());
        alarm.setAlarmTag(trackingData.getDeviceId());
        alarm.setX(trackingData.getX());
        alarm.setY(trackingData.getY());
        
        // 设置时间，如果有时间戳则使用，否则使用当前时间
        if (trackingData.getTimestamp() != null) {
            try {
                java.time.LocalDateTime localDateTime = TimestampUtils.parseTimestamp(trackingData.getTimestamp());
                alarm.setTime(java.util.Date.from(localDateTime.atZone(java.time.ZoneId.systemDefault()).toInstant()));
            } catch (Exception e) {
                alarm.setTime(new Date());
            }
        } else {
            alarm.setTime(new Date());
        }
        
        // 保存报警记录到数据库，并仅在成功时记录日志
        try {
            int result = alarmMapper.insert(alarm);
            if (result > 0) {
                // 只有成功插入数据库才记录日志
                logger.info("围栏告警已保存: 标签={}, 围栏={}, 地图={}, 坐标=({},{})", 
                          alarm.getAlarmTag(), alarm.getGeofenceName(), alarm.getMapName(),
                          alarm.getX(), alarm.getY());
                
                // 通过WebSocket向前端发送告警通知
                sendAlarmNotification(alarm);
            }
        } catch (Exception e) {
            logger.error("保存围栏告警失败: {}", e.getMessage());
            return null;
        }
        
        return alarm;
    }
    
    /**
     * 通过WebSocket向前端发送告警通知
     * @param alarm 告警对象
     */
    private void sendAlarmNotification(Alarm alarm) {
        try {
            // 创建通知消息对象
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "geofenceAlarm");
            notification.put("title", "围栏告警");
            notification.put("message", String.format("标签 %s 位于围栏 %s 外部", alarm.getAlarmTag(), alarm.getGeofenceName()));
            notification.put("alarmId", alarm.getId());
            notification.put("alarmTag", alarm.getAlarmTag());
            notification.put("geofenceId", alarm.getGeofenceId());
            notification.put("geofenceName", alarm.getGeofenceName());
            notification.put("mapId", alarm.getMapId());
            notification.put("mapName", alarm.getMapName());
            
            // 创建位置Map (Java 8兼容方式)
            Map<String, Double> position = new HashMap<>();
            position.put("x", alarm.getX());
            position.put("y", alarm.getY());
            notification.put("position", position);
            
            notification.put("time", alarm.getTime());
            
            // 发送WebSocket消息到特定主题
            messagingTemplate.convertAndSend("/topic/alarmNotification", notification);
            logger.info("已发送围栏告警通知: 标签={}, 围栏={}", alarm.getAlarmTag(), alarm.getGeofenceName());
        } catch (Exception e) {
            logger.error("发送告警通知失败: {}", e.getMessage());
        }
    }
    
    /**
     * 从配置中更新超时时间
     */
    private void updateTimeoutFromConfig() {
        try {
            TaskConfig config = taskConfigService.getTaskConfig();
            if (config != null && config.getTimeoutTask() != null) {
                if (config.getTimeoutTask().isEnabled()) {
                    tagTimeout = config.getTimeoutTask().getTimeoutMs();
                } else {
                    // 如果禁用超时管理，设置一个很大的值
                    tagTimeout = Long.MAX_VALUE;
                }
            }
        } catch (Exception e) {
            logger.warn("获取超时配置失败，使用默认值: {}", e.getMessage());
            // 使用默认值
            tagTimeout = 30000;
        }
    }
    
    /**
     * 获取地图对应的所有启用围栏
     * @param mapId 地图ID
     * @return 围栏列表
     */
    private List<Geofence> getGeofencesForMap(Long mapId) {
        // 先查找缓存
        if (geofenceCache.containsKey(mapId)) {
            return geofenceCache.get(mapId);
        }
        
        // 查询数据库
        try {
            List<Geofence> geofences = geofenceMapper.selectByMapIdAndEnabled(mapId, true);
            // 更新缓存
            geofenceCache.put(mapId, geofences);
            return geofences;
        } catch (Exception e) {
            logger.error("获取地图围栏失败: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
    
    /**
     * 获取地图信息
     * @param mapId 地图ID
     * @return 地图信息
     */
    private MapEntity getMapInfo(Long mapId) {
        // 先查找缓存
        if (mapCache.containsKey(mapId)) {
            return mapCache.get(mapId);
        }
        
        // 查询数据库
        try {
            MapEntity map = mapMapper.selectMapByMapId(mapId);
            if (map != null) {
                mapCache.put(mapId, map);
            }
            return map;
        } catch (Exception e) {
            logger.error("获取地图信息失败: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * 解析围栏坐标点
     * @param geofence 围栏对象
     * @return 坐标点列表
     */
    private List<Geofence.GeofencePoint> parseGeofencePoints(Geofence geofence) {
        // 如果已经有解析好的点，直接返回
        if (geofence.getPoints() != null && !geofence.getPoints().isEmpty()) {
            return geofence.getPoints();
        }
        
        // 解析JSON坐标字符串
        try {
            if (geofence.getCoordinates() == null || geofence.getCoordinates().isEmpty()) {
                return Collections.emptyList();
            }
            
            List<Geofence.GeofencePoint> points = objectMapper.readValue(
                geofence.getCoordinates(), 
                new TypeReference<List<Geofence.GeofencePoint>>() {}
            );
            
            // 缓存解析结果
            geofence.setPoints(points);
            return points;
        } catch (JsonProcessingException e) {
            logger.error("解析围栏坐标失败: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
    
    /**
     * 定期清理缓存，避免内存占用过多
     */
    private void cleanCacheIfNeeded() {
        long currentTime = System.currentTimeMillis();
        if (currentTime - lastCacheCleanTime > CACHE_CLEAN_INTERVAL) {
            try {
                ALARM_LOCK.lock();
                
                // 清理地图和围栏缓存
                geofenceCache.clear();
                mapCache.clear();
                geofenceBoundsCache.clear();
                
                // 不清理activeAlarms以维护告警状态
                // 在实际应用中，可能需要查询数据库检查哪些告警已解决
                
                lastCacheCleanTime = currentTime;
            } finally {
                ALARM_LOCK.unlock();
            }
        }
    }
} 