package com.wu.monitor.task;

import com.wu.monitor.service.TrajectoryStorageService;
import com.wu.monitor.service.TaskConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 轨迹数据存储定时任务
 * 根据配置定期执行，处理Redis中的轨迹数据并存储到MySQL
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TrajectoryStorageTask {
    
    private final TrajectoryStorageService trajectoryStorageService;
    private final TaskConfigService taskConfigService;
    private long lastExecuteTime = 0;
    
    /**
     * 定时处理轨迹数据存储
     * 该任务始终开启，间隔时间可配置
     */
    @Scheduled(fixedDelay = 5000) // 默认5秒，实际会从配置中读取
    public void storeTrajectoryData() {
        try {
            // 获取配置的执行间隔
            long intervalMs = taskConfigService.getStorageTaskConfig().getIntervalMs();
            long currentTime = System.currentTimeMillis();
            
            // 检查是否到达执行时间
            if (currentTime - lastExecuteTime >= intervalMs) {
                log.debug("开始执行轨迹数据存储任务");
                
                // 执行存储操作
                trajectoryStorageService.processAndStore();
                
                lastExecuteTime = currentTime;
            }
        } catch (Exception e) {
            log.error("轨迹数据存储任务执行异常", e);
        }
    }
} 