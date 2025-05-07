package com.wu.monitor.mapper;

import com.wu.monitor.model.Tag;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface TagMapper {
    /**
     * 查询所有标签
     * @param code 标签编号（可选）
     * @param name 标签名称（可选）
     * @param groupName 标签分组（可选）
     * @param status 标签状态（可选）
     * @return 标签列表
     */
    List<Tag> selectAllTags(@Param("code") String code, 
                           @Param("name") String name, 
                           @Param("groupName") String groupName,
                           @Param("status") Integer status);
    
    /**
     * 根据ID查询标签
     * @param id 标签ID
     * @return 标签信息
     */
    Tag selectTagById(@Param("id") Long id);
    
    /**
     * 根据MAC地址查询标签
     * @param macAddress MAC地址
     * @return 标签信息
     */
    Tag selectTagByMacAddress(@Param("macAddress") String macAddress);
    
    /**
     * 根据编号查询标签
     * @param code 标签编号
     * @return 标签信息
     */
    Tag selectTagByCode(@Param("code") String code);
    
    /**
     * 插入标签信息
     * @param tag 标签信息
     * @return 影响行数
     */
    int insertTag(Tag tag);
    
    /**
     * 更新标签信息
     * @param tag 标签信息
     * @return 影响行数
     */
    int updateTag(Tag tag);
    
    /**
     * 更新标签状态和位置信息
     * @param id 标签ID
     * @param status 状态
     * @param rssi RSSI信号强度
     * @param positionX X坐标
     * @param positionY Y坐标
     * @param positionZ Z坐标
     * @param batteryLevel 电量百分比
     * @param lastSeen 最后可见时间
     * @return 影响行数
     */
    int updateTagStatus(@Param("id") Long id, 
                        @Param("status") Integer status, 
                        @Param("rssi") Integer rssi,
                        @Param("positionX") Double positionX,
                        @Param("positionY") Double positionY,
                        @Param("positionZ") Double positionZ,
                        @Param("batteryLevel") Integer batteryLevel,
                        @Param("lastSeen") LocalDateTime lastSeen);
    
    /**
     * 删除标签
     * @param id 标签ID
     * @return 影响行数
     */
    int deleteTagById(@Param("id") Long id);
    
    /**
     * 批量删除标签
     * @param ids 标签ID列表
     */
    void batchDeleteTags(@Param("ids") List<Long> ids);
    
    /**
     * 根据地图ID查询标签
     * @param mapId 地图ID
     * @return 标签列表
     */
    List<Tag> selectTagsByMapId(@Param("mapId") Long mapId);
    
    /**
     * 根据分组查询标签
     * @param groupName 分组名称
     * @return 标签列表
     */
    List<Tag> selectTagsByGroupName(@Param("groupName") String groupName);
} 