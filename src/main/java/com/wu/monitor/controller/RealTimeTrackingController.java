package com.wu.monitor.controller;

import com.wu.monitor.model.Path;
import com.wu.monitor.model.PathDataDto;
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
    public ResponseEntity<Void> receiveTrackingData(@RequestBody Path pathData) {
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
    public ResponseEntity<Void> receiveBatchTrackingData(@RequestBody List<Path> pathDataList) {
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
    @PostMapping("/paths/async-batch")
    public ResponseEntity<Void> receiveAsyncBatchTrackingData(@RequestBody List<Path> pathDataList) {
        try {
            // 异步处理数据，立即返回
            CompletableFuture.runAsync(() -> {
                try {
                    trackingService.receiveBatchTrackingData(pathDataList);
                } catch (Exception e) {
                    log.error("异步批量处理异常", e);
                }
            });
            return ResponseEntity.accepted().build(); // 返回202 Accepted
        } catch (Exception e) {
            log.error("提交异步批量处理任务异常", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 获取活跃设备列表
     */
    @GetMapping("/devices")
    public ResponseEntity<List<String>> getActiveDevices() {
        try {
            return ResponseEntity.ok(trackingService.getActiveDevices());
        } catch (Exception e) {
            log.error("获取活跃设备列表异常", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 获取设备最新位置
     */
    @GetMapping("/devices/{deviceId}/latest")
    public ResponseEntity<PathDataDto> getLatestPosition(@PathVariable String deviceId) {
        try {
            PathDataDto latest = trackingService.getLatestPosition(deviceId);
            return latest != null ? ResponseEntity.ok(latest) : ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("获取设备最新位置异常: {}", deviceId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 获取设备历史轨迹
     */
    @GetMapping("/devices/{deviceId}/history")
    public ResponseEntity<List<PathDataDto>> getDeviceHistory(
            @PathVariable String deviceId,
            @RequestParam(defaultValue = "100") int limit) {
        try {
            return ResponseEntity.ok(trackingService.getDeviceHistory(deviceId, limit));
        } catch (Exception e) {
            log.error("获取设备历史轨迹异常: {}", deviceId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 手动清理设备数据
     */
    @DeleteMapping("/devices/{deviceId}")
    public ResponseEntity<Void> cleanDeviceData(@PathVariable String deviceId) {
        try {
            trackingService.cleanExpiredData(deviceId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("清理设备数据异常: {}", deviceId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}