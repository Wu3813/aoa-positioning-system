USE aoa;

-- 轨迹数据存储表（分区表）
DROP TABLE IF EXISTS `trajectory_data`;

CREATE TABLE `trajectory_data` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `device_id` varchar(50) NOT NULL COMMENT '设备ID（MAC地址）',
  `map_id` int(11) DEFAULT NULL COMMENT '地图ID',
  `timestamp` datetime NOT NULL COMMENT '时间戳',
  `x` double DEFAULT NULL COMMENT 'X坐标',
  `y` double DEFAULT NULL COMMENT 'Y坐标',
  `rssi` int DEFAULT NULL COMMENT 'RSSI信号强度',
  `battery` int DEFAULT NULL COMMENT '电量百分比',
  `point_count` int DEFAULT 1 COMMENT '合并的点数量',
  PRIMARY KEY (`id`, `timestamp`),
  KEY `idx_device_timestamp` (`device_id`, `timestamp`),
  KEY `idx_map_id` (`map_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='轨迹数据存储表'
PARTITION BY RANGE (YEAR(timestamp) * 100 + MONTH(timestamp)) (
  PARTITION p202410 VALUES LESS THAN (202411),
  PARTITION p202411 VALUES LESS THAN (202412),
  PARTITION p202412 VALUES LESS THAN (202501),
  PARTITION p202501 VALUES LESS THAN (202502),
  PARTITION p202502 VALUES LESS THAN (202503),
  PARTITION p202503 VALUES LESS THAN (202504),
  PARTITION p202504 VALUES LESS THAN (202505),
  PARTITION p202505 VALUES LESS THAN (202506),
  PARTITION p202506 VALUES LESS THAN (202507),
  PARTITION p202507 VALUES LESS THAN (202508),
  PARTITION p202508 VALUES LESS THAN (202509),
  PARTITION p202509 VALUES LESS THAN (MAXVALUE)
);

-- 创建分区管理存储过程
DELIMITER $$

CREATE PROCEDURE CreateTrajectoryPartition(IN part_year INT, IN part_month INT)
BEGIN
    DECLARE partition_name VARCHAR(20);
    DECLARE next_year INT;
    DECLARE next_month INT;
    DECLARE partition_value INT;
    DECLARE sql_text TEXT;
    
    -- 计算分区名称
    SET partition_name = CONCAT('p', part_year, LPAD(part_month, 2, '0'));
    
    -- 计算下个月的年月
    IF part_month = 12 THEN
        SET next_year = part_year + 1;
        SET next_month = 1;
    ELSE
        SET next_year = part_year;
        SET next_month = part_month + 1;
    END IF;
    
    -- 计算分区值
    SET partition_value = next_year * 100 + next_month;
    
    -- 检查分区是否已存在
    SET @partition_exists = 0;
    SELECT COUNT(*) INTO @partition_exists 
    FROM information_schema.partitions 
    WHERE table_schema = DATABASE() 
      AND table_name = 'trajectory_data' 
      AND partition_name = partition_name;
    
    -- 如果分区不存在则创建
    IF @partition_exists = 0 THEN
        SET sql_text = CONCAT('ALTER TABLE trajectory_data ADD PARTITION (PARTITION ', 
                             partition_name, ' VALUES LESS THAN (', partition_value, '))');
        SET @sql = sql_text;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        SELECT CONCAT('分区 ', partition_name, ' 创建成功') AS result;
    ELSE
        SELECT CONCAT('分区 ', partition_name, ' 已存在') AS result;
    END IF;
END$$

DELIMITER ; 