package com.wu.monitor.service;

import com.wu.monitor.model.Path;


import java.util.List;

public interface MonitorService {
    List<Path> getAllTrajectories();
    List<Path> getByDeviceId(String deviceId);

}
