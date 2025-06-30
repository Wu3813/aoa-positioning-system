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
    public List<Map> getAllMaps(String name) {
        return mapMapper.selectAllMaps(name);
    }
    
    @Override
    public Map getMapById(Long id) {
        return mapMapper.selectMapById(id);
    }
    
    @Override
    public Map createMap(Map map, MultipartFile file) {
        // 检查 mapId 是否为空
        if (map.getMapId() == null) {
            throw new RuntimeException("地图ID不能为空");
        }
        
        // 检查 mapId 是否已存在
        Map existingMap = mapMapper.selectMapByMapId(map.getMapId());
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
    public Map updateMap(Long id, Map map, MultipartFile file) {
        Map existingMap = mapMapper.selectMapById(id);
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
        map.setId(id);
        // 保留原有的创建时间
        map.setCreateTime(existingMap.getCreateTime());
        // 如果没有新文件，保留原有的图片路径
        if (map.getImagePath() == null) {
            map.setImagePath(existingMap.getImagePath());
        }
        
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
    public void batchDeleteMaps(List<Long> ids) {
        // 删除文件
        for (Long id : ids) {
            Map map = mapMapper.selectMapById(id);
            if (map != null && map.getImagePath() != null) {
                new File(Paths.get(uploadPath, map.getImagePath()).toString()).delete();
            }
        }
        
        // 批量删除数据库记录
        mapMapper.batchDeleteMaps(ids);
    }
    
    private String getFileExtension(String filename) {
        return filename.substring(filename.lastIndexOf("."));
    }
}