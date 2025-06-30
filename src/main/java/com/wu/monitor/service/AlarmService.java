package com.wu.monitor.service;

import com.wu.monitor.model.Alarm;

import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * 报警服务接口
 */
public interface AlarmService {

    /**
     * 处理并添加报警记录
     * @param alarmData 前端发送的报警数据
     * @return 添加结果
     */
    Map<String, Object> processAndAddAlarm(Map<String, Object> alarmData);
    
    /**
     * 添加报警记录
     * @param alarm 报警对象
     * @return 添加结果
     */
    Map<String, Object> addAlarm(Alarm alarm);

    /**
     * 根据ID获取报警记录
     * @param id 报警ID
     * @return 报警记录
     */
    Map<String, Object> getAlarmById(Long id);

    /**
     * 获取所有报警记录
     * @return 报警记录列表
     */
    Map<String, Object> getAllAlarms();

    /**
     * 根据条件查询报警记录
     * @param geofenceName 围栏名称
     * @param mapId 地图ID
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @param sortField 排序字段
     * @param sortOrder 排序方向
     * @return 报警记录列表
     */
    Map<String, Object> getAlarmsByCondition(String geofenceName, Long mapId, Date startTime, Date endTime, String sortField, String sortOrder);

    /**
     * 删除报警记录
     * @param id 报警ID
     * @return 删除结果
     */
    Map<String, Object> deleteAlarm(Long id);
} 