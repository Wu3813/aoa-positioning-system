package com.wu.monitor.service.impl;

import com.wu.monitor.exception.ResourceNotFoundException;
import com.wu.monitor.mapper.TagMapper;
import com.wu.monitor.model.Tag;
import com.wu.monitor.model.TaskConfig;
import com.wu.monitor.service.TagService;
import com.wu.monitor.service.TaskConfigService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class TagServiceImpl implements TagService {

    @Autowired
    private TagMapper tagMapper;
    
    @Autowired
    private TaskConfigService taskConfigService;

    @Override
    public List<Tag> getAllTags(String name, String macAddress, Integer status) {
        return tagMapper.selectAllTags(name, macAddress, status);
    }

    @Override
    public Tag getTagById(Long id) {
        Tag tag = tagMapper.selectTagById(id);
        if (tag == null) {
            throw new ResourceNotFoundException("标签不存在");
        }
        return tag;
    }

    @Override
    @Transactional
    public Tag createTag(Tag tag) {
        // 确保MAC地址统一为小写
        if (tag.getMacAddress() != null) {
            tag.setMacAddress(tag.getMacAddress().toLowerCase());
        }
        
        // 检查MAC地址是否已存在
        if (tagMapper.selectTagByMacAddress(tag.getMacAddress()) != null) {
            throw new IllegalArgumentException("MAC地址已存在");
        }
        
        // 设置创建时间
        tag.setCreateTime(LocalDateTime.now());
        
        // 如果未设置最后可见时间，默认为当前时间
        if (tag.getLastSeen() == null) {
            tag.setLastSeen(LocalDateTime.now());
        }
        
        // 如果未设置状态，默认为离线
        if (tag.getStatus() == null) {
            tag.setStatus(0);
        }
        
        tagMapper.insertTag(tag);
        return getTagById(tag.getId());
    }

    @Override
    @Transactional
    public Tag updateTag(Long id, Tag tag) {
        // 确保MAC地址统一为小写
        if (tag.getMacAddress() != null) {
            tag.setMacAddress(tag.getMacAddress().toLowerCase());
        }
        
        // 检查标签是否存在
        Tag existingTag = tagMapper.selectTagById(id);
        if (existingTag == null) {
            throw new ResourceNotFoundException("标签不存在");
        }
        
        // 检查MAC地址是否与其他标签重复
        if (tag.getMacAddress() != null && !tag.getMacAddress().equals(existingTag.getMacAddress())) {
            Tag tagWithSameMac = tagMapper.selectTagByMacAddress(tag.getMacAddress());
            if (tagWithSameMac != null && !tagWithSameMac.getId().equals(id)) {
                throw new IllegalArgumentException("MAC地址已存在");
            }
        }
        
        tag.setId(id);
        tagMapper.updateTag(tag);
        return getTagById(id);
    }

    @Override
    @Transactional
    public void deleteTag(Long id) {
        // 检查标签是否存在
        if (tagMapper.selectTagById(id) == null) {
            throw new ResourceNotFoundException("标签不存在");
        }
        tagMapper.deleteTagById(id);
    }

    @Override
    @Transactional
    public void batchDeleteTags(List<Long> ids) {
        tagMapper.batchDeleteTags(ids);
    }

    @Override
    public List<Tag> getTagsByMapId(Long mapId) {
        return tagMapper.selectTagsByMapId(mapId);
    }

    @Override
    @Transactional
    public Tag updateTagStatus(Long id, Tag tag) {
        // 检查标签是否存在
        if (tagMapper.selectTagById(id) == null) {
            throw new ResourceNotFoundException("标签不存在");
        }
        
        // 更新状态和位置信息
        tagMapper.updateTagStatus(
            id,
            tag.getStatus(),
            tag.getRssi(),
            tag.getPositionX(),
            tag.getPositionY(),
            tag.getPositionZ(),
            tag.getBatteryLevel(),
            LocalDateTime.now()
        );
        
        return getTagById(id);
    }
    
    @Override
    @Transactional
    public boolean updateTagStatusByMac(String macAddress, Integer rssi, Double positionX, 
                                       Double positionY, Double positionZ, Integer batteryLevel, Integer mapId) {
        try {
            // 确保MAC地址统一为小写
            if (macAddress != null) {
                macAddress = macAddress.toLowerCase();
            }
            
            // 检查标签是否存在
            Tag existingTag = tagMapper.selectTagByMacAddress(macAddress);
            if (existingTag == null) {
                return false; // 标签不存在，返回false
            }
            
            // 根据MAC地址更新标签状态和位置信息
            int affected = tagMapper.updateTagStatusByMac(
                macAddress,
                1, // 状态设为在线
                rssi,
                positionX,
                positionY,
                positionZ,
                batteryLevel,
                mapId,
                LocalDateTime.now()
            );
            
            return affected > 0;
        } catch (Exception e) {
            return false;
        }
    }
    
    @Override
    @Transactional
    public List<Tag> batchImportTags(List<Tag> tags) {
        if (tags == null || tags.isEmpty()) {
            throw new IllegalArgumentException("标签列表不能为空");
        }
        
        List<Tag> importedTags = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        
        for (Tag tag : tags) {
            try {
                // 确保MAC地址统一为小写
                if (tag.getMacAddress() != null) {
                    tag.setMacAddress(tag.getMacAddress().toLowerCase());
                }
                
                // 检查MAC地址是否已存在
                Tag existingTag = tagMapper.selectTagByMacAddress(tag.getMacAddress());
                if (existingTag != null) {
                    log.warn("跳过重复的MAC地址: {}", tag.getMacAddress());
                    continue;
                }
                
                // 设置默认值
                if (tag.getCreateTime() == null) {
                    tag.setCreateTime(now);
                }
                if (tag.getLastSeen() == null) {
                    tag.setLastSeen(now);
                }
                if (tag.getStatus() == null) {
                    tag.setStatus(0); // 默认为离线
                }
                
                // 插入标签
                tagMapper.insertTag(tag);
                importedTags.add(tag);
                
            } catch (Exception e) {
                log.error("导入标签失败: MAC={}, 错误: {}", tag.getMacAddress(), e.getMessage());
                // 继续处理下一个标签，不中断整个导入过程
            }
        }
        
        log.info("批量导入完成，成功导入 {} 个标签，跳过 {} 个标签", 
                importedTags.size(), tags.size() - importedTags.size());
        
        return importedTags;
    }
    
    @Override
    @Transactional
    public void checkAndUpdateOfflineTags(long offlineThresholdMillis) {
        try {
            LocalDateTime thresholdTime = LocalDateTime.now().minusNanos(offlineThresholdMillis * 1_000_000);
            int affected = tagMapper.updateOfflineTagsByTime(thresholdTime);
            if (affected > 0) {
                log.info("将 {} 个标签设置为离线状态（{}毫秒超时）", affected, offlineThresholdMillis);
            }
        } catch (Exception e) {
            log.error("检查并更新离线标签异常: {}", e.getMessage(), e);
        }
    }
    
    // 定时检查离线标签 - 每3秒执行一次
    @Scheduled(fixedRate = 3000) // 3秒 = 3000毫秒
    public void scheduleOfflineCheck() {
        try {
            // 获取超时配置
            TaskConfig config = taskConfigService.getTaskConfig();
            if (config != null && config.getTimeoutTask() != null && config.getTimeoutTask().isEnabled()) {
                // 使用配置的超时时间
                long timeoutMs = config.getTimeoutTask().getTimeoutMs();
                checkAndUpdateOfflineTags(timeoutMs);
            } else {
                // 如果超时管理未启用，使用默认的30秒
                checkAndUpdateOfflineTags(30000);
            }
        } catch (Exception e) {
            log.error("获取超时配置异常，使用默认30秒超时: {}", e.getMessage());
            checkAndUpdateOfflineTags(30000);
        }
    }
} 