package com.wu.monitor.service;

import com.wu.monitor.model.TaskConfig;
import com.wu.monitor.mapper.TaskConfigMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;

/**
 * 任务配置服务
 */
@Service
public class TaskConfigService {
    
    private static final Logger log = LoggerFactory.getLogger(TaskConfigService.class);
    
    @Autowired
    private TaskConfigMapper taskConfigMapper;
    
    private TaskConfig taskConfig;
    
    @PostConstruct
    public void init() {
        loadConfig();
    }
    
    /**
     * 加载配置
     */
    private void loadConfig() {
        try {
            // 从数据库加载配置
            taskConfig = taskConfigMapper.selectTaskConfig();
            
            // 如果数据库中没有配置记录，则创建默认配置
            if (taskConfig == null) {
                log.info("数据库中不存在任务配置，创建默认配置");
                taskConfig = new TaskConfig();
                
                // 保存默认配置到数据库
                saveConfig();
            } else {
                log.info("从数据库加载任务配置成功");
            }
        } catch (Exception e) {
            log.error("加载任务配置失败，使用默认配置: {}", e.getMessage());
            taskConfig = new TaskConfig();
        }
    }
    
    /**
     * 保存配置
     */
    private void saveConfig() {
        try {
            // 检查数据库中是否已有配置
            int count = taskConfigMapper.countTaskConfig();
            
            // 根据是否已存在记录进行插入或更新操作
            if (count == 0) {
                taskConfigMapper.insertTaskConfig(taskConfig);
            } else {
                taskConfigMapper.updateTaskConfig(taskConfig);
            }
            log.info("任务配置保存到数据库成功");
        } catch (Exception e) {
            log.error("保存任务配置到数据库失败: {}", e.getMessage(), e);
        }
    }
    
    /**
     * 获取当前配置
     */
    public TaskConfig getTaskConfig() {
        return taskConfig;
    }
    
    /**
     * 更新配置
     */
    public void updateTaskConfig(TaskConfig newConfig) {
        this.taskConfig = newConfig;
        saveConfig();
        log.info("任务配置已更新");
    }
    
    /**
     * 获取基站任务配置
     */
    public TaskConfig.StationTask getStationTaskConfig() {
        return taskConfig.getStationTask();
    }
    
    /**
     * 获取轨迹任务配置
     */
    public TaskConfig.TrajectoryTask getTrajectoryTaskConfig() {
        return taskConfig.getTrajectoryTask();
    }
    
    /**
     * 获取轨迹存储任务配置
     */
    public TaskConfig.StorageTask getStorageTaskConfig() {
        return taskConfig.getStorageTask();
    }
} 