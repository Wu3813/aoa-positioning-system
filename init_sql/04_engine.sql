USE aoa;

-- 定位引擎管理表
DROP TABLE IF EXISTS `engine`;

CREATE TABLE `engine` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '引擎ID',
  `code` varchar(50) NOT NULL COMMENT '引擎编号',
  `name` varchar(100) NOT NULL COMMENT '引擎名称',
  `management_url` varchar(255) DEFAULT NULL COMMENT '引擎管理URL',
  `data_url` varchar(255) DEFAULT NULL COMMENT '引擎数据URL',
  `map_id` bigint(20) DEFAULT NULL COMMENT '地图ID',
  `map_name` varchar(100) DEFAULT NULL COMMENT '地图名称',
  `status` tinyint(1) DEFAULT '0' COMMENT '引擎状态：0-离线，1-在线',
  `version` varchar(50) DEFAULT NULL COMMENT '引擎版本',
  `last_communication` datetime DEFAULT NULL COMMENT '最后通讯时间',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_engine_code` (`code`),
  KEY `idx_engine_map_id` (`map_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定位引擎管理';

-- 样例数据
INSERT INTO `engine` (`code`, `name`, `management_url`, `data_url`, `map_id`, `map_name`, `status`, `version`, `last_communication`, `create_time`, `remark`) VALUES
('ENG001', '主实验室引擎', 'http://192.168.1.100:8080/api/config', 'http://192.168.1.100:8080/api/data', 1, '实验室一楼', 1, 'v1.2.3', '2023-10-15 14:30:22', '2023-08-10 09:15:00', '主实验室使用的定位引擎'),
('ENG002', '生产区引擎', 'http://192.168.1.101:8080/api/config', 'http://192.168.1.101:8080/api/data', 2, '生产区域', 0, 'v1.2.1', '2023-10-14 16:45:10', '2023-08-12 11:20:00', '生产区域使用的定位引擎'),
('ENG003', '测试引擎', 'http://192.168.1.102:8080/api/config', 'http://192.168.1.102:8080/api/data', 3, '测试区域', 1, 'v1.3.0-beta', '2023-10-15 10:12:35', '2023-09-05 14:30:00', '用于新功能测试的引擎'); 