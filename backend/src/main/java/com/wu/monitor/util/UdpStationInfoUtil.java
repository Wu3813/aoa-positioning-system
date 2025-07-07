package com.wu.monitor.util;

import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.*;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/**
 * 基站UDP通信工具类
 * 用于通过UDP协议获取基站信息（型号、MAC地址、固件版本）
 */
@Component
public class UdpStationInfoUtil {
    
    // 使用专门的UDP基站通信日志记录器
    private static final Logger log = LoggerFactory.getLogger("UDP_STATION_LOGGER");
    
    private static final int UDP_PORT = 6000;
    private static final int TIMEOUT = 5000; // 5秒超时
    
    // 查询基站信息指令：88 00 00 00 02 00 00 00
    private static final byte[] QUERY_COMMAND = {
        (byte) 0x88, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00
    };
    
    // 查询加速度指令：88 00 00 00 06 01 00 00
    private static final byte[] ACCELERATION_COMMAND = {
        (byte) 0x88, 0x00, 0x00, 0x00, 0x06, 0x01, 0x00, 0x00
    };
    
    // 开启标签广播数据上报指令：8a 00 00 00 08 01 03 00 01 00 00
    private static final byte[] ENABLE_BROADCAST_COMMAND = {
        (byte) 0x8a, 0x00, 0x00, 0x00, 0x08, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00
    };
    
    // 开启扫描指令：8a 00 00 00 04 01 01 00 01
    private static final byte[] ENABLE_SCANNING_COMMAND = {
        (byte) 0x8a, 0x00, 0x00, 0x00, 0x04, 0x01, 0x01, 0x00, 0x01
    };
    
    // 开启标签广播数据上报成功响应：8b 00 00 00 08 01 02 00 00 00
    private static final byte[] BROADCAST_SUCCESS_RESPONSE = {
        (byte) 0x8b, 0x00, 0x00, 0x00, 0x08, 0x01, 0x02, 0x00, 0x00, 0x00
    };
    
    // 开启扫描成功响应：8b 00 00 00 04 01 02 00 00 00
    private static final byte[] SCANNING_SUCCESS_RESPONSE = {
        (byte) 0x8b, 0x00, 0x00, 0x00, 0x04, 0x01, 0x02, 0x00, 0x00, 0x00
    };
    
    // 恢复出厂指令：8a 00 00 00 01 00 01 00 00
    private static final byte[] FACTORY_RESET_COMMAND = {
        (byte) 0x8a, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00
    };
    
    // 重启指令：8a 00 00 00 01 00 01 00 11
    private static final byte[] RESTART_COMMAND = {
        (byte) 0x8a, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x11
    };
    
    // 基站定位指令：8a 00 00 00 05 01 07 00 03 e8 03 e8 03 64 00
    private static final byte[] LOCATE_COMMAND = {
        (byte) 0x8a, 0x00, 0x00, 0x00, 0x05, 0x01, 0x07, 0x00, 
        0x03, (byte) 0xe8, 0x03, (byte) 0xe8, 0x03, 0x64, 0x00
    };
    
    // 恢复出厂/重启成功响应：8b 00 00 00 01 00 02 00 00 00
    private static final byte[] FACTORY_RESET_SUCCESS_RESPONSE = {
        (byte) 0x8b, 0x00, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x00, 0x00
    };
    
    // 基站定位成功响应：8B 00 00 00 05 01 02 00 00 00
    private static final byte[] LOCATE_SUCCESS_RESPONSE = {
        (byte) 0x8b, 0x00, 0x00, 0x00, 0x05, 0x01, 0x02, 0x00, 0x00, 0x00
    };
    
    // 配置1指令：8a 00 00 00 02 01 27 00 01 00 00 00 00 00 00 00 00 00 e0 1a 00 00 14 01 01 00 00 00 12 28 28 08 0a 0c 0e 27 25 23 21 20 22 24 26 0f 0d 0b 09
    private static final byte[] CONFIG1_COMMAND = {
        (byte) 0x8a, 0x00, 0x00, 0x00, 0x02, 0x01, 0x27, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
        0x00, 0x00, (byte) 0xe0, 0x1a, 0x00, 0x00, 0x14, 0x01, 0x01, 0x00, 0x00, 0x00, 0x12, 0x28, 0x28, 0x08, 
        0x0a, 0x0c, 0x0e, 0x27, 0x25, 0x23, 0x21, 0x20, 0x22, 0x24, 0x26, 0x0f, 0x0d, 0x0b, 0x09
    };
    
    // 配置2指令：8a 00 00 00 02 01 1F 00 01 00 00 00 00 00 00 00 00 00 e0 12 00 00 14 01 01 00 00 00 0a 28 28 0a 0e 25 21 22 26 0d 09
    private static final byte[] CONFIG2_COMMAND = {
        (byte) 0x8a, 0x00, 0x00, 0x00, 0x02, 0x01, 0x1f, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
        0x00, 0x00, (byte) 0xe0, 0x12, 0x00, 0x00, 0x14, 0x01, 0x01, 0x00, 0x00, 0x00, 0x0a, 0x28, 0x28, 0x0a, 
        0x0e, 0x25, 0x21, 0x22, 0x26, 0x0d, 0x09
    };
    
    // 配置成功响应：8B 00 00 00 02 01 02 00 00 00
    private static final byte[] CONFIG_SUCCESS_RESPONSE = {
        (byte) 0x8b, 0x00, 0x00, 0x00, 0x02, 0x01, 0x02, 0x00, 0x00, 0x00
    };
    
    // RSSI配置指令基础模板：8a 00 00 00 03 01 05 00 00 01 02 01 xx（最后一个字节xx为RSSI值补码）
    private static final byte[] CONFIG_RSSI_COMMAND_BASE = {
        (byte) 0x8a, 0x00, 0x00, 0x00, 0x03, 0x01, 0x05, 0x00, 0x00, 0x01, 0x02, 0x01
    };
    
    // RSSI配置成功响应：8B 00 00 00 03 01 02 00 00 00
    private static final byte[] CONFIG_RSSI_SUCCESS_RESPONSE = {
        (byte) 0x8b, 0x00, 0x00, 0x00, 0x03, 0x01, 0x02, 0x00, 0x00, 0x00
    };
    
    // IP端口配置指令基础模板：8a 00 00 00 01 01 06 00 [IP地址4字节] [端口2字节]
    private static final byte[] CONFIG_TARGET_COMMAND_BASE = {
        (byte) 0x8a, 0x00, 0x00, 0x00, 0x01, 0x01, 0x06, 0x00
    };
    
    // IP端口配置成功响应：8B 00 00 00 01 01 02 00 00 00
    private static final byte[] CONFIG_TARGET_SUCCESS_RESPONSE = {
        (byte) 0x8b, 0x00, 0x00, 0x00, 0x01, 0x01, 0x02, 0x00, 0x00, 0x00
    };
    
    /**
     * 基站信息DTO
     */
    @Data
    public static class StationInfo {
        private String model;           // 基站型号
        private String macAddress;      // MAC地址
        private String firmwareVersion; // 固件版本
        private boolean scanEnabled;    // 扫描功能是否开启
    }
    
    /**
     * 三轴加速度信息DTO
     */
    @Data
    public static class AccelerationInfo {
        private String accelerationX;    // X轴加速度(十六进制)
        private String accelerationY;    // Y轴加速度(十六进制)
        private String accelerationZ;    // Z轴加速度(十六进制)
    }
    
    /**
     * 获取基站标识符，优先使用MAC地址，没有MAC地址时使用IP地址
     * @param ipAddress 基站IP地址
     * @param macAddress 基站MAC地址（可以为null）
     * @return 基站标识符字符串
     */
    private String getStationIdentifier(String ipAddress, String macAddress) {
        if (macAddress != null && !macAddress.trim().isEmpty()) {
            return String.format("MAC:%s", macAddress);
        }
        return String.format("IP:%s", ipAddress);
    }
    
    /**
     * 尝试获取基站MAC地址用于日志标识
     * @param ipAddress 基站IP地址
     * @return MAC地址，获取失败返回null
     */
    private String tryGetMacForLogging(String ipAddress) {
        try {
            StationInfo info = getStationInfo(ipAddress);
            return info != null ? info.getMacAddress() : null;
        } catch (Exception e) {
            // 静默处理，不影响主要功能
            return null;
        }
    }
    
    /**
     * 通过UDP获取基站信息
     * @param ipAddress 基站IP地址
     * @return 基站信息，获取失败返回null
     */
    public StationInfo getStationInfo(String ipAddress) {
        log.info("开始获取基站信息 - IP地址: {}", ipAddress);
        
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            log.warn("获取基站信息失败 - 基站IP地址为空");
            return null;
        }
        
        DatagramSocket socket = null;
        try {
            socket = new DatagramSocket();
            socket.setSoTimeout(TIMEOUT);
            
            // 发送查询指令
            InetAddress address = InetAddress.getByName(ipAddress.trim());
            DatagramPacket sendPacket = new DatagramPacket(
                QUERY_COMMAND, QUERY_COMMAND.length, address, UDP_PORT);
            socket.send(sendPacket);
            
            log.debug("已向基站 IP:{} 发送查询指令", ipAddress);
            
            // 接收响应
            byte[] buffer = new byte[1024];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(buffer, 0, responseData, 0, receivePacket.getLength());
            
            log.debug("收到基站 IP:{} 响应，长度: {}", ipAddress, responseData.length);
            
            // 解析响应数据
            StationInfo result = parseResponse(responseData);
            if (result != null) {
                String stationId = getStationIdentifier(ipAddress, result.getMacAddress());
                log.info("获取基站信息成功 - {}, 型号: {}, 固件版本: {}, 扫描功能: {}", 
                        stationId, result.getModel(), result.getFirmwareVersion(), result.isScanEnabled());
            } else {
                log.warn("获取基站信息失败 - IP:{}, 响应数据解析失败", ipAddress);
            }
            return result;
            
        } catch (SocketTimeoutException e) {
            log.warn("获取基站信息失败 - IP:{}, UDP通信超时", ipAddress);
            return null;
        } catch (Exception e) {
            log.error("获取基站信息异常 - IP:{}, 错误信息: {}", ipAddress, e.getMessage());
            return null;
        } finally {
            if (socket != null && !socket.isClosed()) {
                socket.close();
            }
        }
    }
    
    /**
     * 解析UDP响应数据
     * 响应格式示例: 89 00 00 00 02 00 0D 00 00 1F AC 23 3F C1 BF CE 01 00 02 00 01
     * @param data 响应数据
     * @return 解析后的基站信息
     */
    private StationInfo parseResponse(byte[] data) {
        try {
            if (data == null || data.length < 20) {
                log.warn("响应数据长度不足，期望至少20字节，实际: {}", data == null ? 0 : data.length);
                return null;
            }
            
            // 验证响应头（第0-7字节）
            if (data[0] != (byte) 0x89) {
                log.warn("响应头验证失败，期望0x89，实际: 0x{}", String.format("%02X", data[0]));
                return null;
            }
            
            StationInfo info = new StationInfo();
            
            // 解析基站型号（第8-9字节，小端序）
            int modelValue = ((data[9] & 0xFF) << 8) | (data[8] & 0xFF);
            info.setModel(String.valueOf(modelValue));
            
            // 解析MAC地址（第10-15字节，共6个字节）
            StringBuilder macBuilder = new StringBuilder();
            for (int i = 10; i <= 15; i++) {
                if (macBuilder.length() > 0) {
                    macBuilder.append(":");
                }
                macBuilder.append(String.format("%02X", data[i] & 0xFF));
            }
            info.setMacAddress(macBuilder.toString());
            
            // 解析固件版本（第16-19字节）
            int major = data[16] & 0xFF;
            int minor = data[17] & 0xFF;
            int patch = data[18] & 0xFF;
            info.setFirmwareVersion(String.format("%d.%d.%d", major, minor, patch));
            
            // 解析扫描功能状态（第20字节）
            info.setScanEnabled((data[20] & 0xFF) == 1);
            
            log.debug("解析基站信息成功 - 型号: {}, MAC: {}, 固件版本: {}, 扫描功能: {}", 
                     info.getModel(), info.getMacAddress(), info.getFirmwareVersion(), info.isScanEnabled());
            
            return info;
            
        } catch (Exception e) {
            log.error("解析基站响应数据失败: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * 将字节数组转换为十六进制字符串（用于调试）
     */
    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02X ", b));
        }
        return result.toString().trim();
    }
    
    /**
     * 通过UDP获取基站三轴加速度信息
     * @param ipAddress 基站IP地址
     * @return 加速度信息，获取失败返回null
     */
    public AccelerationInfo getAccelerationInfo(String ipAddress) {
        String macAddress = tryGetMacForLogging(ipAddress);
        String stationId = getStationIdentifier(ipAddress, macAddress);
        
        log.info("开始获取基站加速度信息 - {}", stationId);
        
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            log.warn("获取基站加速度信息失败 - 基站IP地址为空");
            return null;
        }
        
        DatagramSocket socket = null;
        try {
            socket = new DatagramSocket();
            socket.setSoTimeout(TIMEOUT);
            
            // 发送加速度查询指令
            InetAddress address = InetAddress.getByName(ipAddress.trim());
            DatagramPacket sendPacket = new DatagramPacket(
                ACCELERATION_COMMAND, ACCELERATION_COMMAND.length, address, UDP_PORT);
            socket.send(sendPacket);
            
            log.debug("已向基站 {} 发送加速度查询指令", stationId);
            
            // 接收响应
            byte[] buffer = new byte[1024];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(buffer, 0, responseData, 0, receivePacket.getLength());
            
            log.debug("收到基站 {} 加速度响应，长度: {}", stationId, responseData.length);
            
            // 解析响应数据
            AccelerationInfo result = parseAccelerationResponse(responseData);
            if (result != null) {
                log.info("获取基站加速度信息成功 - {}, X轴: {}, Y轴: {}, Z轴: {}", 
                        stationId, result.getAccelerationX(), result.getAccelerationY(), result.getAccelerationZ());
            } else {
                log.warn("获取基站加速度信息失败 - {}, 响应数据解析失败", stationId);
            }
            return result;
            
        } catch (SocketTimeoutException e) {
            log.warn("获取基站加速度信息失败 - {}, UDP通信超时", stationId);
            return null;
        } catch (Exception e) {
            log.error("获取基站加速度信息异常 - {}, 错误信息: {}", stationId, e.getMessage());
            return null;
        } finally {
            if (socket != null && !socket.isClosed()) {
                socket.close();
            }
        }
    }
    
    /**
     * 解析加速度UDP响应数据
     * 响应格式示例: 89 00 00 00 06 01 0C 00 00 00 00 00 00 00 00 00 EB 41 0F 00
     * 最后12个字节是x, y, z的加速度，每个4字节（IEEE 754浮点数，小端序）
     * @param data 响应数据
     * @return 解析后的加速度信息
     */
    private AccelerationInfo parseAccelerationResponse(byte[] data) {
        try {
            if (data == null || data.length < 20) {
                log.warn("加速度响应数据长度不足，期望至少20字节，实际: {}", data == null ? 0 : data.length);
                return null;
            }
            
            // 验证响应头
            if (data[0] != (byte) 0x89) {
                log.warn("加速度响应头验证失败，期望0x89，实际: 0x{}", String.format("%02X", data[0]));
                return null;
            }
            
            AccelerationInfo info = new AccelerationInfo();
            
            // 解析X轴加速度（字节8-11，原始十六进制）
            StringBuilder xHex = new StringBuilder();
            for (int i = 8; i <= 11; i++) {
                if (xHex.length() > 0) xHex.append(" ");
                xHex.append(String.format("%02X", data[i] & 0xFF));
            }
            info.setAccelerationX(xHex.toString());
            
            // 解析Y轴加速度（字节12-15，原始十六进制）
            StringBuilder yHex = new StringBuilder();
            for (int i = 12; i <= 15; i++) {
                if (yHex.length() > 0) yHex.append(" ");
                yHex.append(String.format("%02X", data[i] & 0xFF));
            }
            info.setAccelerationY(yHex.toString());
            
            // 解析Z轴加速度（字节16-19，原始十六进制）
            StringBuilder zHex = new StringBuilder();
            for (int i = 16; i <= 19; i++) {
                if (zHex.length() > 0) zHex.append(" ");
                zHex.append(String.format("%02X", data[i] & 0xFF));
            }
            info.setAccelerationZ(zHex.toString());
            
            log.debug("解析加速度信息成功 - X: {}, Y: {}, Z: {}", 
                     info.getAccelerationX(), info.getAccelerationY(), info.getAccelerationZ());
            
            return info;
            
        } catch (Exception e) {
            log.error("解析加速度响应数据失败: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * 开启标签广播数据上报
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    public boolean enableBroadcast(String ipAddress) {
        String macAddress = tryGetMacForLogging(ipAddress);
        String stationId = getStationIdentifier(ipAddress, macAddress);
        
        log.info("开始开启标签广播数据上报 - {}", stationId);
        
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(TIMEOUT);
            
            InetAddress address = InetAddress.getByName(ipAddress);
            
            // 发送开启标签广播数据上报指令
            DatagramPacket sendPacket = new DatagramPacket(
                ENABLE_BROADCAST_COMMAND, 
                ENABLE_BROADCAST_COMMAND.length, 
                address, 
                UDP_PORT
            );
            
            log.debug("向基站 {} 发送开启标签广播数据上报指令: {}", 
                     stationId, bytesToHex(ENABLE_BROADCAST_COMMAND));
            socket.send(sendPacket);
            
            // 接收响应
            byte[] buffer = new byte[256];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(receivePacket.getData(), 0, responseData, 0, receivePacket.getLength());
            
            log.debug("基站 {} 开启标签广播数据上报响应: {}", stationId, bytesToHex(responseData));
            
            // 检查响应是否为成功响应
            boolean success = isResponseMatching(responseData, BROADCAST_SUCCESS_RESPONSE);
            
            if (success) {
                log.info("开启标签广播数据上报成功 - {}", stationId);
            } else {
                log.warn("开启标签广播数据上报失败 - {}, 响应: {}", stationId, bytesToHex(responseData));
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("开启标签广播数据上报异常 - {}, 错误信息: {}", stationId, e.getMessage());
            return false;
        }
    }
    
    /**
     * 开启扫描
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    public boolean enableScanning(String ipAddress) {
        String macAddress = tryGetMacForLogging(ipAddress);
        String stationId = getStationIdentifier(ipAddress, macAddress);
        
        log.info("开始开启扫描功能 - {}", stationId);
        
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(TIMEOUT);
            
            InetAddress address = InetAddress.getByName(ipAddress);
            
            // 发送开启扫描指令
            DatagramPacket sendPacket = new DatagramPacket(
                ENABLE_SCANNING_COMMAND, 
                ENABLE_SCANNING_COMMAND.length, 
                address, 
                UDP_PORT
            );
            
            log.debug("向基站 {} 发送开启扫描指令: {}", 
                     stationId, bytesToHex(ENABLE_SCANNING_COMMAND));
            socket.send(sendPacket);
            
            // 接收响应
            byte[] buffer = new byte[256];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(receivePacket.getData(), 0, responseData, 0, receivePacket.getLength());
            
            log.debug("基站 {} 开启扫描响应: {}", stationId, bytesToHex(responseData));
            
            // 检查响应是否为成功响应
            boolean success = isResponseMatching(responseData, SCANNING_SUCCESS_RESPONSE);
            
            if (success) {
                log.info("开启扫描功能成功 - {}", stationId);
            } else {
                log.warn("开启扫描功能失败 - {}, 响应: {}", stationId, bytesToHex(responseData));
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("开启扫描功能异常 - {}, 错误信息: {}", stationId, e.getMessage());
            return false;
        }
    }
    
    /**
     * 检查响应是否匹配期望的成功响应
     * @param actualResponse 实际响应
     * @param expectedResponse 期望响应
     * @return 是否匹配
     */
    private boolean isResponseMatching(byte[] actualResponse, byte[] expectedResponse) {
        if (actualResponse == null || expectedResponse == null) {
            return false;
        }
        
        if (actualResponse.length != expectedResponse.length) {
            return false;
        }
        
        for (int i = 0; i < actualResponse.length; i++) {
            if (actualResponse[i] != expectedResponse[i]) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 恢复出厂设置
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    public boolean factoryReset(String ipAddress) {
        String macAddress = tryGetMacForLogging(ipAddress);
        String stationId = getStationIdentifier(ipAddress, macAddress);
        
        log.info("开始恢复出厂设置 - {}", stationId);
        
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(TIMEOUT);
            
            InetAddress address = InetAddress.getByName(ipAddress);
            
            // 发送恢复出厂指令
            DatagramPacket sendPacket = new DatagramPacket(
                FACTORY_RESET_COMMAND, 
                FACTORY_RESET_COMMAND.length, 
                address, 
                UDP_PORT
            );
            
            log.debug("向基站 {} 发送恢复出厂指令: {}", 
                     stationId, bytesToHex(FACTORY_RESET_COMMAND));
            socket.send(sendPacket);
            
            // 接收响应
            byte[] buffer = new byte[256];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(receivePacket.getData(), 0, responseData, 0, receivePacket.getLength());
            
            log.debug("基站 {} 恢复出厂响应: {}", stationId, bytesToHex(responseData));
            
            // 检查响应是否为成功响应
            boolean success = isResponseMatching(responseData, FACTORY_RESET_SUCCESS_RESPONSE);
            
            if (success) {
                log.info("恢复出厂设置成功 - {}", stationId);
            } else {
                log.warn("恢复出厂设置失败 - {}, 响应: {}", stationId, bytesToHex(responseData));
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("恢复出厂设置异常 - {}, 错误信息: {}", stationId, e.getMessage());
            return false;
        }
    }
    
    /**
     * 重启基站
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    public boolean restartStation(String ipAddress) {
        String macAddress = tryGetMacForLogging(ipAddress);
        String stationId = getStationIdentifier(ipAddress, macAddress);
        
        log.info("开始重启基站 - {}", stationId);
        
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(TIMEOUT);
            
            InetAddress address = InetAddress.getByName(ipAddress);
            
            // 发送重启指令
            DatagramPacket sendPacket = new DatagramPacket(
                RESTART_COMMAND, 
                RESTART_COMMAND.length, 
                address, 
                UDP_PORT
            );
            
            log.debug("向基站 {} 发送重启指令: {}", 
                     stationId, bytesToHex(RESTART_COMMAND));
            socket.send(sendPacket);
            
            // 接收响应
            byte[] buffer = new byte[256];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(receivePacket.getData(), 0, responseData, 0, receivePacket.getLength());
            
            log.debug("基站 {} 重启响应: {}", stationId, bytesToHex(responseData));
            
            // 检查响应是否为成功响应（和恢复出厂使用相同的响应格式）
            boolean success = isResponseMatching(responseData, FACTORY_RESET_SUCCESS_RESPONSE);
            
            if (success) {
                log.info("重启基站成功 - {}", stationId);
            } else {
                log.warn("重启基站失败 - {}, 响应: {}", stationId, bytesToHex(responseData));
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("重启基站异常 - {}, 错误信息: {}", stationId, e.getMessage());
            return false;
        }
    }
    
    /**
     * 基站定位（让基站灯闪烁）
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    public boolean locateStation(String ipAddress) {
        String macAddress = tryGetMacForLogging(ipAddress);
        String stationId = getStationIdentifier(ipAddress, macAddress);
        
        log.info("开始基站定位操作 - {}", stationId);
        
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(TIMEOUT);
            
            InetAddress address = InetAddress.getByName(ipAddress);
            
            // 发送基站定位指令
            DatagramPacket sendPacket = new DatagramPacket(
                LOCATE_COMMAND, 
                LOCATE_COMMAND.length, 
                address, 
                UDP_PORT
            );
            
            log.debug("向基站 {} 发送定位指令: {}", 
                     stationId, bytesToHex(LOCATE_COMMAND));
            socket.send(sendPacket);
            
            // 接收响应
            byte[] buffer = new byte[256];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(receivePacket.getData(), 0, responseData, 0, receivePacket.getLength());
            
            log.debug("基站 {} 定位响应: {}", stationId, bytesToHex(responseData));
            
            // 检查响应是否为成功响应
            boolean success = isResponseMatching(responseData, LOCATE_SUCCESS_RESPONSE);
            
            if (success) {
                log.info("基站定位操作成功 - {}, 基站灯将闪烁100次", stationId);
            } else {
                log.warn("基站定位操作失败 - {}, 响应: {}", stationId, bytesToHex(responseData));
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("基站定位操作异常 - {}, 错误信息: {}", stationId, e.getMessage());
            return false;
        }
    }
    
    /**
     * 配置1
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    public boolean config1(String ipAddress) {
        String macAddress = tryGetMacForLogging(ipAddress);
        String stationId = getStationIdentifier(ipAddress, macAddress);
        
        log.info("开始执行配置1操作 - {}", stationId);
        
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            log.warn("配置1操作失败 - 基站IP地址为空");
            return false;
        }
        
        DatagramSocket socket = null;
        try {
            socket = new DatagramSocket();
            socket.setSoTimeout(TIMEOUT);
            
            // 发送配置1指令
            InetAddress address = InetAddress.getByName(ipAddress.trim());
            DatagramPacket sendPacket = new DatagramPacket(
                CONFIG1_COMMAND, CONFIG1_COMMAND.length, address, UDP_PORT);
            socket.send(sendPacket);
            
            log.debug("已向基站 {} 发送配置1指令", stationId);
            
            // 接收响应
            byte[] buffer = new byte[1024];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(buffer, 0, responseData, 0, receivePacket.getLength());
            
            // 验证响应
            boolean success = isResponseMatching(responseData, CONFIG_SUCCESS_RESPONSE);
            if (success) {
                log.info("配置1操作成功 - {}", stationId);
            } else {
                log.warn("配置1操作失败 - {}, 响应验证失败", stationId);
            }
            
            return success;
            
        } catch (SocketTimeoutException e) {
            log.warn("配置1操作失败 - {}, UDP通信超时", stationId);
            return false;
        } catch (Exception e) {
            log.error("配置1操作异常 - {}, 错误信息: {}", stationId, e.getMessage());
            return false;
        } finally {
            if (socket != null && !socket.isClosed()) {
                socket.close();
            }
        }
    }
    
    /**
     * 配置2
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    public boolean config2(String ipAddress) {
        String macAddress = tryGetMacForLogging(ipAddress);
        String stationId = getStationIdentifier(ipAddress, macAddress);
        
        log.info("开始执行配置2操作 - {}", stationId);
        
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            log.warn("配置2操作失败 - 基站IP地址为空");
            return false;
        }
        
        DatagramSocket socket = null;
        try {
            socket = new DatagramSocket();
            socket.setSoTimeout(TIMEOUT);
            
            // 发送配置2指令
            InetAddress address = InetAddress.getByName(ipAddress.trim());
            DatagramPacket sendPacket = new DatagramPacket(
                CONFIG2_COMMAND, CONFIG2_COMMAND.length, address, UDP_PORT);
            socket.send(sendPacket);
            
            log.debug("已向基站 {} 发送配置2指令", stationId);
            
            // 接收响应
            byte[] buffer = new byte[1024];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(buffer, 0, responseData, 0, receivePacket.getLength());
            
            // 验证响应
            boolean success = isResponseMatching(responseData, CONFIG_SUCCESS_RESPONSE);
            if (success) {
                log.info("配置2操作成功 - {}", stationId);
            } else {
                log.warn("配置2操作失败 - {}, 响应验证失败", stationId);
            }
            
            return success;
            
        } catch (SocketTimeoutException e) {
            log.warn("配置2操作失败 - {}, UDP通信超时", stationId);
            return false;
        } catch (Exception e) {
            log.error("配置2操作异常 - {}, 错误信息: {}", stationId, e.getMessage());
            return false;
        } finally {
            if (socket != null && !socket.isClosed()) {
                socket.close();
            }
        }
    }
    
    /**
     * 配置RSSI
     * @param ipAddress 基站IP地址
     * @param rssi RSSI值（-100到-40dBm）
     * @return 操作是否成功
     */
    public boolean configRSSI(String ipAddress, int rssi) {
        String macAddress = tryGetMacForLogging(ipAddress);
        String stationId = getStationIdentifier(ipAddress, macAddress);
        
        log.info("开始配置RSSI - {}, RSSI值: {}dBm", stationId, rssi);
        
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            log.warn("配置RSSI失败 - 基站IP地址为空");
            return false;
        }
        
        // 验证RSSI值范围
        if (rssi < -100 || rssi > -40) {
            log.warn("配置RSSI失败 - {} RSSI值 {} 超出有效范围（-100到-40dBm）", stationId, rssi);
            return false;
        }
        
        DatagramSocket socket = null;
        try {
            socket = new DatagramSocket();
            socket.setSoTimeout(TIMEOUT);
            
            // 构建RSSI配置指令
            byte[] command = buildRSSICommand(rssi);
            
            // 发送配置RSSI指令
            InetAddress address = InetAddress.getByName(ipAddress.trim());
            DatagramPacket sendPacket = new DatagramPacket(
                command, command.length, address, UDP_PORT);
            socket.send(sendPacket);
            
            log.debug("已向基站 {} 发送配置RSSI指令，RSSI值: {}dBm", stationId, rssi);
            
            // 接收响应
            byte[] buffer = new byte[1024];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(buffer, 0, responseData, 0, receivePacket.getLength());
            
            // 验证响应
            boolean success = isResponseMatching(responseData, CONFIG_RSSI_SUCCESS_RESPONSE);
            if (success) {
                log.info("配置RSSI成功 - {}, RSSI值: {}dBm", stationId, rssi);
            } else {
                log.warn("配置RSSI失败 - {}, RSSI值: {}dBm, 响应验证失败", stationId, rssi);
            }
            
            return success;
            
        } catch (SocketTimeoutException e) {
            log.warn("配置RSSI失败 - {}, UDP通信超时", stationId);
            return false;
        } catch (Exception e) {
            log.error("配置RSSI异常 - {}, 错误信息: {}", stationId, e.getMessage());
            return false;
        } finally {
            if (socket != null && !socket.isClosed()) {
                socket.close();
            }
        }
    }
    
    /**
     * 构建RSSI配置指令
     * @param rssi RSSI值（-100到-40dBm）
     * @return 完整的指令字节数组
     */
    private byte[] buildRSSICommand(int rssi) {
        // 复制基础指令模板
        byte[] command = new byte[CONFIG_RSSI_COMMAND_BASE.length + 1];
        System.arraycopy(CONFIG_RSSI_COMMAND_BASE, 0, command, 0, CONFIG_RSSI_COMMAND_BASE.length);
        
        // 将RSSI值转换为8位补码
        // 对于负数，8位补码 = 256 + rssi
        byte rssiComplement = (byte) (256 + rssi);
        command[command.length - 1] = rssiComplement;
        
        log.debug("RSSI值 {}dBm 转换为补码: 0x{}", rssi, String.format("%02X", rssiComplement & 0xFF));
        
        return command;
    }
    
    /**
     * 配置目标IP和端口
     * @param ipAddress 基站IP地址
     * @param targetIp 目标IP地址
     * @param targetPort 目标端口
     * @return 操作是否成功
     */
    public boolean configTarget(String ipAddress, String targetIp, int targetPort) {
        String macAddress = tryGetMacForLogging(ipAddress);
        String stationId = getStationIdentifier(ipAddress, macAddress);
        
        log.info("开始配置目标IP端口 - {}, 目标IP: {}, 目标端口: {}", stationId, targetIp, targetPort);
        
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            log.warn("配置目标IP端口失败 - 基站IP地址为空");
            return false;
        }
        
        if (targetIp == null || targetIp.trim().isEmpty()) {
            log.warn("配置目标IP端口失败 - 目标IP地址为空");
            return false;
        }
        
        // 验证端口范围和限制
        if (targetPort <= 0 || targetPort > 65535) {
            log.warn("配置目标IP端口失败 - {} 目标端口 {} 超出有效范围（1-65535）", stationId, targetPort);
            return false;
        }
        
        if (targetPort == 8833) {
            log.warn("配置目标IP端口失败 - {} 目标端口不能是8833", stationId);
            return false;
        }
        
        DatagramSocket socket = null;
        try {
            socket = new DatagramSocket();
            socket.setSoTimeout(TIMEOUT);
            
            // 构建目标IP端口配置指令
            byte[] command = buildTargetCommand(targetIp, targetPort);
            
            // 发送配置目标IP端口指令
            InetAddress address = InetAddress.getByName(ipAddress.trim());
            DatagramPacket sendPacket = new DatagramPacket(
                command, command.length, address, UDP_PORT);
            socket.send(sendPacket);
            
            log.debug("已向基站 {} 发送配置目标IP端口指令，目标IP: {}, 端口: {}", stationId, targetIp, targetPort);
            
            // 接收响应
            byte[] buffer = new byte[1024];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(buffer, 0, responseData, 0, receivePacket.getLength());
            
            // 验证响应
            boolean success = isResponseMatching(responseData, CONFIG_TARGET_SUCCESS_RESPONSE);
            if (success) {
                log.info("配置目标IP端口成功 - {}, 目标IP: {}, 目标端口: {}", stationId, targetIp, targetPort);
            } else {
                log.warn("配置目标IP端口失败 - {}, 目标IP: {}, 目标端口: {}, 响应验证失败", stationId, targetIp, targetPort);
            }
            
            return success;
            
        } catch (SocketTimeoutException e) {
            log.warn("配置目标IP端口失败 - {}, UDP通信超时", stationId);
            return false;
        } catch (Exception e) {
            log.error("配置目标IP端口异常 - {}, 错误信息: {}", stationId, e.getMessage());
            return false;
        } finally {
            if (socket != null && !socket.isClosed()) {
                socket.close();
            }
        }
    }
    
    /**
     * 构建目标IP端口配置指令
     * @param targetIp 目标IP地址
     * @param targetPort 目标端口
     * @return 完整的指令字节数组
     */
    private byte[] buildTargetCommand(String targetIp, int targetPort) {
        // 复制基础指令模板
        byte[] command = new byte[CONFIG_TARGET_COMMAND_BASE.length + 6]; // IP地址4字节 + 端口2字节
        System.arraycopy(CONFIG_TARGET_COMMAND_BASE, 0, command, 0, CONFIG_TARGET_COMMAND_BASE.length);
        
        // 将IP地址转换为4字节
        String[] ipParts = targetIp.split("\\.");
        if (ipParts.length != 4) {
            throw new IllegalArgumentException("无效的IP地址格式: " + targetIp);
        }
        
        for (int i = 0; i < 4; i++) {
            int ipPart = Integer.parseInt(ipParts[i]);
            if (ipPart < 0 || ipPart > 255) {
                throw new IllegalArgumentException("IP地址部分超出范围 (0-255): " + ipPart);
            }
            command[CONFIG_TARGET_COMMAND_BASE.length + i] = (byte) ipPart;
        }
        
        // 将端口转换为2字节（小端编码）
        command[CONFIG_TARGET_COMMAND_BASE.length + 4] = (byte) (targetPort & 0xFF);        // 低字节
        command[CONFIG_TARGET_COMMAND_BASE.length + 5] = (byte) ((targetPort >> 8) & 0xFF); // 高字节
        
        log.debug("目标IP {} 端口 {} 转换为指令: {}", targetIp, targetPort, bytesToHex(command));
        
        return command;
    }
} 