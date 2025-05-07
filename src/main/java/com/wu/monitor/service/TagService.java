package com.wu.monitor.service;

import com.wu.monitor.model.Tag;
import java.util.List;

public interface TagService {
    /**
     * 获取所有标签
     * @param code 标签编号（可选）
     * @param name 标签名称（可选）
     * @param groupName 标签分组（可选）
     * @param status 标签状态（可选）
     * @return 标签列表
     */
    List<Tag> getAllTags(String code, String name, String groupName, Integer status);
    
    /**
     * 根据ID获取标签
     * @param id 标签ID
     * @return 标签信息
     */
    Tag getTagById(Long id);
    
    /**
     * 创建标签
     * @param tag 标签信息
     * @return 创建后的标签信息
     */
    Tag createTag(Tag tag);
    
    /**
     * 更新标签
     * @param id 标签ID
     * @param tag 标签信息
     * @return 更新后的标签信息
     */
    Tag updateTag(Long id, Tag tag);
    
    /**
     * 删除标签
     * @param id 标签ID
     */
    void deleteTag(Long id);
    
    /**
     * 批量删除标签
     * @param ids 标签ID列表
     */
    void batchDeleteTags(List<Long> ids);
    
    /**
     * 获取指定地图下的所有标签
     * @param mapId 地图ID
     * @return 标签列表
     */
    List<Tag> getTagsByMapId(Long mapId);
    
    /**
     * 获取指定分组下的所有标签
     * @param groupName 分组名称
     * @return 标签列表
     */
    List<Tag> getTagsByGroupName(String groupName);
    
    /**
     * 更新标签状态和位置
     * @param id 标签ID
     * @param tag 包含状态和位置信息的标签对象
     * @return 更新后的标签信息
     */
    Tag updateTagStatus(Long id, Tag tag);
} 