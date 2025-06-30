package com.wu.monitor.task;

import com.wu.monitor.model.TrackingData;
import com.wu.monitor.model.TaskConfig;
import com.wu.monitor.service.TaskConfigService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import javax.annotation.PostConstruct;
import java.util.LinkedList;
import java.util.List;

/**
 * 轨迹数据推送定时任务
 */
@Component
public class TrajectoryDataTask {
    
    private static final Logger log = LoggerFactory.getLogger(TrajectoryDataTask.class);
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Autowired
    private TaskConfigService taskConfigService;
    
    private final LinkedList<TrackingData> dataQueue = new LinkedList<>();
    private static final String API_URL = "http://localhost:8080/api/realtime/path";
    private boolean isPausing = false;
    private long pauseEndTime = 0;
    private long lastExecuteTime = 0;
    
    @PostConstruct
    public void init() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            ClassPathResource resource = new ClassPathResource("data/trajectory_processed.json");
            List<TrackingData> trackingDataList = mapper.readValue(
                    resource.getInputStream(),
                    mapper.getTypeFactory().constructCollectionType(List.class, TrackingData.class)
            );
            
            dataQueue.addAll(trackingDataList);
            log.info("轨迹数据加载完成，共 {} 条记录", dataQueue.size());
        } catch (Exception e) {
            log.error("轨迹数据加载失败: {}", e.getMessage(), e);
        }
    }
    
    @Scheduled(fixedRate = 100) // 每100ms检查一次
    public void pushTrajectoryData() {
        try {
            TaskConfig.TrajectoryTask config = taskConfigService.getTrajectoryTaskConfig();
            
            // 如果任务被禁用，则直接返回
            if (!config.isEnabled()) {
                return;
            }
            
            long currentTime = System.currentTimeMillis();
            
            // 检查是否在暂停期间
            if (isPausing) {
                if (currentTime >= pauseEndTime) {
                    // 暂停结束，重新加载数据
                    isPausing = false;
                    init();
                    log.info("暂停结束，重新开始推送数据");
                }
                return; // 暂停期间不执行推送
            }
            
            // 检查是否到达发送时间
            if (currentTime - lastExecuteTime < config.getSendIntervalMs()) {
                return;
            }
            
            // 发送数据
            if (!dataQueue.isEmpty()) {
                TrackingData data = dataQueue.pollFirst();
                
                // 设置HTTP请求头
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                
                // 创建HTTP请求实体
                HttpEntity<TrackingData> requestEntity = new HttpEntity<>(data, headers);
                
                // 调用REST API
                restTemplate.postForEntity(API_URL, requestEntity, Void.class);
                lastExecuteTime = currentTime;
                
                log.debug("成功发送轨迹数据，队列剩余: {}", dataQueue.size());
            } else {
                // 队列为空时开始暂停
                isPausing = true;
                pauseEndTime = currentTime + config.getPauseMs();
                log.info("队列已空，开始{}毫秒暂停...", config.getPauseMs());
            }
        } catch (Exception e) {
            log.error("轨迹数据推送任务异常: {}", e.getMessage(), e);
        }
    }
} 