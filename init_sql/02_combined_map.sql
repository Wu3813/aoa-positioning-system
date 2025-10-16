USE aoa;

CREATE TABLE IF NOT EXISTS `map` (
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='地图信息表';

LOCK TABLES `map` WRITE;
/*!40000 ALTER TABLE `map` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `map` VALUES
(1,1,'港之龙办公室','203b9510-c760-4348-8049-ca5e2a5f48d3.jpeg',2218,1554,281,435,100.02,147,1223,647,1233,5,'2025-10-13 11:05:56'),
(2,2,'湖南办公室','6a0dd243-94ec-4f51-9d22-9f036602baba.png',1288,1544,161,68,100,240,230,640,230,4,'2025-10-13 11:07:40'),
(3,3,'港之龙大厅','2ee0fe52-471e-43af-aad5-2257faf36ec8.jpeg',1200,1200,601,999,100,361,200,841,201,4.8,'2025-10-13 11:08:28');
/*!40000 ALTER TABLE `map` ENABLE KEYS */;
UNLOCK TABLES;
commit;
