package com.wu.monitor.service;

import com.wu.monitor.model.Station;
import java.util.List;
import java.util.Map;

public interface StationService {
    /**
     * 获取所有基站
     * @param code 基站编号（可选）
     * @param name 基站名称（可选）
     * @param status 基站状态（可选）
     * @return 基站列表
     */
    List<Station> getAllStations(String code, String name, Integer status);
    
    /**
     * 根据ID获取基站
     * @param id 基站ID
     * @return 基站信息
     */
    Station getStationById(Long id);
    
    /**
     * 创建基站
     * @param station 基站信息
     * @return 创建后的基站信息
     */
    Station createStation(Station station);
    
    /**
     * 更新基站
     * @param id 基站ID
     * @param station 基站信息
     * @return 更新后的基站信息
     */
    Station updateStation(Long id, Station station);
    
    /**
     * 删除基站
     * @param id 基站ID
     */
    void deleteStation(Long id);
    
    /**
     * 批量删除基站
     * @param ids 基站ID列表
     */
    void batchDeleteStations(List<Long> ids);
    
    /**
     * 获取指定地图下的所有基站
     * @param mapId 地图ID
     * @return 基站列表
     */
    List<Station> getStationsByMapId(Long mapId);
    
    /**
     * 更新基站状态
     * @param id 基站ID
     * @param status 状态
     * @return 更新后的基站信息
     */
    Station updateStationStatus(Long id, Integer status);
    
    /**
     * 通过UDP刷新基站信息（型号、MAC地址、固件版本、扫描状态）
     * @param id 基站ID
     * @return 更新后的基站信息
     */
    Station refreshStationInfoFromUdp(Long id);
    
    /**
     * 批量刷新基站信息
     * @param ids 基站ID列表
     * @return 刷新结果统计
     */
    RefreshResult batchRefreshStationInfo(List<Long> ids);
    
    /**
     * 检查所有基站的在线状态
     * @return 检查结果统计
     */
    RefreshResult checkAllStationsStatus();
    
    /**
     * 根据IP地址列表批量检查基站状态（用于定时任务）
     * @return 检查结果统计
     */
    RefreshResult checkStationsStatusByIp();
    
    /**
     * 测试UDP连接并获取基站信息
     * @param ipAddress IP地址
     * @return 包含基站信息和加速度数据的Map
     */
    Map<String, Object> testUdpConnection(String ipAddress);
    
    /**
     * 开启标签广播数据上报
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    boolean enableBroadcast(String ipAddress);
    
    /**
     * 开启扫描
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    boolean enableScanning(String ipAddress);
    
    /**
     * 恢复出厂设置
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    boolean factoryReset(String ipAddress);
    
    /**
     * 重启基站
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    boolean restartStation(String ipAddress);
    
    /**
     * 基站定位（让基站灯闪烁）
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    boolean locateStation(String ipAddress);
    
    /**
     * 基站配置1
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    boolean config1(String ipAddress);
    
    /**
     * 基站配置2
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    boolean config2(String ipAddress);
    
    /**
     * 更新基站扫描配置类型
     * @param id 基站ID
     * @param scanConfigType 扫描配置类型
     * @return 操作是否成功
     */
    boolean updateScanConfigType(Long id, String scanConfigType);
    
    /**
     * 基站配置RSSI
     * @param ipAddress 基站IP地址
     * @param rssi RSSI值（-100到-40dBm）
     * @return 操作是否成功
     */
    boolean configRSSI(String ipAddress, int rssi);
    
    /**
     * 更新基站RSSI配置值
     * @param id 基站ID
     * @param rssi RSSI值
     * @return 操作是否成功
     */
    boolean updateRssi(Long id, Integer rssi);
    
    /**
     * 基站配置目标IP和端口
     * @param ipAddress 基站IP地址
     * @param targetIp 目标IP地址
     * @param targetPort 目标端口
     * @return 操作是否成功
     */
    boolean configTarget(String ipAddress, String targetIp, int targetPort);
    
    /**
     * 更新基站目标IP和端口配置值
     * @param id 基站ID
     * @param targetIp 目标IP地址
     * @param targetPort 目标端口
     * @return 操作是否成功
     */
    boolean updateTarget(Long id, String targetIp, Integer targetPort);
    
    /**
     * 批量更新基站坐标和方位角
     * @param stations 基站信息列表（包含id、coordinateX、coordinateY、coordinateZ、orientation）
     * @return 成功更新的基站数量
     */
    int batchUpdateCoordinates(List<Map<String, Object>> stations);
    
    /**
     * 刷新结果统计类
     */
    class RefreshResult {
        private int total;
        private int success;
        private int failed;
        
        public RefreshResult(int total, int success, int failed) {
            this.total = total;
            this.success = success;
            this.failed = failed;
        }
        
        // Getters
        public int getTotal() { return total; }
        public int getSuccess() { return success; }
        public int getFailed() { return failed; }
    }
} 