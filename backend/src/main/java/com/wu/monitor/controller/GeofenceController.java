package com.wu.monitor.controller;

import com.wu.monitor.model.Geofence;
import com.wu.monitor.service.GeofenceService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/geofences")
@CrossOrigin(origins = "*")
public class GeofenceController {

    @Autowired
    private GeofenceService geofenceService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getGeofences(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Long mapId,
            @RequestParam(required = false) Boolean enabled) {
        
        try {
            List<Geofence> geofences = geofenceService.getAllGeofences(name, mapId, enabled);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "查询成功");
            response.put("data", geofences);
            response.put("total", geofences.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("查询电子围栏列表失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getGeofence(@PathVariable Long id) {
        
        try {
            Geofence geofence = geofenceService.getGeofenceById(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "查询成功");
            response.put("data", geofence);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("查询电子围栏详情失败: id={}", id, e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/map/{mapId}")
    public ResponseEntity<Map<String, Object>> getGeofencesByMapId(
            @PathVariable Long mapId,
            @RequestParam(defaultValue = "false") boolean enabledOnly) {
        
        try {
            List<Geofence> geofences;
            if (enabledOnly) {
                geofences = geofenceService.getEnabledGeofencesByMapId(mapId);
            } else {
                geofences = geofenceService.getGeofencesByMapId(mapId);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "查询成功");
            response.put("data", geofences);
            response.put("total", geofences.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("根据地图ID查询电子围栏失败: mapId={}", mapId, e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping  
    public ResponseEntity<Map<String, Object>> createGeofence(@RequestBody Geofence geofence) {
        
        try {
            Geofence createdGeofence = geofenceService.createGeofence(geofence);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "创建成功");
            response.put("data", createdGeofence);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("创建电子围栏失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "创建失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateGeofence(
            @PathVariable Long id,
            @RequestBody Geofence geofence) {
        
        try {
            geofence.setId(id);
            Geofence updatedGeofence = geofenceService.updateGeofence(geofence);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "更新成功");
            response.put("data", updatedGeofence);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("更新电子围栏失败: id={}", id, e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "更新失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Map<String, Object>> toggleGeofenceEnabled(
            @PathVariable Long id,
            @RequestParam Boolean enabled) {
        
        try {
            Geofence geofence = geofenceService.toggleGeofenceEnabled(id, enabled);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", enabled ? "启用成功" : "禁用成功");
            response.put("data", geofence);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("切换围栏状态失败: id={}, enabled={}", id, enabled, e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "操作失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteGeofence(@PathVariable Long id) {
        
        try {
            geofenceService.deleteGeofence(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "删除成功");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("删除电子围栏失败: id={}", id, e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "删除失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @DeleteMapping("/batch")
    public ResponseEntity<Map<String, Object>> batchDeleteGeofences(@RequestBody List<Long> ids) {
        
        try {
            geofenceService.batchDeleteGeofences(ids);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "批量删除成功");
            response.put("deletedCount", ids.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("批量删除电子围栏失败: ids={}", ids, e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "批量删除失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/check-point")
    public ResponseEntity<Map<String, Object>> checkPointInGeofence(
            @RequestParam Long geofenceId,
            @RequestParam Double x,
            @RequestParam Double y) {
        
        try {
            boolean isInside = geofenceService.isPointInGeofence(geofenceId, x, y);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "检查完成");
            response.put("isInside", isInside);
            
            Map<String, Double> point = new HashMap<>();
            point.put("x", x);
            point.put("y", y);
            response.put("point", point);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("检查点是否在围栏内失败: geofenceId={}, x={}, y={}", geofenceId, x, y, e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "检查失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/check-point-map")
    public ResponseEntity<Map<String, Object>> checkPointInMapGeofences(
            @RequestParam Long mapId,
            @RequestParam Double x,
            @RequestParam Double y) {
        
        try {
            List<Geofence> matchingGeofences = geofenceService.getMatchingGeofences(mapId, x, y);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "检查完成");
            response.put("matchingGeofences", matchingGeofences);
            response.put("matchCount", matchingGeofences.size());
            
            Map<String, Double> point = new HashMap<>();
            point.put("x", x);
            point.put("y", y);
            response.put("point", point);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("检查点在地图围栏中的情况失败: mapId={}, x={}, y={}", mapId, x, y, e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "检查失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/check-name")
    public ResponseEntity<Map<String, Object>> checkGeofenceName(
            @RequestParam String name,
            @RequestParam(required = false) Long excludeId) {
        
        try {
            boolean exists = geofenceService.isGeofenceNameExists(name, excludeId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "检查完成");
            response.put("exists", exists);
            response.put("name", name);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("检查围栏名称失败: name={}, excludeId={}", name, excludeId, e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "检查失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}