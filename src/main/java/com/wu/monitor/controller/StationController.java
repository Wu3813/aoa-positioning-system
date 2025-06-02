package com.wu.monitor.controller;

import com.wu.monitor.model.Station;
import com.wu.monitor.service.StationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

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
    
    /**
     * 通过UDP刷新单个基站信息
     * @param id 基站ID
     * @return 刷新后的基站信息
     */
    @PostMapping("/{id}/refresh")
    public ResponseEntity<Map<String, Object>> refreshStationInfo(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Station station = stationService.refreshStationInfoFromUdp(id);
            response.put("success", true);
            response.put("message", station.getStatus() == 1 ? "基站信息刷新成功" : "基站离线，状态已更新");
            response.put("data", station);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "基站信息刷新失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 批量刷新选中的基站
     * @param request 批量刷新请求
     * @return 刷新结果
     */
    @PostMapping("/batch/refresh")
    public ResponseEntity<Map<String, Object>> batchRefreshStations(@RequestBody Map<String, List<Long>> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Long> ids = request.get("ids");
            if (ids == null || ids.isEmpty()) {
                response.put("success", false);
                response.put("message", "请选择要刷新的基站");
                return ResponseEntity.badRequest().body(response);
            }
            
            StationService.RefreshResult result = stationService.batchRefreshStationInfo(ids);
            response.put("success", true);
            response.put("message", String.format("批量刷新完成：总计%d个，成功%d个，失败%d个", 
                    result.getTotal(), result.getSuccess(), result.getFailed()));
            response.put("data", result);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "批量刷新失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 检查所有基站状态
     * @return 检查结果
     */
    @PostMapping("/check-all-status")
    public ResponseEntity<Map<String, Object>> checkAllStationsStatus() {
        Map<String, Object> response = new HashMap<>();
        try {
            StationService.RefreshResult result = stationService.checkAllStationsStatus();
            response.put("success", true);
            response.put("message", String.format("状态检查完成：总计%d个，成功%d个，失败%d个", 
                    result.getTotal(), result.getSuccess(), result.getFailed()));
            response.put("data", result);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "状态检查失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 测试UDP连接并获取基站信息
     * @param request 测试请求，包含IP地址
     * @return 测试结果和基站信息
     */
    @PostMapping("/test-connection")
    public ResponseEntity<Map<String, Object>> testConnection(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String ipAddress = request.get("ipAddress");
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "IP地址不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            Map<String, Object> result = stationService.testUdpConnection(ipAddress.trim());
            response.put("success", true);
            response.put("message", "UDP连接测试成功");
            response.put("data", result);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "UDP连接测试失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 开启标签广播数据上报
     * @param request 包含IP地址的请求
     * @return 操作结果
     */
    @PostMapping("/enable-broadcast")
    public ResponseEntity<Map<String, Object>> enableBroadcast(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String ipAddress = request.get("ipAddress");
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "IP地址不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            boolean result = stationService.enableBroadcast(ipAddress.trim());
            if (result) {
                response.put("success", true);
                response.put("message", "标签广播数据上报开启成功");
            } else {
                response.put("success", false);
                response.put("message", "标签广播数据上报开启失败");
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "开启标签广播数据上报失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 开启扫描
     * @param request 包含IP地址的请求
     * @return 操作结果
     */
    @PostMapping("/enable-scanning")
    public ResponseEntity<Map<String, Object>> enableScanning(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String ipAddress = request.get("ipAddress");
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "IP地址不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            boolean result = stationService.enableScanning(ipAddress.trim());
            if (result) {
                response.put("success", true);
                response.put("message", "扫描开启成功");
            } else {
                response.put("success", false);
                response.put("message", "扫描开启失败");
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "开启扫描失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 恢复出厂设置
     * @param request 包含IP地址的请求
     * @return 操作结果
     */
    @PostMapping("/factory-reset")
    public ResponseEntity<Map<String, Object>> factoryReset(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String ipAddress = request.get("ipAddress");
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "IP地址不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            boolean result = stationService.factoryReset(ipAddress.trim());
            if (result) {
                response.put("success", true);
                response.put("message", "恢复出厂设置成功");
            } else {
                response.put("success", false);
                response.put("message", "恢复出厂设置失败");
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "恢复出厂设置失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 重启基站
     * @param request 包含IP地址的请求
     * @return 操作结果
     */
    @PostMapping("/restart")
    public ResponseEntity<Map<String, Object>> restartStation(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String ipAddress = request.get("ipAddress");
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "IP地址不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            boolean result = stationService.restartStation(ipAddress.trim());
            if (result) {
                response.put("success", true);
                response.put("message", "基站重启成功");
            } else {
                response.put("success", false);
                response.put("message", "基站重启失败");
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "基站重启失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 基站定位
     * @param request 包含IP地址的请求
     * @return 操作结果
     */
    @PostMapping("/locate")
    public ResponseEntity<Map<String, Object>> locateStation(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String ipAddress = request.get("ipAddress");
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "IP地址不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            boolean result = stationService.locateStation(ipAddress.trim());
            if (result) {
                response.put("success", true);
                response.put("message", "基站定位成功，基站灯将闪烁100次");
            } else {
                response.put("success", false);
                response.put("message", "基站定位失败");
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "基站定位失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
} 