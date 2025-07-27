package com.wu.monitor.controller;
import com.wu.monitor.service.AlarmService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Map;

/**
 * 报警控制器
 */
@RestController
@RequestMapping("/api/alarms")
public class AlarmController {

    private static final Logger logger = LoggerFactory.getLogger(AlarmController.class);

    @Autowired
    private AlarmService alarmService;

    /**
     * 获取报警记录列表（可根据条件筛选）
     * @param geofenceName 围栏名称
     * @param mapId 地图ID
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @param sort 排序字符串，格式为 "字段名,排序方向" 如 "time,desc"
     * @return 报警记录列表
     */
    @GetMapping
    public Map<String, Object> getAlarms(
            @RequestParam(required = false) String geofenceName,
            @RequestParam(required = false) Long mapId,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(required = false) String sort) {
        
        logger.info("查询报警记录: geofenceName={}, mapId={}, startTime={}, endTime={}, sort={}",
                geofenceName, mapId, startTime, endTime, sort);
        
        // 解析时间参数
        Date startDate = null;
        Date endDate = null;
        
        if (startTime != null && !startTime.isEmpty()) {
            try {
                startDate = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").parse(startTime);
            } catch (ParseException e) {
                logger.error("解析开始时间失败", e);
            }
        }
        
        if (endTime != null && !endTime.isEmpty()) {
            try {
                endDate = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").parse(endTime);
            } catch (ParseException e) {
                logger.error("解析结束时间失败", e);
            }
        }
        
        // 解析排序参数
        String sortField = "time"; // 默认按时间排序
        String sortOrder = "desc"; // 默认降序
        
        if (sort != null && !sort.isEmpty()) {
            String[] sortParts = sort.split(",");
            if (sortParts.length > 0) {
                sortField = sortParts[0];
            }
            if (sortParts.length > 1) {
                sortOrder = sortParts[1];
            }
        }
        
        return alarmService.getAlarmsByCondition(geofenceName, mapId, startDate, endDate, sortField, sortOrder);
    }

    /**
     * 根据ID获取报警记录
     * @param id 报警记录ID
     * @return 报警记录
     */
    @GetMapping("/{id}")
    public Map<String, Object> getAlarmById(@PathVariable Long id) {
        logger.info("获取报警记录: id={}", id);
        return alarmService.getAlarmById(id);
    }

    /**
     * 删除报警记录
     * @param id 报警记录ID
     * @return 操作结果
     */
    @DeleteMapping("/{id}")
    public Map<String, Object> deleteAlarm(@PathVariable Long id) {
        logger.info("删除报警记录: id={}", id);
        return alarmService.deleteAlarm(id);
    }
} 