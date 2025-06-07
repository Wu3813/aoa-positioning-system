package com.wu.monitor.service.impl;

import com.wu.monitor.mapper.StationMapper;
import com.wu.monitor.model.Station;
import com.wu.monitor.service.StationService;
import com.wu.monitor.util.UdpStationInfoUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class StationServiceImpl implements StationService {

    private static final Logger log = LoggerFactory.getLogger(StationServiceImpl.class);

    @Autowired
    private StationMapper stationMapper;
    
    @Autowired
    private UdpStationInfoUtil udpStationInfoUtil;

    @Override
    public List<Station> getAllStations(String code, String name, Integer status) {
        return stationMapper.selectAllStations(code, name, status);
    }

    @Override
    public Station getStationById(Long id) {
        return stationMapper.selectStationById(id);
    }

    @Override
    @Transactional
    public Station createStation(Station station) {
        // 检查编号和MAC地址是否重复
        Station existingByCode = stationMapper.selectStationByCode(station.getCode());
        if (existingByCode != null) {
            throw new RuntimeException("基站编号已存在");
        }
        
        // 如果有MAC地址则检查重复
        if (station.getMacAddress() != null && !station.getMacAddress().trim().isEmpty()) {
            Station existingByMac = stationMapper.selectStationByMacAddress(station.getMacAddress());
            if (existingByMac != null) {
                throw new RuntimeException("MAC地址已存在");
            }
        }
        
        // 设置创建时间
        station.setCreateTime(LocalDateTime.now());
        
        // 如果没有设置最后通信时间，则设置为当前时间
        if (station.getLastCommunication() == null) {
            station.setLastCommunication(LocalDateTime.now());
        }
        
        // 如果提供了IP地址，尝试通过UDP获取基站信息
        if (station.getIpAddress() != null && !station.getIpAddress().trim().isEmpty()) {
            try {
                UdpStationInfoUtil.StationInfo udpInfo = udpStationInfoUtil.getStationInfo(station.getIpAddress());
                
                if (udpInfo != null) {
                    // UDP通信成功，更新基站信息
                    station.setModel(udpInfo.getModel());
                    station.setMacAddress(udpInfo.getMacAddress());
                    station.setFirmwareVersion(udpInfo.getFirmwareVersion());
                    station.setScanEnabled(udpInfo.isScanEnabled());
                    station.setStatus(1); // 设置为在线
                    station.setLastCommunication(LocalDateTime.now());
                    
                    // 基站在线时，获取三轴加速度数据
                    UdpStationInfoUtil.AccelerationInfo accelerationInfo = udpStationInfoUtil.getAccelerationInfo(station.getIpAddress());
                    if (accelerationInfo != null) {
                        station.setPositionX(accelerationInfo.getAccelerationX());
                        station.setPositionY(accelerationInfo.getAccelerationY());
                        station.setPositionZ(accelerationInfo.getAccelerationZ());
                        log.info("创建基站 {} - 加速度数据获取成功 - X: {}, Y: {}, Z: {}", 
                                station.getCode(), accelerationInfo.getAccelerationX(), 
                                accelerationInfo.getAccelerationY(), accelerationInfo.getAccelerationZ());
                    } else {
                        log.warn("创建基站 {} - 加速度数据获取失败", station.getCode());
                    }
                    
                    log.info("创建基站 {} - UDP连接成功，型号: {}，MAC: {}，固件版本: {}，扫描功能: {}", 
                            station.getCode(), udpInfo.getModel(), udpInfo.getMacAddress(), 
                            udpInfo.getFirmwareVersion(), udpInfo.isScanEnabled());
                } else {
                    // UDP通信失败，设置为初始化状态
                    station.setStatus(2); // 初始化状态
                    station.setScanEnabled(null);
                    log.warn("创建基站 {} - UDP通信失败，设置为初始化状态", station.getCode());
                }
            } catch (Exception e) {
                // UDP获取失败，设置为初始化状态，保留用户输入的基本信息
                station.setStatus(2); // 初始化状态
                station.setScanEnabled(null);
                log.warn("创建基站 {} - UDP连接异常: {}，设置为初始化状态", station.getCode(), e.getMessage());
            }
        } else {
            // 没有IP地址，设置为初始化状态
            station.setStatus(2);
            station.setScanEnabled(null);
        }
        
        stationMapper.insertStation(station);
        return station;
    }

    @Override
    @Transactional
    public Station updateStation(Long id, Station station) {
        Station existingStation = stationMapper.selectStationById(id);
        if (existingStation == null) {
            throw new RuntimeException("基站不存在");
        }
        
        // 检查编号是否重复
        if (station.getCode() != null && !station.getCode().equals(existingStation.getCode())) {
            Station existingByCode = stationMapper.selectStationByCode(station.getCode());
            if (existingByCode != null) {
                throw new RuntimeException("基站编号已存在");
            }
        }
        
        // 设置ID
        station.setId(id);
        
        // 保留原有的创建时间
        station.setCreateTime(existingStation.getCreateTime());
        
        // 如果IP地址发生变化，尝试通过UDP重新获取基站信息
        boolean ipChanged = (station.getIpAddress() != null && 
                            !station.getIpAddress().equals(existingStation.getIpAddress())) ||
                           (station.getIpAddress() == null && existingStation.getIpAddress() != null);
        
        if (station.getIpAddress() != null && !station.getIpAddress().trim().isEmpty()) {
            try {
                UdpStationInfoUtil.StationInfo udpInfo = udpStationInfoUtil.getStationInfo(station.getIpAddress());
                if (udpInfo != null) {
                    // UDP通信成功，更新获取到的信息
                    station.setMacAddress(udpInfo.getMacAddress());
                    station.setModel(udpInfo.getModel());
                    station.setFirmwareVersion(udpInfo.getFirmwareVersion());
                    station.setScanEnabled(udpInfo.isScanEnabled());
                    station.setStatus(1); // 在线
                    station.setLastCommunication(LocalDateTime.now());
                    
                    // 获取加速度数据
                    UdpStationInfoUtil.AccelerationInfo accelerationInfo = udpStationInfoUtil.getAccelerationInfo(station.getIpAddress());
                    if (accelerationInfo != null) {
                        station.setPositionX(accelerationInfo.getAccelerationX());
                        station.setPositionY(accelerationInfo.getAccelerationY());
                        station.setPositionZ(accelerationInfo.getAccelerationZ());
                    }
                    
                    // 保留原有坐标数据（坐标是手动输入的，不受UDP影响）
                    if (station.getCoordinateX() == null) {
                        station.setCoordinateX(existingStation.getCoordinateX());
                    }
                    if (station.getCoordinateY() == null) {
                        station.setCoordinateY(existingStation.getCoordinateY());
                    }
                    if (station.getCoordinateZ() == null) {
                        station.setCoordinateZ(existingStation.getCoordinateZ());
                    }
                    
                    log.info("更新基站 {} - UDP连接成功，自动获取基站信息", station.getCode());
                } else {
                    // UDP通信失败，保留原有的技术信息，只更新用户输入的基本信息
                    station.setMacAddress(existingStation.getMacAddress());
                    station.setModel(existingStation.getModel());
                    station.setFirmwareVersion(existingStation.getFirmwareVersion());
                    station.setScanEnabled(null); // UDP失败时扫描状态设为未知
                    station.setPositionX(existingStation.getPositionX());
                    station.setPositionY(existingStation.getPositionY());
                    station.setPositionZ(existingStation.getPositionZ());
                    // 保留原有坐标数据（坐标是手动输入的，不受UDP影响）
                    if (station.getCoordinateX() == null) {
                        station.setCoordinateX(existingStation.getCoordinateX());
                    }
                    if (station.getCoordinateY() == null) {
                        station.setCoordinateY(existingStation.getCoordinateY());
                    }
                    if (station.getCoordinateZ() == null) {
                        station.setCoordinateZ(existingStation.getCoordinateZ());
                    }
                    station.setStatus(2); // 初始化状态
                    station.setLastCommunication(LocalDateTime.now());
                    
                    log.warn("更新基站 {} - UDP连接失败，保留原有技术信息", station.getCode());
                }
            } catch (Exception e) {
                // UDP获取失败，保留原有的技术信息，只更新用户输入的基本信息
                station.setMacAddress(existingStation.getMacAddress());
                station.setModel(existingStation.getModel());
                station.setFirmwareVersion(existingStation.getFirmwareVersion());
                station.setScanEnabled(null); // UDP异常时扫描状态设为未知
                station.setPositionX(existingStation.getPositionX());
                station.setPositionY(existingStation.getPositionY());
                station.setPositionZ(existingStation.getPositionZ());
                // 保留原有坐标数据（坐标是手动输入的，不受UDP影响）
                if (station.getCoordinateX() == null) {
                    station.setCoordinateX(existingStation.getCoordinateX());
                }
                if (station.getCoordinateY() == null) {
                    station.setCoordinateY(existingStation.getCoordinateY());
                }
                if (station.getCoordinateZ() == null) {
                    station.setCoordinateZ(existingStation.getCoordinateZ());
                }
                station.setStatus(2); // 初始化状态
                station.setLastCommunication(LocalDateTime.now());
                
                log.warn("更新基站 {} - UDP连接异常: {}，保留原有技术信息", station.getCode(), e.getMessage());
            }
        } else {
            // 没有IP地址，保留原有技术信息，设置为初始化状态
            station.setMacAddress(existingStation.getMacAddress());
            station.setModel(existingStation.getModel());
            station.setFirmwareVersion(existingStation.getFirmwareVersion());
            station.setScanEnabled(null); // 没有IP地址时扫描状态设为未知
            station.setPositionX(existingStation.getPositionX());
            station.setPositionY(existingStation.getPositionY());
            station.setPositionZ(existingStation.getPositionZ());
            // 保留原有坐标数据（坐标是手动输入的，不受UDP影响）
            if (station.getCoordinateX() == null) {
                station.setCoordinateX(existingStation.getCoordinateX());
            }
            if (station.getCoordinateY() == null) {
                station.setCoordinateY(existingStation.getCoordinateY());
            }
            if (station.getCoordinateZ() == null) {
                station.setCoordinateZ(existingStation.getCoordinateZ());
            }
            station.setStatus(2); // 初始化状态
            station.setLastCommunication(LocalDateTime.now());
        }
        
        stationMapper.updateStation(station);
        return stationMapper.selectStationById(id);
    }

    @Override
    @Transactional
    public void deleteStation(Long id) {
        Station station = stationMapper.selectStationById(id);
        if (station == null) {
            throw new RuntimeException("基站不存在");
        }
        
        stationMapper.deleteStationById(id);
    }

    @Override
    @Transactional
    public void batchDeleteStations(List<Long> ids) {
        if (ids != null && !ids.isEmpty()) {
            stationMapper.batchDeleteStations(ids);
        }
    }

    @Override
    public List<Station> getStationsByMapId(Long mapId) {
        return stationMapper.selectStationsByMapId(mapId);
    }

    @Override
    @Transactional
    public Station updateStationStatus(Long id, Integer status) {
        Station station = stationMapper.selectStationById(id);
        if (station == null) {
            throw new RuntimeException("基站不存在");
        }
        
        LocalDateTime now = LocalDateTime.now();
        
        // 如果设置为离线状态，同时将扫描状态设为未知
        if (status == 0) {
            stationMapper.updateStationStatusAndScan(id, 0, null, now);
            log.info("基站 {} 状态更新为离线，扫描状态设为未知", station.getCode());
        } else {
            // 更新状态和最后通信时间
            stationMapper.updateStationStatus(id, status, now);
        }
        
        return stationMapper.selectStationById(id);
    }
    
    @Override
    @Transactional
    public Station refreshStationInfoFromUdp(Long id) {
        Station station = stationMapper.selectStationById(id);
        if (station == null) {
            throw new RuntimeException("基站不存在");
        }
        
        if (station.getIpAddress() == null || station.getIpAddress().trim().isEmpty()) {
            throw new RuntimeException("基站IP地址为空，无法进行UDP通信");
        }
        
        // 通过UDP获取基站信息
        UdpStationInfoUtil.StationInfo udpInfo = udpStationInfoUtil.getStationInfo(station.getIpAddress());
        
        LocalDateTime now = LocalDateTime.now();
        
        if (udpInfo != null) {
            // UDP通信成功，更新基站信息并设置为在线
            station.setModel(udpInfo.getModel());
            station.setMacAddress(udpInfo.getMacAddress());
            station.setFirmwareVersion(udpInfo.getFirmwareVersion());
            station.setScanEnabled(udpInfo.isScanEnabled());
            station.setStatus(1); // 设置为在线
            station.setLastCommunication(now);
            
            // 基站在线时，获取三轴加速度数据
            UdpStationInfoUtil.AccelerationInfo accelerationInfo = udpStationInfoUtil.getAccelerationInfo(station.getIpAddress());
            if (accelerationInfo != null) {
                station.setPositionX(accelerationInfo.getAccelerationX());
                station.setPositionY(accelerationInfo.getAccelerationY());
                station.setPositionZ(accelerationInfo.getAccelerationZ());
                log.info("基站 {} 加速度数据获取成功 - X: {}, Y: {}, Z: {}", 
                        station.getCode(), accelerationInfo.getAccelerationX(), 
                        accelerationInfo.getAccelerationY(), accelerationInfo.getAccelerationZ());
            } else {
                log.warn("基站 {} 加速度数据获取失败", station.getCode());
            }
            
            stationMapper.updateStation(station);
            log.info("基站 {} (IP: {}) UDP通信成功，状态更新为在线", station.getCode(), station.getIpAddress());
        } else {
            // UDP通信失败，根据当前状态决定新状态
            int newStatus;
            if (station.getStatus() == 2) {
                // 如果当前是初始化状态，保持初始化状态
                newStatus = 2;
                log.warn("基站 {} (IP: {}) UDP通信失败，保持初始化状态", station.getCode(), station.getIpAddress());
            } else {
                // 如果当前是在线或离线状态，设置为离线状态
                newStatus = 0;
                log.warn("基站 {} (IP: {}) UDP通信失败，状态更新为离线", station.getCode(), station.getIpAddress());
            }
            
            stationMapper.updateStationStatusAndScan(station.getId(), newStatus, null, now);
            
            // 返回更新后的基站信息，而不是抛出异常
            station = stationMapper.selectStationById(id);
        }
        
        return station;
    }
    
    @Override
    public RefreshResult batchRefreshStationInfo(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return new RefreshResult(0, 0, 0);
        }
        
        int total = ids.size();
        int success = 0;
        int failed = 0;
        
        for (Long id : ids) {
            try {
                // 对每个基站进行独立的事务处理
                refreshSingleStation(id);
                success++;
            } catch (Exception e) {
                failed++;
                log.error("批量刷新: 基站 {} 处理异常: {}", id, e.getMessage());
            }
        }
        
        log.info("批量刷新完成: 总计{}个，成功{}个，失败{}个", total, success, failed);
        return new RefreshResult(total, success, failed);
    }
    
    @Transactional
    private void refreshSingleStation(Long id) {
        Station station = stationMapper.selectStationById(id);
        if (station == null) {
            log.warn("刷新基站 {} 失败: 基站不存在", id);
            throw new RuntimeException("基站不存在");
        }
        
        if (station.getIpAddress() == null || station.getIpAddress().trim().isEmpty()) {
            log.warn("刷新基站 {} ({}) 失败: IP地址为空", id, station.getCode());
            throw new RuntimeException("IP地址为空");
        }
        
        LocalDateTime now = LocalDateTime.now();
        log.debug("开始刷新基站 {} ({}), IP: {}", id, station.getCode(), station.getIpAddress());
        
        // 通过UDP获取基站信息
        UdpStationInfoUtil.StationInfo udpInfo = udpStationInfoUtil.getStationInfo(station.getIpAddress());
        
        if (udpInfo != null) {
            // UDP通信成功
            station.setModel(udpInfo.getModel());
            station.setMacAddress(udpInfo.getMacAddress());
            station.setFirmwareVersion(udpInfo.getFirmwareVersion());
            station.setScanEnabled(udpInfo.isScanEnabled());
            station.setStatus(1); // 在线
            station.setLastCommunication(now);
            
            // 基站在线时，获取三轴加速度数据
            UdpStationInfoUtil.AccelerationInfo accelerationInfo = udpStationInfoUtil.getAccelerationInfo(station.getIpAddress());
            if (accelerationInfo != null) {
                station.setPositionX(accelerationInfo.getAccelerationX());
                station.setPositionY(accelerationInfo.getAccelerationY());
                station.setPositionZ(accelerationInfo.getAccelerationZ());
            }
            
            stationMapper.updateStation(station);
            log.info("批量刷新: 基站 {} ({}) 通信成功，状态更新为在线，通讯时间: {}", id, station.getCode(), now);
        } else {
            // UDP通信失败，根据当前状态决定新状态
            int newStatus;
            if (station.getStatus() == 2) {
                // 如果当前是初始化状态，保持初始化状态
                newStatus = 2;
                log.warn("批量刷新: 基站 {} ({}) 通信失败，保持初始化状态，通讯时间: {}", id, station.getCode(), now);
            } else {
                // 如果当前是在线或离线状态，设置为离线状态
                newStatus = 0;
                log.warn("批量刷新: 基站 {} ({}) 通信失败，状态更新为离线，通讯时间: {}", id, station.getCode(), now);
            }
            
            stationMapper.updateStationStatusAndScan(station.getId(), newStatus, null, now);
        }
    }

    @Override
    public RefreshResult checkAllStationsStatus() {
        // 获取所有有IP地址的基站
        List<Station> stations = stationMapper.selectAllStations(null, null, null);
        List<Long> idsWithIp = stations.stream()
                .filter(station -> station.getIpAddress() != null && !station.getIpAddress().trim().isEmpty())
                .map(Station::getId)
                .collect(java.util.stream.Collectors.toList());
        
        if (idsWithIp.isEmpty()) {
            log.info("没有找到配置了IP地址的基站");
            return new RefreshResult(0, 0, 0);
        }
        
        log.info("开始检查 {} 个基站的在线状态", idsWithIp.size());
        return batchRefreshStationInfo(idsWithIp);
    }
    
    @Override
    public RefreshResult checkStationsStatusByIp() {
        return checkAllStationsStatus();
    }
    
    @Override
    public Map<String, Object> testUdpConnection(String ipAddress) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // 获取基站基本信息
            UdpStationInfoUtil.StationInfo stationInfo = udpStationInfoUtil.getStationInfo(ipAddress);
            if (stationInfo == null) {
                throw new RuntimeException("无法通过UDP获取基站信息，请检查IP地址或网络连接");
            }
            
            // 设置基站基本信息
            result.put("macAddress", stationInfo.getMacAddress());
            result.put("model", stationInfo.getModel());
            result.put("firmwareVersion", stationInfo.getFirmwareVersion());
            result.put("scanEnabled", stationInfo.isScanEnabled());
            
            // 获取加速度信息
            UdpStationInfoUtil.AccelerationInfo accelerationInfo = udpStationInfoUtil.getAccelerationInfo(ipAddress);
            if (accelerationInfo != null) {
                Map<String, String> accelerationData = new HashMap<>();
                accelerationData.put("accelerationX", accelerationInfo.getAccelerationX());
                accelerationData.put("accelerationY", accelerationInfo.getAccelerationY());
                accelerationData.put("accelerationZ", accelerationInfo.getAccelerationZ());
                result.put("accelerationInfo", accelerationData);
                
                log.info("UDP测试连接成功 - IP: {}, 型号: {}, MAC: {}, 固件: {}, 扫描: {}, 加速度: X={}, Y={}, Z={}", 
                        ipAddress, stationInfo.getModel(), stationInfo.getMacAddress(), 
                        stationInfo.getFirmwareVersion(), stationInfo.isScanEnabled(),
                        accelerationInfo.getAccelerationX(), accelerationInfo.getAccelerationY(), 
                        accelerationInfo.getAccelerationZ());
            } else {
                log.warn("UDP测试连接 - 基站信息获取成功，但加速度数据获取失败，IP: {}", ipAddress);
            }
            
        } catch (Exception e) {
            log.error("UDP测试连接失败 - IP: {}, 错误: {}", ipAddress, e.getMessage());
            throw new RuntimeException("UDP连接测试失败: " + e.getMessage());
        }
        
        return result;
    }
    
    @Override
    public boolean enableBroadcast(String ipAddress) {
        try {
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                throw new RuntimeException("IP地址不能为空");
            }
            
            boolean result = udpStationInfoUtil.enableBroadcast(ipAddress);
            
            if (result) {
                log.info("基站 {} 标签广播数据上报开启成功", ipAddress);
            } else {
                log.warn("基站 {} 标签广播数据上报开启失败", ipAddress);
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("基站 {} 开启标签广播数据上报失败: {}", ipAddress, e.getMessage());
            throw new RuntimeException("开启标签广播数据上报失败: " + e.getMessage());
        }
    }
    
    @Override
    public boolean enableScanning(String ipAddress) {
        try {
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                throw new RuntimeException("IP地址不能为空");
            }
            
            boolean result = udpStationInfoUtil.enableScanning(ipAddress);
            
            if (result) {
                log.info("基站 {} 扫描开启成功", ipAddress);
            } else {
                log.warn("基站 {} 扫描开启失败", ipAddress);
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("基站 {} 开启扫描失败: {}", ipAddress, e.getMessage());
            throw new RuntimeException("开启扫描失败: " + e.getMessage());
        }
    }
    
    @Override
    public boolean factoryReset(String ipAddress) {
        try {
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                throw new RuntimeException("IP地址不能为空");
            }
            
            boolean result = udpStationInfoUtil.factoryReset(ipAddress);
            
            if (result) {
                log.info("基站 {} 恢复出厂设置成功", ipAddress);
            } else {
                log.warn("基站 {} 恢复出厂设置失败", ipAddress);
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("基站 {} 恢复出厂设置失败: {}", ipAddress, e.getMessage());
            throw new RuntimeException("恢复出厂设置失败: " + e.getMessage());
        }
    }
    
    @Override
    public boolean restartStation(String ipAddress) {
        try {
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                throw new RuntimeException("IP地址不能为空");
            }
            
            boolean result = udpStationInfoUtil.restartStation(ipAddress);
            
            if (result) {
                log.info("基站 {} 重启成功", ipAddress);
            } else {
                log.warn("基站 {} 重启失败", ipAddress);
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("基站 {} 重启失败: {}", ipAddress, e.getMessage());
            throw new RuntimeException("重启基站失败: " + e.getMessage());
        }
    }
    
    @Override
    public boolean locateStation(String ipAddress) {
        try {
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                throw new RuntimeException("IP地址不能为空");
            }
            
            boolean result = udpStationInfoUtil.locateStation(ipAddress);
            
            if (result) {
                log.info("基站 {} 定位成功，基站灯将闪烁100次", ipAddress);
            } else {
                log.warn("基站 {} 定位失败", ipAddress);
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("基站 {} 定位失败: {}", ipAddress, e.getMessage());
            throw new RuntimeException("基站定位失败: " + e.getMessage());
        }
    }
    
    @Override
    public boolean config1(String ipAddress) {
        try {
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                throw new RuntimeException("IP地址不能为空");
            }
            
            boolean result = udpStationInfoUtil.config1(ipAddress);
            
            if (result) {
                log.info("基站 {} 配置1成功", ipAddress);
            } else {
                log.warn("基站 {} 配置1失败", ipAddress);
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("基站 {} 配置1失败: {}", ipAddress, e.getMessage());
            throw new RuntimeException("基站配置1失败: " + e.getMessage());
        }
    }
    
    @Override
    public boolean config2(String ipAddress) {
        try {
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                throw new RuntimeException("IP地址不能为空");
            }
            
            boolean result = udpStationInfoUtil.config2(ipAddress);
            
            if (result) {
                log.info("基站 {} 配置2成功", ipAddress);
            } else {
                log.warn("基站 {} 配置2失败", ipAddress);
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("基站 {} 配置2失败: {}", ipAddress, e.getMessage());
            throw new RuntimeException("基站配置2失败: " + e.getMessage());
        }
    }
    
    @Override
    @Transactional
    public boolean configRSSI(String ipAddress, int rssi) {
        try {
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                throw new RuntimeException("IP地址不能为空");
            }
            
            // 验证RSSI值范围
            if (rssi < -100 || rssi > -40) {
                throw new RuntimeException("RSSI值必须在-100到-40dBm之间");
            }
            
            boolean result = udpStationInfoUtil.configRSSI(ipAddress, rssi);
            
            if (result) {
                // UDP配置成功后，更新数据库中的RSSI值
                Station station = stationMapper.selectAllStations(null, null, null)
                    .stream()
                    .filter(s -> ipAddress.equals(s.getIpAddress()))
                    .findFirst()
                    .orElse(null);
                
                if (station != null) {
                    stationMapper.updateStationRssi(station.getId(), rssi);
                    log.info("基站 {} (ID: {}) RSSI配置成功并已保存到数据库，RSSI值: {}dBm", ipAddress, station.getId(), rssi);
                } else {
                    log.warn("基站 {} RSSI配置成功，但未找到对应的基站记录", ipAddress);
                }
            } else {
                log.warn("基站 {} 配置RSSI失败，RSSI值: {}dBm", ipAddress, rssi);
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("基站 {} 配置RSSI失败: {}", ipAddress, e.getMessage());
            throw new RuntimeException("基站配置RSSI失败: " + e.getMessage());
        }
    }
    
    @Override
    @Transactional
    public boolean updateRssi(Long id, Integer rssi) {
        try {
            if (id == null) {
                throw new RuntimeException("基站ID不能为空");
            }
            
            Station station = stationMapper.selectStationById(id);
            if (station == null) {
                throw new RuntimeException("基站不存在，ID: " + id);
            }
            
            int result = stationMapper.updateStationRssi(id, rssi);
            
            if (result > 0) {
                log.info("基站 {} (ID: {}) RSSI值更新成功: {}dBm", station.getName(), id, rssi);
                return true;
            } else {
                log.warn("基站 {} (ID: {}) RSSI值更新失败", station.getName(), id);
                return false;
            }
            
        } catch (Exception e) {
            log.error("更新基站RSSI值失败 - ID: {}, RSSI: {}, 错误: {}", id, rssi, e.getMessage());
            throw new RuntimeException("更新基站RSSI值失败: " + e.getMessage());
        }
    }
    
    @Override
    @Transactional
    public boolean configTarget(String ipAddress, String targetIp, int targetPort) {
        try {
            if (ipAddress == null || ipAddress.trim().isEmpty()) {
                throw new RuntimeException("基站IP地址不能为空");
            }
            
            if (targetIp == null || targetIp.trim().isEmpty()) {
                throw new RuntimeException("目标IP地址不能为空");
            }
            
            // 验证端口范围和限制
            if (targetPort <= 0 || targetPort > 65535) {
                throw new RuntimeException("目标端口必须在1-65535之间");
            }
            
            if (targetPort == 8833) {
                throw new RuntimeException("目标端口不能是8833");
            }
            
            // 验证IP地址格式
            if (!isValidIpAddress(targetIp)) {
                throw new RuntimeException("目标IP地址格式不正确");
            }
            
            boolean result = udpStationInfoUtil.configTarget(ipAddress, targetIp, targetPort);
            
            if (result) {
                // UDP配置成功后，更新数据库中的目标IP和端口
                Station station = stationMapper.selectAllStations(null, null, null)
                    .stream()
                    .filter(s -> ipAddress.equals(s.getIpAddress()))
                    .findFirst()
                    .orElse(null);
                
                if (station != null) {
                    stationMapper.updateStationTarget(station.getId(), targetIp, targetPort);
                    log.info("基站 {} (ID: {}) 目标IP端口配置成功并已保存到数据库，目标IP: {}, 端口: {}", 
                            ipAddress, station.getId(), targetIp, targetPort);
                } else {
                    log.warn("基站 {} 目标IP端口配置成功，但未找到对应的基站记录", ipAddress);
                }
            } else {
                log.warn("基站 {} 配置目标IP端口失败，目标IP: {}, 端口: {}", ipAddress, targetIp, targetPort);
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("基站 {} 配置目标IP端口失败: {}", ipAddress, e.getMessage());
            throw new RuntimeException("基站配置目标IP端口失败: " + e.getMessage());
        }
    }
    
    @Override
    @Transactional
    public boolean updateTarget(Long id, String targetIp, Integer targetPort) {
        try {
            if (id == null) {
                throw new RuntimeException("基站ID不能为空");
            }
            
            Station station = stationMapper.selectStationById(id);
            if (station == null) {
                throw new RuntimeException("基站不存在，ID: " + id);
            }
            
            int result = stationMapper.updateStationTarget(id, targetIp, targetPort);
            
            if (result > 0) {
                log.info("基站 {} (ID: {}) 目标IP端口更新成功: IP={}, Port={}", station.getName(), id, targetIp, targetPort);
                return true;
            } else {
                log.warn("基站 {} (ID: {}) 目标IP端口更新失败", station.getName(), id);
                return false;
            }
            
        } catch (Exception e) {
            log.error("更新基站目标IP端口失败 - ID: {}, IP: {}, Port: {}, 错误: {}", id, targetIp, targetPort, e.getMessage());
            throw new RuntimeException("更新基站目标IP端口失败: " + e.getMessage());
        }
    }
    
    /**
     * 验证IP地址格式
     * @param ip IP地址字符串
     * @return 是否为有效IP地址
     */
    private boolean isValidIpAddress(String ip) {
        if (ip == null || ip.trim().isEmpty()) {
            return false;
        }
        
        String[] parts = ip.split("\\.");
        if (parts.length != 4) {
            return false;
        }
        
        try {
            for (String part : parts) {
                int num = Integer.parseInt(part);
                if (num < 0 || num > 255) {
                    return false;
                }
            }
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }
} 