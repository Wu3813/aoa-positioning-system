USE aoa;

-- 任务配置表
CREATE TABLE IF NOT EXISTS task_config (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  station_interval_ms BIGINT NOT NULL DEFAULT 60000 COMMENT '基站刷新间隔（毫秒）',
  station_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '基站任务是否启用',
  trajectory_enabled BOOLEAN NOT NULL DEFAULT FALSE COMMENT '轨迹任务是否启用',
  trajectory_send_interval_ms BIGINT NOT NULL DEFAULT 300 COMMENT '轨迹发送间隔（毫秒）',
  trajectory_pause_ms BIGINT NOT NULL DEFAULT 20000 COMMENT '轨迹暂停时间（毫秒）',
  storage_interval_ms BIGINT NOT NULL DEFAULT 5000 COMMENT '存储间隔（毫秒）',
  storage_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '存储任务是否启用',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务配置表';

-- 插入默认配置
INSERT INTO task_config (
  station_interval_ms,
  station_enabled,
  trajectory_enabled,
  trajectory_send_interval_ms,
  trajectory_pause_ms,
  storage_interval_ms,
  storage_enabled
) 
SELECT 60000, true, false, 300, 20000, 5000, true
FROM DUAL
WHERE NOT EXISTS (SELECT * FROM task_config LIMIT 1); 