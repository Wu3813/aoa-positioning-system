package com.wu.monitor.service.impl;

import com.wu.monitor.mapper.AlarmMapper;
import com.wu.monitor.model.Alarm;
import com.wu.monitor.service.AlarmService;
import com.wu.monitor.util.TimestampUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * 报警服务实现类
 */
@Service
public class AlarmServiceImpl implements AlarmService {

    private static final Logger logger = LoggerFactory.getLogger(AlarmServiceImpl.class);

    @Autowired
    private AlarmMapper alarmMapper;
    
    @Override
    public Map<String, Object> processAndAddAlarm(Map<String, Object> alarmData) {
        Map<String, Object> result = new HashMap<>();
        try {
            // 创建Alarm对象
            Alarm alarm = new Alarm();
            
            // 处理时间戳
            if (alarmData.containsKey("time") && alarmData.get("time") != null) {
                // 使用TimestampUtils处理时间戳
                String timestamp = alarmData.get("time").toString();
                logger.info("原始时间戳: {}", timestamp);
                
                // 使用TimestampUtils工具类转换时间戳为LocalDateTime
                java.time.LocalDateTime localDateTime = TimestampUtils.parseTimestamp(timestamp);
                // 转换为Date
                alarm.setTime(java.util.Date.from(localDateTime.atZone(java.time.ZoneId.systemDefault()).toInstant()));
            } else {
                alarm.setTime(new java.util.Date());
            }
            
            // 设置其他字段
            if (alarmData.containsKey("geofenceId")) {
                alarm.setGeofenceId(Long.valueOf(alarmData.get("geofenceId").toString()));
            }
            
            if (alarmData.containsKey("geofenceName")) {
                alarm.setGeofenceName((String) alarmData.get("geofenceName"));
            }
            
            if (alarmData.containsKey("mapId")) {
                alarm.setMapId(Long.valueOf(alarmData.get("mapId").toString()));
            }
            
            if (alarmData.containsKey("mapName")) {
                alarm.setMapName((String) alarmData.get("mapName"));
            }
            
            if (alarmData.containsKey("alarmTag")) {
                alarm.setAlarmTag((String) alarmData.get("alarmTag"));
            }
            
            if (alarmData.containsKey("x")) {
                alarm.setX(Double.valueOf(alarmData.get("x").toString()));
            }
            
            if (alarmData.containsKey("y")) {
                alarm.setY(Double.valueOf(alarmData.get("y").toString()));
            }
            
            logger.info("处理后的报警对象: {}", alarm);
            return addAlarm(alarm);
        } catch (Exception e) {
            logger.error("处理报警数据失败", e);
            result.put("success", false);
            result.put("message", "处理报警数据失败: " + e.getMessage());
            return result;
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
            logger.error("添加报警记录失败", e);
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
            logger.error("获取报警记录失败", e);
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
            logger.error("获取所有报警记录失败", e);
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
            logger.error("条件查询报警记录失败", e);
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
            logger.error("删除报警记录失败", e);
            result.put("success", false);
            result.put("message", "删除报警记录异常: " + e.getMessage());
        }
        return result;
    }
} 