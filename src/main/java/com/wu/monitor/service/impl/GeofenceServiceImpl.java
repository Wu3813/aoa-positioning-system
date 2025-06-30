package com.wu.monitor.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wu.monitor.exception.ResourceNotFoundException;
import com.wu.monitor.mapper.GeofenceMapper;
import com.wu.monitor.model.Geofence;
import com.wu.monitor.service.GeofenceService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class GeofenceServiceImpl implements GeofenceService {

    @Autowired
    private GeofenceMapper geofenceMapper;

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public List<Geofence> getAllGeofences(String name, Long mapId, Boolean enabled) {
        log.info("查询电子围栏列表: name={}, mapId={}, enabled={}", name, mapId, enabled);
        List<Geofence> geofences = geofenceMapper.selectAllGeofences(name, mapId, enabled);
        
        // 将坐标字符串转换为坐标点列表
        for (Geofence geofence : geofences) {
            convertCoordinatesToPoints(geofence);
        }
        
        return geofences;
    }

    @Override
    public Geofence getGeofenceById(Long id) {
        log.info("根据ID查询电子围栏: id={}", id);
        Geofence geofence = geofenceMapper.selectGeofenceById(id);
        if (geofence == null) {
            throw new ResourceNotFoundException("电子围栏不存在: id=" + id);
        }
        
        convertCoordinatesToPoints(geofence);
        return geofence;
    }

    @Override
    public List<Geofence> getGeofencesByMapId(Long mapId) {
        log.info("根据地图ID查询电子围栏: mapId={}", mapId);
        List<Geofence> geofences = geofenceMapper.selectGeofencesByMapId(mapId);
        
        for (Geofence geofence : geofences) {
            convertCoordinatesToPoints(geofence);
        }
        
        return geofences;
    }

    @Override
    public List<Geofence> getEnabledGeofencesByMapId(Long mapId) {
        log.info("根据地图ID查询启用的电子围栏: mapId={}", mapId);
        List<Geofence> geofences = geofenceMapper.selectEnabledGeofencesByMapId(mapId);
        
        for (Geofence geofence : geofences) {
            convertCoordinatesToPoints(geofence);
        }
        
        return geofences;
    }

    @Override
    @Transactional
    public Geofence createGeofence(Geofence geofence) {
        log.info("创建电子围栏: name={}", geofence.getName());
        
        // 验证参数
        validateGeofence(geofence, false);
        
        // 检查名称是否重复
        if (isGeofenceNameExists(geofence.getName(), null)) {
            throw new IllegalArgumentException("围栏名称已存在: " + geofence.getName());
        }
        
        // 设置创建时间
        geofence.setCreateTime(LocalDateTime.now());
        
        // 转换坐标点为JSON字符串
        convertPointsToCoordinates(geofence);
        
        int result = geofenceMapper.insertGeofence(geofence);
        if (result <= 0) {
            throw new RuntimeException("创建电子围栏失败");
        }
        
        log.info("成功创建电子围栏: id={}, name={}", geofence.getId(), geofence.getName());
        return getGeofenceById(geofence.getId());
    }

    @Override
    @Transactional
    public Geofence updateGeofence(Geofence geofence) {
        log.info("更新电子围栏: id={}, name={}", geofence.getId(), geofence.getName());
        
        // 检查围栏是否存在
        Geofence existingGeofence = geofenceMapper.selectGeofenceById(geofence.getId());
        if (existingGeofence == null) {
            throw new ResourceNotFoundException("电子围栏不存在: id=" + geofence.getId());
        }
        
        // 验证参数
        validateGeofence(geofence, true);
        
        // 检查名称是否重复
        if (isGeofenceNameExists(geofence.getName(), geofence.getId())) {
            throw new IllegalArgumentException("围栏名称已存在: " + geofence.getName());
        }
        
        // 转换坐标点为JSON字符串
        convertPointsToCoordinates(geofence);
        
        int result = geofenceMapper.updateGeofence(geofence);
        if (result <= 0) {
            throw new RuntimeException("更新电子围栏失败");
        }
        
        log.info("成功更新电子围栏: id={}, name={}", geofence.getId(), geofence.getName());
        return getGeofenceById(geofence.getId());
    }

    @Override
    @Transactional
    public Geofence toggleGeofenceEnabled(Long id, Boolean enabled) {
        log.info("切换围栏启用状态: id={}, enabled={}", id, enabled);
        
        // 检查围栏是否存在
        Geofence existingGeofence = geofenceMapper.selectGeofenceById(id);
        if (existingGeofence == null) {
            throw new ResourceNotFoundException("电子围栏不存在: id=" + id);
        }
        
        int result = geofenceMapper.updateGeofenceEnabled(id, enabled);
        if (result <= 0) {
            throw new RuntimeException("更新围栏状态失败");
        }
        
        log.info("成功切换围栏启用状态: id={}, enabled={}", id, enabled);
        return getGeofenceById(id);
    }

    @Override
    @Transactional
    public void deleteGeofence(Long id) {
        log.info("删除电子围栏: id={}", id);
        
        // 检查围栏是否存在
        Geofence existingGeofence = geofenceMapper.selectGeofenceById(id);
        if (existingGeofence == null) {
            throw new ResourceNotFoundException("电子围栏不存在: id=" + id);
        }
        
        int result = geofenceMapper.deleteGeofenceById(id);
        if (result <= 0) {
            throw new RuntimeException("删除电子围栏失败");
        }
        
        log.info("成功删除电子围栏: id={}", id);
    }

    @Override
    @Transactional
    public void batchDeleteGeofences(List<Long> ids) {
        log.info("批量删除电子围栏: ids={}", ids);
        
        if (ids == null || ids.isEmpty()) {
            throw new IllegalArgumentException("删除的围栏ID列表不能为空");
        }
        
        geofenceMapper.batchDeleteGeofences(ids);
        log.info("成功批量删除电子围栏: count={}", ids.size());
    }

    @Override
    public boolean isGeofenceNameExists(String name, Long excludeId) {
        if (!StringUtils.hasText(name)) {
            return false;
        }
        
        Geofence existingGeofence = geofenceMapper.selectGeofenceByName(name, excludeId);
        return existingGeofence != null;
    }

    @Override
    public boolean isPointInGeofence(Long geofenceId, Double x, Double y) {
        Geofence geofence = geofenceMapper.selectGeofenceById(geofenceId);
        if (geofence == null || !geofence.getEnabled()) {
            return false;
        }
        
        convertCoordinatesToPoints(geofence);
        return isPointInPolygon(x, y, geofence.getPoints());
    }

    @Override
    public List<Geofence> getMatchingGeofences(Long mapId, Double x, Double y) {
        List<Geofence> enabledGeofences = getEnabledGeofencesByMapId(mapId);
        
        return enabledGeofences.stream()
                .filter(geofence -> isPointInPolygon(x, y, geofence.getPoints()))
                .collect(Collectors.toList());
    }

    /**
     * 验证围栏参数
     */
    private void validateGeofence(Geofence geofence, boolean isUpdate) {
        if (!isUpdate && geofence.getId() != null) {
            throw new IllegalArgumentException("创建围栏时不能指定ID");
        }
        
        if (isUpdate && geofence.getId() == null) {
            throw new IllegalArgumentException("更新围栏时必须指定ID");
        }
        
        if (!StringUtils.hasText(geofence.getName())) {
            throw new IllegalArgumentException("围栏名称不能为空");
        }
        
        if (geofence.getMapId() == null) {
            throw new IllegalArgumentException("地图ID不能为空");
        }
        
        if (geofence.getPoints() == null || geofence.getPoints().isEmpty()) {
            throw new IllegalArgumentException("围栏坐标点不能为空");
        }
        
        if (geofence.getPoints().size() < 3) {
            throw new IllegalArgumentException("围栏至少需要3个坐标点");
        }
        
        // 验证坐标点
        for (Geofence.GeofencePoint point : geofence.getPoints()) {
            if (point.getX() == null || point.getY() == null) {
                throw new IllegalArgumentException("坐标点的X和Y值不能为空");
            }
        }
    }

    /**
     * 将坐标字符串转换为坐标点列表
     */
    private void convertCoordinatesToPoints(Geofence geofence) {
        if (StringUtils.hasText(geofence.getCoordinates())) {
            try {
                List<Geofence.GeofencePoint> points = objectMapper.readValue(
                        geofence.getCoordinates(), 
                        new TypeReference<List<Geofence.GeofencePoint>>() {}
                );
                geofence.setPoints(points);
            } catch (JsonProcessingException e) {
                log.error("解析围栏坐标失败: id={}, coordinates={}", geofence.getId(), geofence.getCoordinates(), e);
                geofence.setPoints(new ArrayList<>());
            }
        } else {
            geofence.setPoints(new ArrayList<>());
        }
    }

    /**
     * 将坐标点列表转换为JSON字符串
     */
    private void convertPointsToCoordinates(Geofence geofence) {
        if (geofence.getPoints() != null) {
            try {
                String coordinates = objectMapper.writeValueAsString(geofence.getPoints());
                geofence.setCoordinates(coordinates);
            } catch (JsonProcessingException e) {
                log.error("转换围栏坐标失败: points={}", geofence.getPoints(), e);
                throw new RuntimeException("转换围栏坐标失败", e);
            }
        }
    }

    /**
     * 射线法判断点是否在多边形内
     * @param x 点的X坐标
     * @param y 点的Y坐标
     * @param points 多边形顶点列表
     * @return 是否在多边形内
     */
    private boolean isPointInPolygon(Double x, Double y, List<Geofence.GeofencePoint> points) {
        if (points == null || points.size() < 3) {
            return false;
        }
        
        int intersectCount = 0;
        int pointCount = points.size();
        
        for (int i = 0; i < pointCount; i++) {
            Geofence.GeofencePoint p1 = points.get(i);
            Geofence.GeofencePoint p2 = points.get((i + 1) % pointCount);
            
            // 检查射线是否与边相交
            if (isRayIntersectSegment(x, y, p1, p2)) {
                intersectCount++;
            }
        }
        
        // 奇数个交点表示在多边形内
        return (intersectCount % 2) == 1;
    }

    /**
     * 判断射线是否与线段相交
     */
    private boolean isRayIntersectSegment(Double px, Double py, 
                                        Geofence.GeofencePoint p1, 
                                        Geofence.GeofencePoint p2) {
        // 确保p1在p2下方
        if (p1.getY() > p2.getY()) {
            Geofence.GeofencePoint temp = p1;
            p1 = p2;
            p2 = temp;
        }
        
        // 射线在线段外
        if (py < p1.getY() || py >= p2.getY()) {
            return false;
        }
        
        // 射线在线段左侧
        if (px >= Math.max(p1.getX(), p2.getX())) {
            return false;
        }
        
        // 射线在线段右侧
        if (px < Math.min(p1.getX(), p2.getX())) {
            return true;
        }
        
        // 计算交点的X坐标
        double intersectX = p1.getX() + (py - p1.getY()) * (p2.getX() - p1.getX()) / (p2.getY() - p1.getY());
        
        return px < intersectX;
    }
} 