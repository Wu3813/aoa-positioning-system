DROP TABLE IF EXISTS `station`;

CREATE TABLE `station` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '基站ID',
  `code` varchar(32) NOT NULL COMMENT '基站编号',
  `name` varchar(64) NOT NULL COMMENT '基站名称',
  `mac_address` varchar(32) NOT NULL COMMENT 'MAC地址',
  `ip_address` varchar(32) DEFAULT NULL COMMENT 'IP地址',
  `model` varchar(32) DEFAULT NULL COMMENT '基站型号',
  `firmware_version` varchar(32) DEFAULT NULL COMMENT '固件版本',
  `map_id` bigint(20) DEFAULT NULL COMMENT '地图ID',
  `position_x` varchar(32) DEFAULT NULL COMMENT 'X轴加速度(十六进制)',
  `position_y` varchar(32) DEFAULT NULL COMMENT 'Y轴加速度(十六进制)',
  `position_z` varchar(32) DEFAULT NULL COMMENT 'Z轴加速度(十六进制)',
  `orientation` decimal(10,2) DEFAULT NULL COMMENT '安装方位角(度)',
  `coordinate_x` decimal(10,3) DEFAULT NULL COMMENT 'X坐标(米)',
  `coordinate_y` decimal(10,3) DEFAULT NULL COMMENT 'Y坐标(米)',
  `coordinate_z` decimal(10,3) DEFAULT NULL COMMENT 'Z坐标(米)',
  `status` tinyint(1) DEFAULT 2 COMMENT '基站状态(0:离线 1:在线 2:初始化)',
  `scan_enabled` BOOLEAN DEFAULT NULL COMMENT '扫描功能是否开启(0:关闭 1:开启 NULL:未知)',
  `rssi` int DEFAULT NULL COMMENT '基站RSSI配置值(dBm)',
  `target_ip` varchar(32) DEFAULT NULL COMMENT '目标IP地址',
  `target_port` int DEFAULT NULL COMMENT '目标端口',
  `scan_config_type` varchar(16) DEFAULT NULL COMMENT '扫描配置类型(config1/config2)',
  `last_communication` datetime DEFAULT NULL COMMENT '最后通讯时间',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  UNIQUE KEY `uk_mac_address` (`mac_address`),
  KEY `idx_map_id` (`map_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='基站管理表';

INSERT INTO `station` (`code`, `name`, `mac_address`, `ip_address`, `model`, `firmware_version`, `map_id`, `position_x`, `position_y`, `position_z`, `orientation`, `coordinate_x`, `coordinate_y`, `coordinate_z`, `status`, `scan_enabled`, `rssi`, `target_ip`, `target_port`, `last_communication`, `create_time`, `remark`) VALUES
('BS001', '一号楼东侧基站', 'AA:BB:CC:11:22:33', '192.168.1.101', '7936', '1.0.2', 1, 3.500, 2.000, 2.800, 45.00, NULL, NULL, NULL, 1, true, 0, NULL, NULL, '2023-10-15 08:30:25', '2023-09-01 10:00:00', '主入口位置'),
('BS002', '一号楼西侧基站', 'AA:BB:CC:11:22:34', '192.168.1.102', '7936', '1.0.2', 1, -3.500, 2.000, 2.800, 135.00, NULL, NULL, NULL, 1, true, 0, NULL, NULL, '2023-10-15 08:31:12', '2023-09-01 10:10:00', '西侧安全出口附近'),
('BS003', '二号楼北侧基站', 'AA:BB:CC:11:22:35', '192.168.1.103', '7936', '1.0.1', 2, 0.000, 5.500, 2.800, 270.00, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, '2023-10-14 18:45:33', '2023-09-02 09:15:00', '需要定期检查'),
('BS004', '二号楼南侧基站', 'AA:BB:CC:11:22:36', '192.168.1.104', '7968', '1.1.0', 2, 0.000, -5.500, 2.800, 90.00, NULL, NULL, NULL, 1, false, NULL, NULL, NULL, '2023-10-15 08:29:55', '2023-09-02 09:30:00', '新型号测试中'),
('BS005', '实验楼东北角基站', 'AA:BB:CC:11:22:37', '192.168.1.105', '7968', '1.1.0', 3, 4.200, 4.200, 3.000, 225.00, NULL, NULL, NULL, 1, true, 0, NULL, NULL, '2023-10-15 08:32:01', '2023-09-05 14:20:00', '覆盖实验区域');