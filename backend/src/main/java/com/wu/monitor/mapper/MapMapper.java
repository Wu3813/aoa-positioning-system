package com.wu.monitor.mapper;

import com.wu.monitor.model.MapEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface MapMapper {
    List<MapEntity> selectAllMaps(@Param("name") String name);
    
    MapEntity selectMapByMapId(@Param("mapId") Long mapId);
    
    int insertMap(MapEntity map);
    
    int updateMap(MapEntity map);
    
    int deleteMapByMapId(@Param("mapId") Long mapId);
    
    void batchDeleteMapsByMapIds(@Param("mapIds") List<Long> mapIds);
}