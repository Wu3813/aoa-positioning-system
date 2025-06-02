package com.wu.monitor.task;

import com.wu.monitor.service.StationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 基站状态检查定时任务
 */
@Component
public class StationStatusTask {
    
    private static final Logger log = LoggerFactory.getLogger(StationStatusTask.class);
    
    @Autowired
    private StationService stationService;
    
    /**
     * 定时检查所有基站状态并刷新完整信息
     * 每1分钟执行一次，包括基站型号、MAC地址、固件版本、扫描状态、加速度数据等
     */
    @Scheduled(cron = "0 */1 * * * ?")
    public void checkAndRefreshStationInfo() {
        try {
            log.info("=== 开始执行基站状态检查和信息刷新定时任务 ===");
            long startTime = System.currentTimeMillis();
            
            StationService.RefreshResult result = stationService.checkAllStationsStatus();
            
            long endTime = System.currentTimeMillis();
            log.info("=== 基站状态检查和信息刷新完成 ===");
            log.info("执行耗时: {}ms, 总计{}个，成功{}个，失败{}个", 
                    (endTime - startTime), result.getTotal(), result.getSuccess(), result.getFailed());
        } catch (Exception e) {
            log.error("基站状态检查和信息刷新定时任务执行失败: {}", e.getMessage(), e);
        }
    }
} 