package com.wu.monitor.service.impl;

import com.wu.monitor.exception.ResourceNotFoundException;
import com.wu.monitor.mapper.TagMapper;
import com.wu.monitor.model.Tag;
import com.wu.monitor.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TagServiceImpl implements TagService {

    @Autowired
    private TagMapper tagMapper;

    @Override
    public List<Tag> getAllTags(String code, String name, String groupName, Integer status) {
        return tagMapper.selectAllTags(code, name, groupName, status);
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
        // 检查编号是否已存在
        if (tagMapper.selectTagByCode(tag.getCode()) != null) {
            throw new IllegalArgumentException("标签编号已存在");
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
        // 检查标签是否存在
        Tag existingTag = tagMapper.selectTagById(id);
        if (existingTag == null) {
            throw new ResourceNotFoundException("标签不存在");
        }
        
        // 检查编号是否与其他标签重复
        if (tag.getCode() != null && !tag.getCode().equals(existingTag.getCode())) {
            Tag tagWithSameCode = tagMapper.selectTagByCode(tag.getCode());
            if (tagWithSameCode != null && !tagWithSameCode.getId().equals(id)) {
                throw new IllegalArgumentException("标签编号已存在");
            }
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
    public List<Tag> getTagsByGroupName(String groupName) {
        return tagMapper.selectTagsByGroupName(groupName);
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
} 