DROP TABLE IF EXISTS `geofence`;

CREATE TABLE `geofence` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '围栏ID',
  `name` varchar(64) NOT NULL COMMENT '围栏名称',
  `map_id` bigint(20) NOT NULL COMMENT '地图ID',
  `coordinates` text NOT NULL COMMENT '坐标点JSON字符串',
  `enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用(0:禁用 1:启用)',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  KEY `idx_map_id` (`map_id`),
  KEY `idx_enabled` (`enabled`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='电子围栏表';

-- 插入示例数据
INSERT INTO `geofence` (`name`, `map_id`, `coordinates`, `enabled`, `create_time`, `remark`) VALUES
('安全区域A', 1, '[{"x":10.0,"y":10.0},{"x":20.0,"y":10.0},{"x":20.0,"y":20.0},{"x":10.0,"y":20.0}]', 1, '2023-09-01 10:00:00', '主要安全区域'),
('限制区域B', 1, '[{"x":30.0,"y":30.0},{"x":40.0,"y":30.0},{"x":40.0,"y":40.0},{"x":30.0,"y":40.0}]', 1, '2023-09-01 11:00:00', '禁止进入区域'),
('监控区域C', 2, '[{"x":5.0,"y":5.0},{"x":15.0,"y":5.0},{"x":15.0,"y":15.0},{"x":5.0,"y":15.0}]', 0, '2023-09-02 09:00:00', '暂时禁用的监控区域'); 