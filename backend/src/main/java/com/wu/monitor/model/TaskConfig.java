package com.wu.monitor.model;

/**
 * 任务配置模型
 */
public class TaskConfig {
    
    private Long id;  // 数据库记录ID
    
    /**
     * 基站刷新任务配置
     */
    public static class StationTask {
        private long intervalMs = 60000; // 刷新间隔（毫秒），默认1分钟
        private boolean enabled = true;  // 是否启用
        
        public long getIntervalMs() {
            return intervalMs;
        }
        
        public void setIntervalMs(long intervalMs) {
            this.intervalMs = intervalMs;
        }
        
        public boolean isEnabled() {
            return enabled;
        }
        
        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
    
    /**
     * 轨迹发送任务配置
     */
    public static class TrajectoryTask {
        private boolean enabled = false;        // 是否启用发送
        private long sendIntervalMs = 300;     // 发送间隔（毫秒）
        private long pauseMs = 20000;          // 暂停时间（毫秒），默认20秒
        
        public boolean isEnabled() {
            return enabled;
        }
        
        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
        
        public long getSendIntervalMs() {
            return sendIntervalMs;
        }
        
        public void setSendIntervalMs(long sendIntervalMs) {
            this.sendIntervalMs = sendIntervalMs;
        }
        
        public long getPauseMs() {
            return pauseMs;
        }
        
        public void setPauseMs(long pauseMs) {
            this.pauseMs = pauseMs;
        }
    }
    
    /**
     * 轨迹存储任务配置
     */
    public static class StorageTask {
        private long intervalMs = 5000;     // 存储间隔（毫秒），默认5秒
        private boolean enabled = true;     // 是否启用，默认启用

        public long getIntervalMs() {
            return intervalMs;
        }

        public void setIntervalMs(long intervalMs) {
            this.intervalMs = intervalMs;
        }
        
        public boolean isEnabled() {
            return enabled;
        }
        
        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
    
    private StationTask stationTask = new StationTask();
    private TrajectoryTask trajectoryTask = new TrajectoryTask();
    private StorageTask storageTask = new StorageTask();
    
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public StationTask getStationTask() {
        return stationTask;
    }
    
    public void setStationTask(StationTask stationTask) {
        this.stationTask = stationTask;
    }
    
    public TrajectoryTask getTrajectoryTask() {
        return trajectoryTask;
    }
    
    public void setTrajectoryTask(TrajectoryTask trajectoryTask) {
        this.trajectoryTask = trajectoryTask;
    }
    
    public StorageTask getStorageTask() {
        return storageTask;
    }
    
    public void setStorageTask(StorageTask storageTask) {
        this.storageTask = storageTask;
    }
} 