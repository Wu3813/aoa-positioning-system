package com.wu.monitor.mapper;

import com.wu.monitor.model.TaskConfig;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface TaskConfigMapper {
    /**
     * 查询任务配置
     * @return 任务配置对象
     */
    TaskConfig selectTaskConfig();
    
    /**
     * 插入任务配置
     * @param taskConfig 任务配置对象
     * @return 影响行数
     */
    int insertTaskConfig(TaskConfig taskConfig);
    
    /**
     * 更新任务配置
     * @param taskConfig 任务配置对象
     * @return 影响行数
     */
    int updateTaskConfig(TaskConfig taskConfig);
    
    /**
     * 判断表中是否存在配置
     * @return 配置数量
     */
    int countTaskConfig();
} 