CREATE TABLE IF NOT EXISTS `alarm` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `time` datetime DEFAULT NULL COMMENT '报警时间',
  `geofence_id` bigint(20) DEFAULT NULL COMMENT '围栏ID',
  `geofence_name` varchar(255) DEFAULT NULL COMMENT '围栏名称',
  `map_id` bigint(20) DEFAULT NULL COMMENT '地图ID',
  `map_name` varchar(255) DEFAULT NULL COMMENT '地图名称',
  `alarm_tag` varchar(255) DEFAULT NULL COMMENT '报警标签', 
  `x` double DEFAULT NULL COMMENT '报警坐标x', 
  `y` double DEFAULT NULL COMMENT '报警坐标y',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_time` (`time`),
  KEY `idx_geofence_id` (`geofence_id`),
  KEY `idx_map_id` (`map_id`),
  KEY `idx_alarm_tag` (`alarm_tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报警记录表'; 