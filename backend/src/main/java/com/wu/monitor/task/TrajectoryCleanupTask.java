package com.wu.monitor.task;

import com.wu.monitor.mapper.TrajectoryStorageMapper;
import com.wu.monitor.service.TaskConfigService;
import com.wu.monitor.model.TaskConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.File;
import java.time.LocalDate;

/**
 * 轨迹数据清理定时任务
 * 功能1：每天定时清理过期的轨迹数据（按保留天数）
 * 功能2：检查磁盘空间，当剩余空间低于阈值时清理最旧的数据
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TrajectoryCleanupTask {
    
    private final TrajectoryStorageMapper trajectoryStorageMapper;
    private final TaskConfigService taskConfigService;
    
    /**
     * 每天凌晨2点清理过期数据
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupExpiredData() {
        try {
            TaskConfig.CleanupConfig config = taskConfigService.getCleanupConfig();
            
            if (config == null) {
                log.warn("数据清理配置为空，跳过清理任务");
                return;
            }
            
            int retentionDays = config.getTrajectoryRetentionDays();
            
            log.info("开始清理过期轨迹数据，保留天数: {} 天", retentionDays);
            
            // 计算过期日期（今天往前推保留天数）
            LocalDate cutoffDate = LocalDate.now().minusDays(retentionDays);
            
            // 获取最旧的分区日期
            LocalDate oldestPartitionDate = trajectoryStorageMapper.getOldestPartitionDate();
            
            if (oldestPartitionDate == null) {
                log.info("没有找到可清理的分区");
                return;
            }
            
            int deletedPartitions = 0;
            
            // 从最旧的分区开始，逐个删除直到cutoffDate
            LocalDate currentDate = oldestPartitionDate;
            while (currentDate.isBefore(cutoffDate)) {
                try {
                    trajectoryStorageMapper.dropPartition(currentDate);
                    log.info("已删除过期分区: {}", currentDate);
                    deletedPartitions++;
                } catch (Exception e) {
                    log.error("删除分区 {} 失败: {}", currentDate, e.getMessage());
                }
                
                currentDate = currentDate.plusDays(1);
            }
            
            log.info("过期数据清理完成，共删除 {} 个分区", deletedPartitions);
            
        } catch (Exception e) {
            log.error("清理过期数据异常", e);
        }
    }
    
    /**
     * 如果磁盘剩余空间低于阈值，则清理最旧的数据直到满足条件
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void checkDiskSpaceAndCleanup() {
        try {
            TaskConfig.CleanupConfig config = taskConfigService.getCleanupConfig();
            
            if (config == null || !config.isDiskCleanupEnabled()) {
                log.debug("磁盘空间清理已禁用");
                return;
            }
            
            int threshold = config.getDiskSpaceThreshold();
            
            // 获取磁盘空间使用情况
            DiskSpaceInfo diskInfo = getDiskSpaceInfo();
            
            if (diskInfo == null) {
                log.warn("无法获取磁盘空间信息");
                return;
            }
            
            double usedPercentage = diskInfo.getUsedPercentage();
            double freePercentage = 100 - usedPercentage;
            
            log.info("当前磁盘使用情况 - 已用: {:.2f}%, 剩余: {:.2f}%", 
                    usedPercentage, freePercentage);
            
            if (freePercentage >= threshold) {
                log.debug("磁盘剩余空间充足: {:.2f}% >= {}%", freePercentage, threshold);
                return;
            }
            
            log.warn("磁盘剩余空间不足: {:.2f}% < {}%，开始清理最旧的数据", 
                    freePercentage, threshold);
            
            int deletedPartitions = 0;
            
            // 循环删除最旧的分区，直到磁盘空间满足条件
            while (freePercentage < threshold) {
                LocalDate oldestPartitionDate = trajectoryStorageMapper.getOldestPartitionDate();
                
                if (oldestPartitionDate == null) {
                    log.warn("没有更多可清理的分区，但磁盘空间仍然不足");
                    break;
                }
                
                try {
                    trajectoryStorageMapper.dropPartition(oldestPartitionDate);
                    log.info("已删除最旧分区: {}", oldestPartitionDate);
                    deletedPartitions++;
                    
                    // 重新检查磁盘空间
                    diskInfo = getDiskSpaceInfo();
                    if (diskInfo == null) {
                        break;
                    }
                    
                    usedPercentage = diskInfo.getUsedPercentage();
                    freePercentage = 100 - usedPercentage;
                    
                    log.info("清理后磁盘使用情况 - 已用: {:.2f}%, 剩余: {:.2f}%", 
                            usedPercentage, freePercentage);
                    
                } catch (Exception e) {
                    log.error("删除分区 {} 失败: {}", oldestPartitionDate, e.getMessage());
                    break;
                }
                
                // 防止无限循环
                if (deletedPartitions > 1000) {
                    log.error("已删除 {} 个分区，停止清理", deletedPartitions);
                    break;
                }
            }
            
            if (deletedPartitions > 0) {
                log.info("基于磁盘空间的清理完成，共删除 {} 个分区", deletedPartitions);
            }
            
        } catch (Exception e) {
            log.error("磁盘空间检查和清理异常", e);
        }
    }
    
    /**
     * 获取磁盘空间信息
     * 优先使用数据库存储路径，如果无法获取则使用系统根目录
     */
    private DiskSpaceInfo getDiskSpaceInfo() {
        try {
            // 尝试获取MySQL数据目录
            String dataDir = System.getProperty("user.dir");
            File diskPartition = new File(dataDir);
            
            long totalSpace = diskPartition.getTotalSpace();
            long freeSpace = diskPartition.getFreeSpace();
            long usedSpace = totalSpace - freeSpace;
            
            if (totalSpace == 0) {
                return null;
            }
            
            double usedPercentage = (usedSpace * 100.0) / totalSpace;
            
            return new DiskSpaceInfo(totalSpace, usedSpace, freeSpace, usedPercentage);
            
        } catch (Exception e) {
            log.error("获取磁盘空间信息失败", e);
            return null;
        }
    }
    
    /**
     * 磁盘空间信息类
     */
    private static class DiskSpaceInfo {
        private final long totalSpace;
        private final long usedSpace;
        private final long freeSpace;
        private final double usedPercentage;
        
        public DiskSpaceInfo(long totalSpace, long usedSpace, long freeSpace, double usedPercentage) {
            this.totalSpace = totalSpace;
            this.usedSpace = usedSpace;
            this.freeSpace = freeSpace;
            this.usedPercentage = usedPercentage;
        }
        
        public double getUsedPercentage() {
            return usedPercentage;
        }
    }
}

