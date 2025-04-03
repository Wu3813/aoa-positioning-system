package com.wu.monitor.controller;



import com.wu.monitor.model.Path;
import com.wu.monitor.service.MonitorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api")
public class MonitorController {

    private final MonitorService service;

    @Autowired
    public MonitorController(MonitorService service) {
        this.service = service;
    }

    @GetMapping("/paths")
    public ResponseEntity<List<Path>> getAll() {
        return ResponseEntity.ok(service.getAllTrajectories());
    }

    @GetMapping("/paths/{deviceId}")
    public ResponseEntity<List<Path>> getByDevice(
            @PathVariable String deviceId) {
        List<Path> data = service.getByDeviceId(deviceId);
        return data.isEmpty() ?
                ResponseEntity.notFound().build() :
                ResponseEntity.ok(data);
    }
    
}