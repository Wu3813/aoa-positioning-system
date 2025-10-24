package com.wu.monitor.service;

import com.wu.monitor.model.Tag;
import java.util.List;

public interface TagService {
    /**
     * 获取所有标签
     * @param name 标签名称（可选）
     * @param macAddress MAC地址（可选）
     * @param status 标签状态（可选）
     * @return 标签列表
     */
    List<Tag> getAllTags(String name, String macAddress, Integer status);
    
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
     * 更新标签状态和位置
     * @param id 标签ID
     * @param tag 包含状态和位置信息的标签对象
     * @return 更新后的标签信息
     */
    Tag updateTagStatus(Long id, Tag tag);
    
    /**
     * 根据MAC地址更新标签状态和位置信息
     * @param macAddress MAC地址
     * @param rssi RSSI信号强度
     * @param positionX X坐标
     * @param positionY Y坐标
     * @param positionZ Z坐标
     * @param batteryLevel 电量百分比
     * @param mapId 地图ID
     * @return 是否更新成功
     */
    boolean updateTagStatusByMac(String macAddress, Integer rssi, Double positionX, 
                                Double positionY, Double positionZ, Integer batteryLevel, Integer mapId);
    
    /**
     * 批量导入标签
     * @param tags 标签列表
     * @return 导入成功的标签列表
     */
    List<Tag> batchImportTags(List<Tag> tags);
    
    /**
     * 检查并更新长时间未更新的标签为离线状态
     * @param offlineThresholdMillis 离线阈值（毫秒）
     */
    void checkAndUpdateOfflineTags(long offlineThresholdMillis);
} 