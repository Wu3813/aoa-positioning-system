package com.wu.monitor.mapper;

import com.wu.monitor.model.Alarm;
import org.apache.ibatis.annotations.Param;
import java.util.Date;
import java.util.List;

/**
 * 报警Mapper接口
 */
public interface AlarmMapper {

    /**
     * 插入报警记录
     * @param alarm 报警实体
     * @return 受影响的行数
     */
    int insert(Alarm alarm);

    /**
     * 根据ID查询报警记录
     * @param id 报警记录ID
     * @return 报警记录
     */
    Alarm selectById(Long id);

    /**
     * 查询所有报警记录
     * @return 所有报警记录列表
     */
    List<Alarm> selectAll();

    /**
     * 分页条件查询报警记录
     * @param geofenceName 围栏名称
     * @param mapId 地图ID
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @param sortField 排序字段
     * @param sortOrder 排序方向 (asc, desc)
     * @return 报警记录列表
     */
    List<Alarm> selectByCondition(
            @Param("geofenceName") String geofenceName,
            @Param("mapId") Long mapId,
            @Param("startTime") Date startTime,
            @Param("endTime") Date endTime,
            @Param("sortField") String sortField,
            @Param("sortOrder") String sortOrder
    );
    
    /**
     * 删除报警记录
     * @param id 报警记录ID
     * @return 受影响的行数
     */
    int deleteById(Long id);
} 