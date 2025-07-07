USE aoa;

CREATE TABLE `map` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `map_id` bigint(20) NOT NULL COMMENT '地图业务ID',
  `name` VARCHAR(255) NOT NULL COMMENT '地图名称',
  `image_path` VARCHAR(255) COMMENT '地图图片路径',
  `width` INT NULL COMMENT '图片宽度(像素)',
  `height` INT NULL COMMENT '图片高度(像素)',
  `origin_x` INT NULL COMMENT '原点X坐标(像素)',
  `origin_y` INT NULL COMMENT '原点Y坐标(像素)',
  `scale` DOUBLE NULL COMMENT '比例尺(像素/米)',
  `point1_x` INT NULL COMMENT '测量点1的X坐标(像素)',
  `point1_y` INT NULL COMMENT '测量点1的Y坐标(像素)',
  `point2_x` INT NULL COMMENT '测量点2的X坐标(像素)',
  `point2_y` INT NULL COMMENT '测量点2的Y坐标(像素)',
  `real_distance` DOUBLE NULL COMMENT '测量点间实际距离(米)',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_map_id` (`map_id`) -- map_id 唯一索引
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='地图信息表';

