USE aoa;

-- 标签管理表
DROP TABLE IF EXISTS `tag`;

CREATE TABLE `tag` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '标签ID',
  `name` varchar(100) NOT NULL COMMENT '标签名称',
  `mac_address` varchar(20) NOT NULL COMMENT 'MAC地址',
  `model` varchar(50) DEFAULT NULL COMMENT '标签型号',
  `firmware_version` varchar(50) DEFAULT NULL COMMENT '固件版本',
  `map_id` bigint(20) DEFAULT NULL COMMENT '地图ID',
  `rssi` int(11) DEFAULT NULL COMMENT 'RSSI信号强度',
  `position_x` double DEFAULT NULL COMMENT 'X坐标',
  `position_y` double DEFAULT NULL COMMENT 'Y坐标',
  `position_z` double DEFAULT NULL COMMENT 'Z坐标',
  `battery_level` int(11) DEFAULT NULL COMMENT '电量百分比',
  `status` tinyint(1) DEFAULT '0' COMMENT '标签状态：0-离线，1-在线',
  `last_seen` datetime DEFAULT NULL COMMENT '最后可见时间',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tag_mac_address` (`mac_address`),
  KEY `idx_tag_map_id` (`map_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签管理';

-- 样例数据 (MAC地址格式与JSON文件保持一致)
INSERT INTO `tag` (`name`, `mac_address`, `model`, `firmware_version`, `map_id`, `rssi`, `position_x`, `position_y`, `position_z`, `battery_level`, `status`, `last_seen`, `create_time`, `remark`) VALUES
('员工标签-张三', '84FD27EEE603', 'WT-01', 'v2.1.0', 1, -65, 10.5, 20.3, 1.5, 85, 1, '2023-10-15 14:30:22', '2023-08-10 09:15:00', '张三使用的员工标签'),
('设备标签-AGV01', '84FD27EEE604', 'WT-02', 'v2.0.3', 1, -72, 15.8, 30.2, 0.5, 60, 1, '2023-10-15 14:35:10', '2023-08-12 11:20:00', 'AGV小车使用的标签'),
('访客标签-001', '84FD27EEE605', 'WT-01', 'v2.1.0', 2, -80, 25.4, 40.8, 1.2, 30, 0, '2023-10-14 16:45:10', '2023-09-05 14:30:00', '用于访客临时使用'),
('测试标签-001', '4789437959BE', 'WT-01', 'v2.1.0', 1, -75, 0.0, 0.0, 1.0, 80, 1, NOW(), NOW(), '用于测试的标签，对应test.json数据'); 