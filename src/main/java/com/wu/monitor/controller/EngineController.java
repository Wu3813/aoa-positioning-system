package com.wu.monitor.controller;

import com.wu.monitor.model.Engine;
import com.wu.monitor.service.EngineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/engines")
public class EngineController {

    @Autowired
    private EngineService engineService;

    /**
     * 获取所有引擎
     */
    @GetMapping
    public List<Engine> getAllEngines(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Integer status) {
        return engineService.getAllEngines(code, name, status);
    }

    /**
     * 根据ID获取引擎
     */
    @GetMapping("/{id}")
    public ResponseEntity<Engine> getEngineById(@PathVariable Long id) {
        Engine engine = engineService.getEngineById(id);
        return engine != null ? ResponseEntity.ok(engine) : ResponseEntity.notFound().build();
    }

    /**
     * 创建引擎
     */
    @PostMapping
    public Engine createEngine(@RequestBody Engine engine) {
        return engineService.createEngine(engine);
    }

    /**
     * 更新引擎
     */
    @PutMapping("/{id}")
    public Engine updateEngine(@PathVariable Long id, @RequestBody Engine engine) {
        return engineService.updateEngine(id, engine);
    }

    /**
     * 删除引擎
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEngine(@PathVariable Long id) {
        engineService.deleteEngine(id);
        return ResponseEntity.ok().build();
    }

    /**
     * 批量删除引擎
     */
    @DeleteMapping("/batch")
    public ResponseEntity<Void> batchDeleteEngines(@RequestBody List<Long> ids) {
        engineService.batchDeleteEngines(ids);
        return ResponseEntity.ok().build();
    }

    /**
     * 获取指定地图下的所有引擎
     */
    @GetMapping("/map/{mapId}")
    public List<Engine> getEnginesByMapId(@PathVariable Long mapId) {
        return engineService.getEnginesByMapId(mapId);
    }

    /**
     * 更新引擎状态
     */
    @PutMapping("/{id}/status")
    public Engine updateEngineStatus(
            @PathVariable Long id,
            @RequestParam Integer status) {
        return engineService.updateEngineStatus(id, status);
    }
} 