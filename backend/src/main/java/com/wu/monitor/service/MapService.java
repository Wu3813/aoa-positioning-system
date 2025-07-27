package com.wu.monitor.service;

import com.wu.monitor.model.MapEntity;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface MapService {
    List<MapEntity> getAllMaps(String name);
    MapEntity getMapByMapId(Long mapId);
    MapEntity createMap(MapEntity map, MultipartFile file);
    MapEntity updateMap(Long mapId, MapEntity map, MultipartFile file);
    void deleteMapByMapId(Long mapId);
    void batchDeleteMapsByMapIds(List<Long> mapIds);
}