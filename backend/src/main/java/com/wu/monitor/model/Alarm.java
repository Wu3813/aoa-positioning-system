package com.wu.monitor.model;

import java.util.Date;

/**
 * 报警实体类
 */
public class Alarm {
    private Long id;
    private Date time;
    private Long geofenceId;
    private String geofenceName;
    private Long mapId;
    private String mapName;
    private String alarmTag;
    private Double x;
    private Double y;
    private Date createTime;
    private Date updateTime;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Date getTime() {
        return time;
    }

    public void setTime(Date time) {
        this.time = time;
    }

    public Long getGeofenceId() {
        return geofenceId;
    }

    public void setGeofenceId(Long geofenceId) {
        this.geofenceId = geofenceId;
    }

    public String getGeofenceName() {
        return geofenceName;
    }

    public void setGeofenceName(String geofenceName) {
        this.geofenceName = geofenceName;
    }

    public Long getMapId() {
        return mapId;
    }

    public void setMapId(Long mapId) {
        this.mapId = mapId;
    }

    public String getMapName() {
        return mapName;
    }

    public void setMapName(String mapName) {
        this.mapName = mapName;
    }

    public String getAlarmTag() {
        return alarmTag;
    }

    public void setAlarmTag(String alarmTag) {
        this.alarmTag = alarmTag;
    }

    public Double getX() {
        return x;
    }

    public void setX(Double x) {
        this.x = x;
    }

    public Double getY() {
        return y;
    }

    public void setY(Double y) {
        this.y = y;
    }

    public Date getCreateTime() {
        return createTime;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public Date getUpdateTime() {
        return updateTime;
    }

    public void setUpdateTime(Date updateTime) {
        this.updateTime = updateTime;
    }

    @Override
    public String toString() {
        return "Alarm{" +
                "id=" + id +
                ", time=" + time +
                ", geofenceId=" + geofenceId +
                ", geofenceName='" + geofenceName + '\'' +
                ", mapId=" + mapId +
                ", mapName='" + mapName + '\'' +
                ", alarmTag='" + alarmTag + '\'' +
                ", x=" + x +
                ", y=" + y +
                ", createTime=" + createTime +
                ", updateTime=" + updateTime +
                '}';
    }
}