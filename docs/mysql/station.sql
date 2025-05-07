-- 基站管理表结构
CREATE TABLE `station` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '基站ID',
  `code` varchar(32) NOT NULL COMMENT '基站编号',
  `name` varchar(64) NOT NULL COMMENT '基站名称',
  `mac_address` varchar(32) NOT NULL COMMENT 'MAC地址(蓝牙)',
  `ip_address` varchar(32) DEFAULT NULL COMMENT 'IP地址',
  `model` varchar(32) DEFAULT NULL COMMENT '基站型号',
  `firmware_version` varchar(32) DEFAULT NULL COMMENT '固件版本',
  `map_id` int(11) DEFAULT NULL COMMENT '地图ID',
  `position_x` decimal(10,3) DEFAULT NULL COMMENT 'X坐标(米)',
  `position_y` decimal(10,3) DEFAULT NULL COMMENT 'Y坐标(米)',
  `position_z` decimal(10,3) DEFAULT NULL COMMENT 'Z坐标(米)',
  `orientation` decimal(10,2) DEFAULT NULL COMMENT '安装方位角(度)',
  `status` tinyint(1) DEFAULT 0 COMMENT '基站状态(0:离线 1:在线)',
  `last_communication` datetime DEFAULT NULL COMMENT '最后通讯时间',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  UNIQUE KEY `uk_mac_address` (`mac_address`),
  KEY `idx_map_id` (`map_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='基站管理表';


-- 样例数据
INSERT INTO `station` (`code`, `name`, `mac_address`, `ip_address`, `model`, `firmware_version`, `map_id`, `position_x`, `position_y`, `position_z`, `orientation`, `status`, `last_communication`, `create_time`, `remark`) VALUES
('BS001', '一号楼东侧基站', 'AA:BB:CC:11:22:33', '192.168.1.101', 'AOA-S100', 'v1.2.5', 1, 3.500, 2.000, 2.800, 45.00, 1, '2023-10-15 08:30:25', '2023-09-01 10:00:00', '主入口位置'),
('BS002', '一号楼西侧基站', 'AA:BB:CC:11:22:34', '192.168.1.102', 'AOA-S100', 'v1.2.5', 1, -3.500, 2.000, 2.800, 135.00, 1, '2023-10-15 08:31:12', '2023-09-01 10:10:00', '西侧安全出口附近'),
('BS003', '二号楼北侧基站', 'AA:BB:CC:11:22:35', '192.168.1.103', 'AOA-S100', 'v1.2.5', 2, 0.000, 5.500, 2.800, 270.00, 0, '2023-10-14 18:45:33', '2023-09-02 09:15:00', '需要定期检查'),
('BS004', '二号楼南侧基站', 'AA:BB:CC:11:22:36', '192.168.1.104', 'AOA-S200', 'v1.3.1', 2, 0.000, -5.500, 2.800, 90.00, 1, '2023-10-15 08:29:55', '2023-09-02 09:30:00', '新型号测试中'),
('BS005', '实验楼东北角基站', 'AA:BB:CC:11:22:37', '192.168.1.105', 'AOA-S200', 'v1.3.1', 3, 4.200, 4.200, 3.000, 225.00, 1, '2023-10-15 08:32:01', '2023-09-05 14:20:00', '覆盖实验区域'); 