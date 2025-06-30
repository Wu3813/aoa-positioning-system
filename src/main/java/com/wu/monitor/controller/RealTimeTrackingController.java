package com.wu.monitor.controller;

import com.wu.monitor.model.TrackingData;
import com.wu.monitor.service.RealTimeTrackingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/realtime")
@RequiredArgsConstructor
@Slf4j
public class RealTimeTrackingController {
    
    private final RealTimeTrackingService trackingService;
    
    /**
     * 接收单个轨迹数据 
     */
    @PostMapping("/path")
    public ResponseEntity<Void> receiveTrackingData(@RequestBody TrackingData pathData) {
        try {
            trackingService.receiveTrackingData(pathData);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("接收单个轨迹数据异常", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 批量接收轨迹数据 - 标准批处理
     */
    @PostMapping("/paths/batch")
    public ResponseEntity<Void> receiveBatchTrackingData(@RequestBody List<TrackingData> pathDataList) {
        try {
            trackingService.receiveBatchTrackingData(pathDataList);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("批量接收轨迹数据异常", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 批量接收轨迹数据 - 异步方式，适合超大规模并发
     */
    @PostMapping("/paths/batch-async")
    public ResponseEntity<Void> receiveBatchTrackingDataAsync(@RequestBody List<TrackingData> pathDataList) {
        try {
            // 异步处理，立即返回
            CompletableFuture.runAsync(() -> {
                trackingService.receiveBatchTrackingData(pathDataList);
            });
            return ResponseEntity.accepted().build(); // 202 Accepted
        } catch (Exception e) {
            log.error("异步批量接收轨迹数据异常", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 获取指定设备的最新位置
     */
    @GetMapping("/device/{deviceId}/latest")
    public ResponseEntity<TrackingData> getLatestPosition(@PathVariable String deviceId) {
        try {
            TrackingData latest = trackingService.getLatestPosition(deviceId);
            if (latest != null) {
                return ResponseEntity.ok(latest);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("获取最新位置异常", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 获取指定设备的历史轨迹
     */
    @GetMapping("/device/{deviceId}/history")
    public ResponseEntity<List<TrackingData>> getDeviceHistory(
            @PathVariable String deviceId,
            @RequestParam(defaultValue = "100") int limit) {
        try {
            List<TrackingData> history = trackingService.getDeviceHistory(deviceId, limit);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            log.error("获取设备历史轨迹异常", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 获取所有活跃设备列表
     */
    @GetMapping("/devices")
    public ResponseEntity<List<String>> getActiveDevices() {
        try {
            List<String> devices = trackingService.getActiveDevices();
            return ResponseEntity.ok(devices);
        } catch (Exception e) {
            log.error("获取活跃设备列表异常", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}