package com.wu.monitor.controller;

import com.wu.monitor.model.Map;
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

    @GetMapping
    public List<Map> getAllMaps(@RequestParam(required = false) String name) {
        return mapService.getAllMaps(name);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map> getMapById(@PathVariable Long id) {
        Map map = mapService.getMapById(id);
        return map != null ? ResponseEntity.ok(map) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public Map createMap(
            @RequestParam(value = "mapId", required = false) String mapId,
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
        Map map = new Map();
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

    @PutMapping("/{id}")
    public Map updateMap(
            @PathVariable Long id,
            @RequestParam(required = false) String mapId,
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
        Map map = new Map();
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
        return mapService.updateMap(id, map, file);
    }

    @DeleteMapping("/{id}")
    public void deleteMap(@PathVariable Long id) {
        mapService.deleteMap(id);
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<Resource> getMapImage(@PathVariable Long id) {
        try {
            Map map = mapService.getMapById(id);
            if (map != null && map.getImagePath() != null) {
                Path imagePath = Paths.get(System.getProperty("user.dir"), "uploads", "maps", map.getImagePath());
                Resource resource = new UrlResource(imagePath.toUri());
                
                if (resource.exists()) {
                    return ResponseEntity.ok()
                            .contentType(MediaType.IMAGE_JPEG)
                            .body(resource);
                }
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/batch")
    public void batchDeleteMaps(@RequestBody List<Long> ids) {
        mapService.batchDeleteMaps(ids);
    }
}