package com.wu.monitor.controller;

import com.wu.monitor.model.TaskConfig;
import com.wu.monitor.service.TaskConfigService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 任务配置控制器
 */
@RestController
@RequestMapping("/api/admin/tasks")
@CrossOrigin(origins = "*")
public class TaskConfigController {
    
    private static final Logger log = LoggerFactory.getLogger(TaskConfigController.class);
    
    @Autowired
    private TaskConfigService taskConfigService;
    
    /**
     * 获取所有任务配置
     */
    @GetMapping("/config")
    public ResponseEntity<Object> getTaskConfig() {
        try {
            TaskConfig config = taskConfigService.getTaskConfig();
            return ResponseEntity.ok(config);
        } catch (Exception e) {
            log.error("获取任务配置失败: {}", e.getMessage(), e);
            
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "获取任务配置失败: " + e.getMessage());
            
            return ResponseEntity.internalServerError().body(error);
        }
    }
    
    /**
     * 更新任务配置
     */
    @PostMapping("/config")
    public ResponseEntity<Map<String, Object>> updateTaskConfig(@RequestBody TaskConfig config) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 保留原有ID以确保更新的是同一条记录
            TaskConfig currentConfig = taskConfigService.getTaskConfig();
            if (currentConfig != null && currentConfig.getId() != null) {
                config.setId(currentConfig.getId());
            }
            
            taskConfigService.updateTaskConfig(config);
            
            response.put("success", true);
            response.put("message", "任务配置更新成功");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("更新任务配置失败: {}", e.getMessage(), e);
            
            response.put("success", false);
            response.put("message", "更新任务配置失败: " + e.getMessage());
            
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * 获取任务状态
     */
    @GetMapping("/status")
    public ResponseEntity<Object> getTaskStatus() {
        try {
            TaskConfig config = taskConfigService.getTaskConfig();
            
            Map<String, Object> status = new HashMap<>();
            status.put("success", true);
            status.put("stationTaskEnabled", config.getStationTask().isEnabled());
            status.put("stationTaskInterval", config.getStationTask().getIntervalMs());
            status.put("trajectoryTaskEnabled", config.getTrajectoryTask().isEnabled());
            status.put("trajectoryTaskSendInterval", config.getTrajectoryTask().getSendIntervalMs());
            status.put("trajectoryTaskPauseTime", config.getTrajectoryTask().getPauseMs());
            status.put("storageTaskEnabled", config.getStorageTask().isEnabled());
            status.put("storageTaskInterval", config.getStorageTask().getIntervalMs());
            status.put("timeoutTaskEnabled", config.getTimeoutTask().isEnabled());
            status.put("timeoutTaskInterval", config.getTimeoutTask().getTimeoutMs());
            
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            log.error("获取任务状态失败: {}", e.getMessage(), e);
            
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "获取任务状态失败: " + e.getMessage());
            
            return ResponseEntity.internalServerError().body(error);
        }
    }
} 