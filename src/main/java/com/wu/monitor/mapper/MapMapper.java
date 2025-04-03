package com.wu.monitor.mapper;

import com.wu.monitor.model.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface MapMapper {
    List<Map> selectAllMaps();
    
    Map selectMapById(@Param("id") Long id);
    
    int insertMap(Map map);
    
    int updateMap(Map map);
    
    int deleteMapById(@Param("id") Long id);
    
    Map selectCurrentMap();
    
    int updateCurrentMap(@Param("id") Long id);
    
    void clearCurrentMap();
}