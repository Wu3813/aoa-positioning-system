package com.wu.monitor.controller;

import com.wu.monitor.model.TrajectoryRecord;
import com.wu.monitor.service.TrajectoryStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/trajectory")
@RequiredArgsConstructor
@Slf4j
public class TrajectoryStorageController {
    
    private final TrajectoryStorageService trajectoryStorageService;
    
    /**
     * 获取设备历史轨迹（用于回放）- 直接使用前端传入的时间，不做时区转换
     */
    @GetMapping("/device/{deviceId}/history")
    public ResponseEntity<List<TrajectoryRecord>> getDeviceTrajectory(
            @PathVariable String deviceId,
            @RequestParam(required = false) Integer mapId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        
        try {
            log.info("查询轨迹: 设备ID={}, 地图ID={}, 开始时间={}, 结束时间={}", deviceId, mapId, startTime, endTime);
            
            // 不对时间做任何处理，直接使用前端传入的时间
            List<TrajectoryRecord> trajectory = trajectoryStorageService.getDeviceTrajectory(
                deviceId, mapId, startTime, endTime, page, size);
            
            log.info("查询到记录数: {}", trajectory.size());
            return ResponseEntity.ok(trajectory);
        } catch (Exception e) {
            log.error("获取设备轨迹异常", e);
            return ResponseEntity.internalServerError().build();
        }
    }
} 