package com.wu.monitor.service;

import com.wu.monitor.model.Map;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface MapService {
    List<Map> getAllMaps(String name);
    Map getMapByMapId(Long mapId);
    Map createMap(Map map, MultipartFile file);
    Map updateMap(Long mapId, Map map, MultipartFile file);
    void deleteMapByMapId(Long mapId);
    void batchDeleteMapsByMapIds(List<Long> mapIds);
}