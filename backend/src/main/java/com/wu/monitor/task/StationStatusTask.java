package com.wu.monitor.task;

import com.wu.monitor.service.StationService;
import com.wu.monitor.service.TaskConfigService;
import com.wu.monitor.model.TaskConfig;
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
    
    @Autowired
    private TaskConfigService taskConfigService;
    
    /**
     * 定时检查所有基站状态并刷新完整信息
     * 根据配置的间隔时间执行
     */
    private long lastExecuteTime = 0;
    
    @Scheduled(fixedRate = 60000) // 每分钟检查一次配置
    public void checkAndRefreshStationInfo() {
        try {
            TaskConfig.StationTask config = taskConfigService.getStationTaskConfig();
            
            // 如果任务被禁用，则直接返回
            if (!config.isEnabled()) {
                return;
            }
            
            long currentTime = System.currentTimeMillis();
            if (currentTime - lastExecuteTime >= config.getIntervalMs()) {
                lastExecuteTime = currentTime;
                
                log.info("执行基站状态刷新任务");
                stationService.checkAllStationsStatus();
                
            }
        } catch (Exception e) {
            log.error("基站状态刷新任务异常: {}", e.getMessage(), e);
        }
    }
} 