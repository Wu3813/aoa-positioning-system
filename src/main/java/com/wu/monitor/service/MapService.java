package com.wu.monitor.service;

import com.wu.monitor.model.Map;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface MapService {
    List<Map> getAllMaps(String name);
    Map getMapById(Long id);
    Map createMap(Map map, MultipartFile file);
    Map updateMap(Long id, Map map, MultipartFile file);
    void deleteMap(Long id);
    void batchDeleteMaps(List<Long> ids);
}