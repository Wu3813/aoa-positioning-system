USE aoa;

-- 轨迹数据存储表（按天分区）
DROP TABLE IF EXISTS `trajectory_data`;

CREATE TABLE `trajectory_data` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `device_id` BINARY(6) NOT NULL COMMENT '设备ID（MAC地址，6字节二进制）',
  `map_id` int(11) DEFAULT NULL COMMENT '地图ID',
  `timestamp` datetime NOT NULL COMMENT '时间戳',
  `x` float DEFAULT NULL COMMENT 'X坐标（降低精度节省空间）',
  `y` float DEFAULT NULL COMMENT 'Y坐标（降低精度节省空间）',
  PRIMARY KEY (`id`, `timestamp`),
  KEY `idx_device_timestamp` (`device_id`, `timestamp`),
  KEY `idx_map_id` (`map_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='轨迹数据存储表（按天分区）'
PARTITION BY RANGE (TO_DAYS(timestamp)) (
  PARTITION p20251027 VALUES LESS THAN (TO_DAYS('2025-10-28')),
  PARTITION p20251028 VALUES LESS THAN (TO_DAYS('2025-10-29')),
  PARTITION p20251029 VALUES LESS THAN (TO_DAYS('2025-10-30')),
  PARTITION p20251030 VALUES LESS THAN (TO_DAYS('2025-10-31')),
  PARTITION p20251031 VALUES LESS THAN (TO_DAYS('2025-11-01')),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 创建按天分区管理存储过程
DELIMITER $$

CREATE PROCEDURE CreateTrajectoryPartition(IN part_date DATE)
BEGIN
    DECLARE partition_name VARCHAR(20);
    DECLARE next_date DATE;
    DECLARE partition_value INT;
    DECLARE sql_text TEXT;
    
    -- 计算分区名称 (格式: pYYYYMMDD)
    SET partition_name = CONCAT('p', DATE_FORMAT(part_date, '%Y%m%d'));
    
    -- 计算下一天
    SET next_date = DATE_ADD(part_date, INTERVAL 1 DAY);
    
    -- 计算分区值
    SET partition_value = TO_DAYS(next_date);
    
    -- 检查分区是否已存在
    SET @partition_exists = 0;
    SELECT COUNT(*) INTO @partition_exists 
    FROM information_schema.partitions 
    WHERE table_schema = DATABASE() 
      AND table_name = 'trajectory_data' 
      AND partition_name = partition_name;
    
    -- 如果分区不存在则创建
    IF @partition_exists = 0 THEN
        -- 先删除p_future分区
        SET @sql = 'ALTER TABLE trajectory_data DROP PARTITION p_future';
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        -- 创建新分区
        SET sql_text = CONCAT('ALTER TABLE trajectory_data ADD PARTITION (PARTITION ', 
                             partition_name, ' VALUES LESS THAN (', partition_value, '))');
        SET @sql = sql_text;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        -- 重新创建p_future分区
        SET @sql = 'ALTER TABLE trajectory_data ADD PARTITION (PARTITION p_future VALUES LESS THAN MAXVALUE)';
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        SELECT CONCAT('分区 ', partition_name, ' 创建成功') AS result;
    ELSE
        SELECT CONCAT('分区 ', partition_name, ' 已存在') AS result;
    END IF;
END$$

-- 删除指定日期的分区（用于清理过期数据）
CREATE PROCEDURE DropTrajectoryPartition(IN part_date DATE)
BEGIN
    DECLARE partition_name VARCHAR(20);
    DECLARE sql_text TEXT;
    
    -- 计算分区名称
    SET partition_name = CONCAT('p', DATE_FORMAT(part_date, '%Y%m%d'));
    
    -- 检查分区是否存在
    SET @partition_exists = 0;
    SELECT COUNT(*) INTO @partition_exists 
    FROM information_schema.partitions 
    WHERE table_schema = DATABASE() 
      AND table_name = 'trajectory_data' 
      AND partition_name = partition_name;
    
    -- 如果分区存在则删除
    IF @partition_exists > 0 THEN
        SET sql_text = CONCAT('ALTER TABLE trajectory_data DROP PARTITION ', partition_name);
        SET @sql = sql_text;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        SELECT CONCAT('分区 ', partition_name, ' 已删除') AS result;
    ELSE
        SELECT CONCAT('分区 ', partition_name, ' 不存在') AS result;
    END IF;
END$$

-- 获取最旧的分区日期
CREATE PROCEDURE GetOldestPartitionDate()
BEGIN
    SELECT 
        partition_name,
        STR_TO_DATE(SUBSTRING(partition_name, 2), '%Y%m%d') as partition_date
    FROM information_schema.partitions 
    WHERE table_schema = DATABASE() 
      AND table_name = 'trajectory_data'
      AND partition_name != 'p_future'
    ORDER BY partition_name ASC
    LIMIT 1;
END$$

DELIMITER ; 