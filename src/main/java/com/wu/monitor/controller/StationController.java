package com.wu.monitor.controller;

import com.wu.monitor.model.Station;
import com.wu.monitor.service.StationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stations")
public class StationController {

    @Autowired
    private StationService stationService;

    /**
     * 获取所有基站
     * @param code 基站编号（可选）
     * @param name 基站名称（可选）
     * @param status 基站状态（可选）
     * @return 基站列表
     */
    @GetMapping
    public List<Station> getAllStations(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Integer status) {
        return stationService.getAllStations(code, name, status);
    }

    /**
     * 根据ID获取基站
     * @param id 基站ID
     * @return 基站信息
     */
    @GetMapping("/{id}")
    public ResponseEntity<Station> getStationById(@PathVariable Long id) {
        Station station = stationService.getStationById(id);
        return station != null ? ResponseEntity.ok(station) : ResponseEntity.notFound().build();
    }

    /**
     * 创建基站
     * @param station 基站信息
     * @return 创建后的基站信息
     */
    @PostMapping
    public Station createStation(@RequestBody Station station) {
        return stationService.createStation(station);
    }

    /**
     * 更新基站
     * @param id 基站ID
     * @param station 基站信息
     * @return 更新后的基站信息
     */
    @PutMapping("/{id}")
    public Station updateStation(@PathVariable Long id, @RequestBody Station station) {
        return stationService.updateStation(id, station);
    }

    /**
     * 删除基站
     * @param id 基站ID
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStation(@PathVariable Long id) {
        stationService.deleteStation(id);
        return ResponseEntity.ok().build();
    }

    /**
     * 批量删除基站
     * @param ids 基站ID列表
     */
    @DeleteMapping("/batch")
    public ResponseEntity<Void> batchDeleteStations(@RequestBody List<Long> ids) {
        stationService.batchDeleteStations(ids);
        return ResponseEntity.ok().build();
    }

    /**
     * 获取指定地图下的所有基站
     * @param mapId 地图ID
     * @return 基站列表
     */
    @GetMapping("/map/{mapId}")
    public List<Station> getStationsByMapId(@PathVariable Long mapId) {
        return stationService.getStationsByMapId(mapId);
    }

    /**
     * 更新基站状态
     * @param id 基站ID
     * @param status 状态
     * @return 更新后的基站信息
     */
    @PutMapping("/{id}/status")
    public Station updateStationStatus(
            @PathVariable Long id, 
            @RequestParam Integer status) {
        return stationService.updateStationStatus(id, status);
    }
} 