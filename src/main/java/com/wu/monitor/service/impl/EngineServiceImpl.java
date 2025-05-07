package com.wu.monitor.service.impl;

import com.wu.monitor.exception.ResourceNotFoundException;
import com.wu.monitor.mapper.EngineMapper;
import com.wu.monitor.model.Engine;
import com.wu.monitor.service.EngineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EngineServiceImpl implements EngineService {

    @Autowired
    private EngineMapper engineMapper;

    @Override
    public List<Engine> getAllEngines(String code, String name, Integer status) {
        return engineMapper.findAll(code, name, status);
    }

    @Override
    public Engine getEngineById(Long id) {
        Engine engine = engineMapper.findById(id);
        if (engine == null) {
            throw new ResourceNotFoundException("引擎不存在");
        }
        return engine;
    }

    @Override
    @Transactional
    public Engine createEngine(Engine engine) {
        // 检查编号是否已存在
        if (engineMapper.findByCode(engine.getCode()) != null) {
            throw new IllegalArgumentException("引擎编号已存在");
        }
        
        // 设置创建时间
        engine.setCreateTime(LocalDateTime.now());
        
        // 如果未设置状态，默认为离线
        if (engine.getStatus() == null) {
            engine.setStatus(0);
        }
        
        engineMapper.insert(engine);
        return getEngineById(engine.getId());
    }

    @Override
    @Transactional
    public Engine updateEngine(Long id, Engine engine) {
        // 检查引擎是否存在
        if (engineMapper.findById(id) == null) {
            throw new ResourceNotFoundException("引擎不存在");
        }
        
        // 检查编号是否与其他引擎重复
        Engine existingEngine = engineMapper.findByCode(engine.getCode());
        if (existingEngine != null && !existingEngine.getId().equals(id)) {
            throw new IllegalArgumentException("引擎编号已存在");
        }
        
        engine.setId(id);
        engineMapper.update(engine);
        return getEngineById(id);
    }

    @Override
    @Transactional
    public void deleteEngine(Long id) {
        // 检查引擎是否存在
        if (engineMapper.findById(id) == null) {
            throw new ResourceNotFoundException("引擎不存在");
        }
        engineMapper.deleteById(id);
    }

    @Override
    @Transactional
    public void batchDeleteEngines(List<Long> ids) {
        engineMapper.batchDelete(ids);
    }

    @Override
    public List<Engine> getEnginesByMapId(Long mapId) {
        return engineMapper.findByMapId(mapId);
    }

    @Override
    @Transactional
    public Engine updateEngineStatus(Long id, Integer status) {
        // 检查引擎是否存在
        Engine engine = engineMapper.findById(id);
        if (engine == null) {
            throw new ResourceNotFoundException("引擎不存在");
        }
        
        // 更新状态和最后通讯时间
        engine.setStatus(status);
        engine.setLastCommunication(LocalDateTime.now());
        engineMapper.updateStatus(id, status);
        
        return getEngineById(id);
    }
} 