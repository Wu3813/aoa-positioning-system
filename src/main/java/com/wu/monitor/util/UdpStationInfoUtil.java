package com.wu.monitor.util;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.*;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/**
 * 基站UDP通信工具类
 * 用于通过UDP协议获取基站信息（型号、MAC地址、固件版本）
 */
@Slf4j
@Component
public class UdpStationInfoUtil {
    
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
     * 通过UDP获取基站信息
     * @param ipAddress 基站IP地址
     * @return 基站信息，获取失败返回null
     */
    public StationInfo getStationInfo(String ipAddress) {
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            log.warn("基站IP地址为空");
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
            
            log.debug("已向基站 {} 发送查询指令", ipAddress);
            
            // 接收响应
            byte[] buffer = new byte[1024];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(buffer, 0, responseData, 0, receivePacket.getLength());
            
            log.debug("收到基站 {} 响应，长度: {}", ipAddress, responseData.length);
            
            // 解析响应数据
            return parseResponse(responseData);
            
        } catch (SocketTimeoutException e) {
            log.warn("基站 {} UDP通信超时", ipAddress);
            return null;
        } catch (Exception e) {
            log.error("获取基站 {} 信息失败: {}", ipAddress, e.getMessage());
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
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            log.warn("基站IP地址为空");
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
            
            log.debug("已向基站 {} 发送加速度查询指令", ipAddress);
            
            // 接收响应
            byte[] buffer = new byte[1024];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(buffer, 0, responseData, 0, receivePacket.getLength());
            
            log.debug("收到基站 {} 加速度响应，长度: {}", ipAddress, responseData.length);
            
            // 解析响应数据
            return parseAccelerationResponse(responseData);
            
        } catch (SocketTimeoutException e) {
            log.warn("基站 {} 加速度查询UDP通信超时", ipAddress);
            return null;
        } catch (Exception e) {
            log.error("获取基站 {} 加速度信息失败: {}", ipAddress, e.getMessage());
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
                     ipAddress, bytesToHex(ENABLE_BROADCAST_COMMAND));
            socket.send(sendPacket);
            
            // 接收响应
            byte[] buffer = new byte[256];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(receivePacket.getData(), 0, responseData, 0, receivePacket.getLength());
            
            log.debug("基站 {} 开启标签广播数据上报响应: {}", ipAddress, bytesToHex(responseData));
            
            // 检查响应是否为成功响应
            boolean success = isResponseMatching(responseData, BROADCAST_SUCCESS_RESPONSE);
            
            if (success) {
                log.info("基站 {} 标签广播数据上报开启成功", ipAddress);
            } else {
                log.warn("基站 {} 标签广播数据上报开启失败，响应: {}", ipAddress, bytesToHex(responseData));
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("基站 {} 开启标签广播数据上报通信异常: {}", ipAddress, e.getMessage());
            return false;
        }
    }
    
    /**
     * 开启扫描
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    public boolean enableScanning(String ipAddress) {
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
                     ipAddress, bytesToHex(ENABLE_SCANNING_COMMAND));
            socket.send(sendPacket);
            
            // 接收响应
            byte[] buffer = new byte[256];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(receivePacket.getData(), 0, responseData, 0, receivePacket.getLength());
            
            log.debug("基站 {} 开启扫描响应: {}", ipAddress, bytesToHex(responseData));
            
            // 检查响应是否为成功响应
            boolean success = isResponseMatching(responseData, SCANNING_SUCCESS_RESPONSE);
            
            if (success) {
                log.info("基站 {} 扫描开启成功", ipAddress);
            } else {
                log.warn("基站 {} 扫描开启失败，响应: {}", ipAddress, bytesToHex(responseData));
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("基站 {} 开启扫描通信异常: {}", ipAddress, e.getMessage());
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
                     ipAddress, bytesToHex(FACTORY_RESET_COMMAND));
            socket.send(sendPacket);
            
            // 接收响应
            byte[] buffer = new byte[256];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(receivePacket.getData(), 0, responseData, 0, receivePacket.getLength());
            
            log.debug("基站 {} 恢复出厂响应: {}", ipAddress, bytesToHex(responseData));
            
            // 检查响应是否为成功响应
            boolean success = isResponseMatching(responseData, FACTORY_RESET_SUCCESS_RESPONSE);
            
            if (success) {
                log.info("基站 {} 恢复出厂设置成功", ipAddress);
            } else {
                log.warn("基站 {} 恢复出厂设置失败，响应: {}", ipAddress, bytesToHex(responseData));
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("基站 {} 恢复出厂设置通信异常: {}", ipAddress, e.getMessage());
            return false;
        }
    }
    
    /**
     * 重启基站
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    public boolean restartStation(String ipAddress) {
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
                     ipAddress, bytesToHex(RESTART_COMMAND));
            socket.send(sendPacket);
            
            // 接收响应
            byte[] buffer = new byte[256];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(receivePacket.getData(), 0, responseData, 0, receivePacket.getLength());
            
            log.debug("基站 {} 重启响应: {}", ipAddress, bytesToHex(responseData));
            
            // 检查响应是否为成功响应（和恢复出厂使用相同的响应格式）
            boolean success = isResponseMatching(responseData, FACTORY_RESET_SUCCESS_RESPONSE);
            
            if (success) {
                log.info("基站 {} 重启成功", ipAddress);
            } else {
                log.warn("基站 {} 重启失败，响应: {}", ipAddress, bytesToHex(responseData));
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("基站 {} 重启通信异常: {}", ipAddress, e.getMessage());
            return false;
        }
    }
    
    /**
     * 基站定位（让基站灯闪烁）
     * @param ipAddress 基站IP地址
     * @return 操作是否成功
     */
    public boolean locateStation(String ipAddress) {
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
                     ipAddress, bytesToHex(LOCATE_COMMAND));
            socket.send(sendPacket);
            
            // 接收响应
            byte[] buffer = new byte[256];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);
            socket.receive(receivePacket);
            
            byte[] responseData = new byte[receivePacket.getLength()];
            System.arraycopy(receivePacket.getData(), 0, responseData, 0, receivePacket.getLength());
            
            log.debug("基站 {} 定位响应: {}", ipAddress, bytesToHex(responseData));
            
            // 检查响应是否为成功响应
            boolean success = isResponseMatching(responseData, LOCATE_SUCCESS_RESPONSE);
            
            if (success) {
                log.info("基站 {} 定位成功，基站灯将闪烁100次", ipAddress);
            } else {
                log.warn("基站 {} 定位失败，响应: {}", ipAddress, bytesToHex(responseData));
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("基站 {} 定位通信异常: {}", ipAddress, e.getMessage());
            return false;
        }
    }
} 