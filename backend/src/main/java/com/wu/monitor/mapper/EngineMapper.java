package com.wu.monitor.mapper;

import com.wu.monitor.model.Engine;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface EngineMapper {
    /**
     * 查询所有引擎
     * @param code 引擎编号（可选）
     * @param name 引擎名称（可选）
     * @param status 引擎状态（可选）
     * @return 引擎列表
     */
    List<Engine> findAll(@Param("code") String code, @Param("name") String name, @Param("status") Integer status);
    
    /**
     * 根据ID查询引擎
     * @param id 引擎ID
     * @return 引擎信息
     */
    Engine findById(@Param("id") Long id);
    
    /**
     * 根据编号查询引擎
     * @param code 引擎编号
     * @return 引擎信息
     */
    Engine findByCode(@Param("code") String code);
    
    /**
     * 插入引擎
     * @param engine 引擎信息
     * @return 影响行数
     */
    int insert(Engine engine);
    
    /**
     * 更新引擎
     * @param engine 引擎信息
     * @return 影响行数
     */
    int update(Engine engine);
    
    /**
     * 删除引擎
     * @param id 引擎ID
     * @return 影响行数
     */
    int deleteById(@Param("id") Long id);
    
    /**
     * 批量删除引擎
     * @param ids 引擎ID列表
     * @return 影响行数
     */
    int batchDelete(@Param("ids") List<Long> ids);
    
    /**
     * 根据地图ID查询引擎
     * @param mapId 地图ID
     * @return 引擎列表
     */
    List<Engine> findByMapId(@Param("mapId") Long mapId);
    
    /**
     * 更新引擎状态
     * @param id 引擎ID
     * @param status 状态
     * @return 影响行数
     */
    int updateStatus(@Param("id") Long id, @Param("status") Integer status);
} 