package com.wu.monitor.service.impl;

import com.wu.monitor.mapper.StationMapper;
import com.wu.monitor.model.Station;
import com.wu.monitor.service.StationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class StationServiceImpl implements StationService {

    @Autowired
    private StationMapper stationMapper;

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
        
        Station existingByMac = stationMapper.selectStationByMacAddress(station.getMacAddress());
        if (existingByMac != null) {
            throw new RuntimeException("MAC地址已存在");
        }
        
        // 设置创建时间
        station.setCreateTime(LocalDateTime.now());
        
        // 如果没有设置最后通信时间，则设置为当前时间
        if (station.getLastCommunication() == null) {
            station.setLastCommunication(LocalDateTime.now());
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
        
        // 检查MAC地址是否重复
        if (station.getMacAddress() != null && !station.getMacAddress().equals(existingStation.getMacAddress())) {
            Station existingByMac = stationMapper.selectStationByMacAddress(station.getMacAddress());
            if (existingByMac != null) {
                throw new RuntimeException("MAC地址已存在");
            }
        }
        
        // 设置ID
        station.setId(id);
        
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
        
        // 更新状态和最后通信时间
        LocalDateTime now = LocalDateTime.now();
        stationMapper.updateStationStatus(id, status, now);
        
        return stationMapper.selectStationById(id);
    }
} 