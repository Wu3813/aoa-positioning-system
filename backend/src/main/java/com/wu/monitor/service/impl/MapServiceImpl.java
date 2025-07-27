package com.wu.monitor.service.impl;

import com.wu.monitor.mapper.MapMapper;
import com.wu.monitor.model.MapEntity;
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
    public List<MapEntity> getAllMaps(String name) {
        return mapMapper.selectAllMaps(name);
    }
    
    @Override
    public MapEntity getMapByMapId(Long mapId) {
        return mapMapper.selectMapByMapId(mapId);
    }
    
    @Override
    public MapEntity createMap(MapEntity map, MultipartFile file) {
        // 检查 mapId 是否为空
        if (map.getMapId() == null) {
            throw new RuntimeException("地图ID不能为空");
        }
        
        // 检查 mapId 是否已存在
        MapEntity existingMap = mapMapper.selectMapByMapId(map.getMapId());
        if (existingMap != null) {
            throw new RuntimeException("地图ID已存在");
        }
        
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
    public MapEntity updateMap(Long mapId, MapEntity map, MultipartFile file) {
        MapEntity existingMap = mapMapper.selectMapByMapId(mapId);
        if (existingMap == null) {
            throw new RuntimeException("地图不存在");
        }
    
        // 如果有新文件上传
        if (file != null && !file.isEmpty()) {
            String fileName = UUID.randomUUID().toString() + getFileExtension(file.getOriginalFilename());
            String filePath = Paths.get(uploadPath, fileName).toString();
            
            try {
                // 保存新文件
                file.transferTo(new File(filePath));
                
                // 删除旧文件
                if (existingMap.getImagePath() != null) {
                    new File(Paths.get(uploadPath, existingMap.getImagePath()).toString()).delete();
                }
                
                // 更新图片路径
                map.setImagePath(fileName);
            } catch (Exception e) {
                throw new RuntimeException("更新地图文件失败", e);
            }
        }
    
        // 设置ID
        map.setId(existingMap.getId());
        // 保留原有的创建时间
        map.setCreateTime(existingMap.getCreateTime());
        // 如果没有新文件，保留原有的图片路径
        if (map.getImagePath() == null) {
            map.setImagePath(existingMap.getImagePath());
        }
        
        mapMapper.updateMap(map);
        return mapMapper.selectMapByMapId(mapId);
    }
    
    @Override
    public void deleteMapByMapId(Long mapId) {
        MapEntity map = mapMapper.selectMapByMapId(mapId);
        if (map != null && map.getImagePath() != null) {
            // 删除文件
            new File(Paths.get(uploadPath, map.getImagePath()).toString()).delete();
        }
        mapMapper.deleteMapByMapId(mapId);
    }
    
    @Override
    public void batchDeleteMapsByMapIds(List<Long> mapIds) {
        // 删除文件
        for (Long mapId : mapIds) {
            MapEntity map = mapMapper.selectMapByMapId(mapId);
            if (map != null && map.getImagePath() != null) {
                new File(Paths.get(uploadPath, map.getImagePath()).toString()).delete();
            }
        }
        
        // 批量删除数据库记录
        mapMapper.batchDeleteMapsByMapIds(mapIds);
    }
    
    private String getFileExtension(String filename) {
        return filename.substring(filename.lastIndexOf("."));
    }
}