-- Combined Map Schema

-- 地图信息表
DROP TABLE IF EXISTS `current_map`; -- 先删除依赖表
DROP TABLE IF EXISTS `map`;
CREATE TABLE `map` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  `map_id` VARCHAR(50) NOT NULL COMMENT '地图业务ID',
  `name` VARCHAR(255) NOT NULL COMMENT '地图名称',
  `image_path` VARCHAR(255) COMMENT '地图图片路径',
  `x_min` DOUBLE NOT NULL COMMENT '地图X轴最小值',
  `x_max` DOUBLE NOT NULL COMMENT '地图X轴最大值',
  `y_min` DOUBLE NOT NULL COMMENT '地图Y轴最小值',
  `y_max` DOUBLE NOT NULL COMMENT '地图Y轴最大值',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY `idx_map_id` (`map_id`) -- map_id 唯一索引
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='地图信息表';

-- 当前使用地图表
CREATE TABLE `current_map` (
    `map_id` BIGINT NOT NULL COMMENT '当前使用的地图ID',
    PRIMARY KEY (`map_id`), -- map_id 作为主键
    FOREIGN KEY (`map_id`) REFERENCES `map`(`id`) ON DELETE CASCADE -- 外键关联 map 表的 id
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='当前使用地图表';

-- 注意：current_map 表中通常应该只有一条记录，表示当前系统激活的地图。
-- 可以考虑添加触发器或在应用层逻辑来保证这一点。 