package com.wu.monitor.service;

import com.wu.monitor.model.Map;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface MapService {
    List<Map> getAllMaps();
    Map getMapById(Long id);
    Map createMap(Map map, MultipartFile file);
    Map updateMap(Long id, Map map);
    void deleteMap(Long id);
    Map getCurrentMap();
    void setCurrentMap(Long id);
}