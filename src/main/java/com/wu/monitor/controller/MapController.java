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
            @RequestParam("xMin") Double xMin,
            @RequestParam("xMax") Double xMax,
            @RequestParam("yMin") Double yMin,
            @RequestParam("yMax") Double yMax,
            @RequestParam("file") MultipartFile file
    ) {
        Map map = new Map();
        map.setMapId(mapId);
        map.setName(name);
        map.setXMin(xMin);
        map.setXMax(xMax);
        map.setYMin(yMin);
        map.setYMax(yMax);
        return mapService.createMap(map, file);
    }

    @PutMapping("/{id}")
    public Map updateMap(
            @PathVariable Long id,
            @RequestParam(required = false) String mapId,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Double xMin,
            @RequestParam(required = false) Double xMax,
            @RequestParam(required = false) Double yMin,
            @RequestParam(required = false) Double yMax,
            @RequestParam(required = false) MultipartFile file
    ) {
        Map map = new Map();
        map.setMapId(mapId);
        map.setName(name);
        map.setXMin(xMin);
        map.setXMax(xMax);
        map.setYMin(yMin);
        map.setYMax(yMax);
        return mapService.updateMap(id, map, file);
    }

    @DeleteMapping("/{id}")
    public void deleteMap(@PathVariable Long id) {
        mapService.deleteMap(id);
    }

    @GetMapping("/current")
    public ResponseEntity<Map> getCurrentMap() {
        Map map = mapService.getCurrentMap();
        return map != null ? ResponseEntity.ok(map) : ResponseEntity.notFound().build();
    }

    @PutMapping("/current/{id}")
    public void setCurrentMap(@PathVariable Long id) {
        mapService.setCurrentMap(id);
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