package com.wu.monitor.service;

import com.wu.monitor.model.Alarm;
import com.wu.monitor.model.TrackingData;

import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * 报警服务接口
 */
public interface AlarmService {
    
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
    
    /**
     * 检查位置数据是否在围栏内，并处理围栏告警
     * @param trackingData 跟踪数据
     * @return 如果生成告警则返回告警对象，否则返回null
     */
    Alarm checkGeofenceIntrusion(TrackingData trackingData);
} 