package com.wu.monitor.mapper;

import com.wu.monitor.model.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface MapMapper {
    List<Map> selectAllMaps(@Param("name") String name);
    
    Map selectMapByMapId(@Param("mapId") Long mapId);
    
    int insertMap(Map map);
    
    int updateMap(Map map);
    
    int deleteMapByMapId(@Param("mapId") Long mapId);
    
    void batchDeleteMapsByMapIds(@Param("mapIds") List<Long> mapIds);
}