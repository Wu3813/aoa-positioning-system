package com.wu.monitor.service.impl;

import com.wu.monitor.mapper.MapMapper;
import com.wu.monitor.model.Map;
import com.wu.monitor.service.MapService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class MapServiceImpl implements MapService {
    
    @Value("${map.upload.path}")
    private String uploadPath;
    
    @Autowired
    private MapMapper mapMapper;
    
    @Override
    public List<Map> getAllMaps() {
        return mapMapper.selectAllMaps();
    }
    
    @Override
    public Map getMapById(Long id) {
        return mapMapper.selectMapById(id);
    }
    
    @Override
    public Map createMap(Map map, MultipartFile file) {
        String fileName = UUID.randomUUID().toString() + getFileExtension(file.getOriginalFilename());
        String filePath = Paths.get(uploadPath, fileName).toString();
        
        try {
            // 确保目录存在
            new File(uploadPath).mkdirs();
            // 保存文件
            file.transferTo(new File(filePath));
            
            // 设置地图信息
            map.setImagePath(fileName);
            map.setCreateTime(LocalDateTime.now());
            
            // 保存到数据库
            mapMapper.insertMap(map);
            return map;
        } catch (Exception e) {
            throw new RuntimeException("保存地图文件失败", e);
        }
    }
    
    @Override
    public Map updateMap(Long id, Map map) {
        map.setId(id);
        mapMapper.updateMap(map);
        return mapMapper.selectMapById(id);
    }
    
    @Override
    public void deleteMap(Long id) {
        Map map = mapMapper.selectMapById(id);
        if (map != null && map.getImagePath() != null) {
            // 删除文件
            new File(Paths.get(uploadPath, map.getImagePath()).toString()).delete();
        }
        mapMapper.deleteMapById(id);
    }
    
    @Override
    public Map getCurrentMap() {
        return mapMapper.selectCurrentMap();
    }
    
    @Override
    public void setCurrentMap(Long id) {
        // 先清空表
        mapMapper.clearCurrentMap();
        // 再插入新记录
        mapMapper.updateCurrentMap(id);
    }
    
    private String getFileExtension(String filename) {
        return filename.substring(filename.lastIndexOf("."));
    }
}