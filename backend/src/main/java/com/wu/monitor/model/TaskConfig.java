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
    
    /**
     * 超时管理配置
     */
    public static class TimeoutTask {
        private boolean enabled = true;     // 是否启用超时管理，默认启用
        private long timeoutMs = 30000;     // 超时时间（毫秒），默认30秒

        public boolean isEnabled() {
            return enabled;
        }
        
        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
        
        public long getTimeoutMs() {
            return timeoutMs;
        }
        
        public void setTimeoutMs(long timeoutMs) {
            this.timeoutMs = timeoutMs;
        }
    }
    
    /**
     * 显示配置
     */
    public static class DisplayConfig {
        private int tagIconSize = 10;       // 标签图标大小（像素），默认10像素

        public int getTagIconSize() {
            return tagIconSize;
        }
        
        public void setTagIconSize(int tagIconSize) {
            this.tagIconSize = tagIconSize;
        }
    }
    
    /**
     * 数据清理配置
     */
    public static class CleanupConfig {
        private int trajectoryRetentionDays = 30;    // 轨迹数据保留天数，默认30天
        private boolean diskCleanupEnabled = true;   // 磁盘空间清理是否启用，默认启用
        private int diskSpaceThreshold = 20;         // 磁盘空间阈值（百分比），默认20%
        
        public int getTrajectoryRetentionDays() {
            return trajectoryRetentionDays;
        }
        
        public void setTrajectoryRetentionDays(int trajectoryRetentionDays) {
            this.trajectoryRetentionDays = trajectoryRetentionDays;
        }
        
        public boolean isDiskCleanupEnabled() {
            return diskCleanupEnabled;
        }
        
        public void setDiskCleanupEnabled(boolean diskCleanupEnabled) {
            this.diskCleanupEnabled = diskCleanupEnabled;
        }
        
        public int getDiskSpaceThreshold() {
            return diskSpaceThreshold;
        }
        
        public void setDiskSpaceThreshold(int diskSpaceThreshold) {
            this.diskSpaceThreshold = diskSpaceThreshold;
        }
    }
    
    private StationTask stationTask = new StationTask();
    private TrajectoryTask trajectoryTask = new TrajectoryTask();
    private StorageTask storageTask = new StorageTask();
    private TimeoutTask timeoutTask = new TimeoutTask();
    private DisplayConfig displayConfig = new DisplayConfig();
    private CleanupConfig cleanupConfig = new CleanupConfig();
    
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
    
    public TimeoutTask getTimeoutTask() {
        return timeoutTask;
    }
    
    public void setTimeoutTask(TimeoutTask timeoutTask) {
        this.timeoutTask = timeoutTask;
    }
    
    public DisplayConfig getDisplayConfig() {
        return displayConfig;
    }
    
    public void setDisplayConfig(DisplayConfig displayConfig) {
        this.displayConfig = displayConfig;
    }
    
    public CleanupConfig getCleanupConfig() {
        return cleanupConfig;
    }
    
    public void setCleanupConfig(CleanupConfig cleanupConfig) {
        this.cleanupConfig = cleanupConfig;
    }
} 