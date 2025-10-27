package com.wu.monitor.controller;

import com.wu.monitor.model.MapEntity;
import com.wu.monitor.service.MapService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/maps")
public class MapController {

    @Autowired
    private MapService mapService;

    // 当前选中的地图ID
    private Long currentMapId;

    @GetMapping
    public List<MapEntity> getAllMaps(@RequestParam(required = false) String name) {
        return mapService.getAllMaps(name);
    }

    @GetMapping("/{mapId}")
    public ResponseEntity<MapEntity> getMapByMapId(@PathVariable Long mapId) {
        MapEntity map = mapService.getMapByMapId(mapId);
        return map != null ? ResponseEntity.ok(map) : ResponseEntity.notFound().build();
    }

    @GetMapping("/current")
    public ResponseEntity<MapEntity> getCurrentMap() {
        if (currentMapId == null) {
            return ResponseEntity.notFound().build();
        }
        MapEntity map = mapService.getMapByMapId(currentMapId);
        return map != null ? ResponseEntity.ok(map) : ResponseEntity.notFound().build();
    }

    @PutMapping("/current/{mapId}")
    public ResponseEntity<MapEntity> setCurrentMap(@PathVariable Long mapId) {
        MapEntity map = mapService.getMapByMapId(mapId);
        if (map != null) {
            currentMapId = mapId;
            return ResponseEntity.ok(map);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public MapEntity createMap(
            @RequestParam(value = "mapId", required = false) Long mapId,
            @RequestParam("name") String name,
            @RequestParam(value = "width", required = false) Integer width,
            @RequestParam(value = "height", required = false) Integer height,
            @RequestParam(value = "originX", required = false) Integer originX,
            @RequestParam(value = "originY", required = false) Integer originY,
            @RequestParam(value = "scale", required = false) Double scale,
            @RequestParam(value = "point1X", required = false) Integer point1X,
            @RequestParam(value = "point1Y", required = false) Integer point1Y,
            @RequestParam(value = "point2X", required = false) Integer point2X,
            @RequestParam(value = "point2Y", required = false) Integer point2Y,
            @RequestParam(value = "realDistance", required = false) Double realDistance,
            @RequestParam("file") MultipartFile file
    ) {
        MapEntity map = new MapEntity();
        map.setMapId(mapId);
        map.setName(name);
        map.setWidth(width);
        map.setHeight(height);
        map.setOriginX(originX);
        map.setOriginY(originY);
        map.setScale(scale);
        map.setPoint1X(point1X);
        map.setPoint1Y(point1Y);
        map.setPoint2X(point2X);
        map.setPoint2Y(point2Y);
        map.setRealDistance(realDistance);
        return mapService.createMap(map, file);
    }

    @PutMapping("/{mapId}")
    public MapEntity updateMap(
            @PathVariable Long mapId,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Integer width,
            @RequestParam(required = false) Integer height,
            @RequestParam(required = false) Integer originX,
            @RequestParam(required = false) Integer originY,
            @RequestParam(required = false) Double scale,
            @RequestParam(required = false) Integer point1X,
            @RequestParam(required = false) Integer point1Y,
            @RequestParam(required = false) Integer point2X,
            @RequestParam(required = false) Integer point2Y,
            @RequestParam(required = false) Double realDistance,
            @RequestParam(required = false) MultipartFile file
    ) {
        MapEntity map = new MapEntity();
        map.setMapId(mapId);
        map.setName(name);
        map.setWidth(width);
        map.setHeight(height);
        map.setOriginX(originX);
        map.setOriginY(originY);
        map.setScale(scale);
        map.setPoint1X(point1X);
        map.setPoint1Y(point1Y);
        map.setPoint2X(point2X);
        map.setPoint2Y(point2Y);
        map.setRealDistance(realDistance);
        return mapService.updateMap(mapId, map, file);
    }

    @DeleteMapping("/{mapId}")
    public void deleteMap(@PathVariable Long mapId) {
        mapService.deleteMapByMapId(mapId);
    }

    @GetMapping("/{mapId}/image")
    public ResponseEntity<Resource> getMapImage(@PathVariable Long mapId) {
        try {
            MapEntity map = mapService.getMapByMapId(mapId);
            if (map != null && map.getImagePath() != null) {
                Path imagePath = Paths.get(System.getProperty("user.dir"), "uploads", "maps", map.getImagePath());
                Resource resource = new UrlResource(imagePath.toUri());
                
                if (resource.exists()) {
                    return ResponseEntity.ok()
                            .contentType(MediaType.IMAGE_JPEG)
                            // 添加缓存控制头：缓存7天，允许浏览器和代理缓存
                            .cacheControl(org.springframework.http.CacheControl.maxAge(7, java.util.concurrent.TimeUnit.DAYS).cachePublic())
                            .body(resource);
                }
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/batch")
    public void batchDeleteMaps(@RequestBody List<Long> mapIds) {
        mapService.batchDeleteMapsByMapIds(mapIds);
    }
}