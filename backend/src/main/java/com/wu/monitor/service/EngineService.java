package com.wu.monitor.service;

import com.wu.monitor.model.Engine;
import java.util.List;

public interface EngineService {
    /**
     * 获取所有引擎
     * @param name 引擎名称（可选）
     * @param status 引擎状态（可选）
     * @return 引擎列表
     */
    List<Engine> getAllEngines(String name, Integer status);
    
    /**
     * 根据ID获取引擎
     * @param id 引擎ID
     * @return 引擎信息
     */
    Engine getEngineById(Long id);
    
    /**
     * 创建引擎
     * @param engine 引擎信息
     * @return 创建后的引擎信息
     */
    Engine createEngine(Engine engine);
    
    /**
     * 更新引擎
     * @param id 引擎ID
     * @param engine 引擎信息
     * @return 更新后的引擎信息
     */
    Engine updateEngine(Long id, Engine engine);
    
    /**
     * 删除引擎
     * @param id 引擎ID
     */
    void deleteEngine(Long id);
    
    /**
     * 批量删除引擎
     * @param ids 引擎ID列表
     */
    void batchDeleteEngines(List<Long> ids);
    
    /**
     * 获取指定地图下的所有引擎
     * @param mapId 地图ID
     * @return 引擎列表
     */
    List<Engine> getEnginesByMapId(Long mapId);
    
    /**
     * 更新引擎状态
     * @param id 引擎ID
     * @param status 状态
     * @return 更新后的引擎信息
     */
    Engine updateEngineStatus(Long id, Integer status);
    
    /**
     * 更新最后通信时间
     * @param id 引擎ID
     */
    void updateLastCommunication(Long id);
    
    /**
     * 更新最后配置时间
     * @param id 引擎ID
     */
    void updateLastConfigTime(Long id);
} 