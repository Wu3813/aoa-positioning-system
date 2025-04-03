package com.wu.monitor.service.impl;


import com.wu.monitor.controller.PathProcessor;
import com.wu.monitor.model.Path;
import com.wu.monitor.model.PathDataDto;
import com.wu.monitor.service.MonitorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import javax.annotation.PostConstruct;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MonitorServiceImpl implements MonitorService {
    private List<Path> path = new ArrayList<>();
    private final LinkedList<PathDataDto> dataQueue = new LinkedList<>();
    private final SimpMessagingTemplate messagingTemplate;
    @PostConstruct
    public void init() {
        try {
            ObjectMapper mapper = new ObjectMapper();

            ClassPathResource resource = new ClassPathResource("data/trajectory.json");
            path = mapper.readValue(
                    resource.getInputStream(),
                    mapper.getTypeFactory().constructCollectionType(List.class, Path.class)
            );
            path.stream()
                    .map(PathProcessor::convertToDto)
                    .forEach(dataQueue::add);

            // 打印加载的数据详情
            System.out.println("\n=== 完整轨迹数据 ===");
            System.out.println(String.format("共加载 %d 条记录", path.size()));

            path.forEach(p -> {
                System.out.println("\n设备: " + p.getDeviceId());
                System.out.println("坐标: (" + p.getX() + ", " + p.getY() + ", " + p.getZ() + ")");
                System.out.println("标准差: x=" + p.getXStdev()
                        + ", y=" + p.getYStdev()
                        + ", z=" + p.getZStdev());
                System.out.println("时间: " + changeTime(p.getRawTimestamp()));
            });
            System.out.println("===================\n");

        } catch (Exception e) {
            System.err.println("数据加载失败: " + e.getMessage());
            e.printStackTrace();
        }
    }
    public String changeTime(String t){
        // 提取整数秒部分
        long seconds = Long.parseLong(t.split("\\.")[0]);

        // 转换为 Instant（仅秒级）
        Instant instant = Instant.ofEpochSecond(seconds);

        // 定义日期时间格式（到秒）
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        // UTC 时间
        String utcTime = instant.atZone(ZoneId.of("UTC"))
                .format(formatter);
        return utcTime;
    }
    @Override
    public List<Path> getAllTrajectories() {
        return new ArrayList<>(path);
    }

    @Override
    public List<Path> getByDeviceId(String deviceId) {
        List<Path> result = new ArrayList<>();
        for (Path p : path) {
            if (p.getDeviceId().equals(deviceId)) {
                result.add(p);
            }
        }
        return result;
    }
    @Scheduled(fixedRate = 1000)
    public void pushData() {
        try {
            if (!dataQueue.isEmpty()) {
                PathDataDto data = dataQueue.pollFirst();
                System.out.println("[推送日志] 准备发送数据: " + data); // 添加日志

                // 关键验证：检查 messagingTemplate 是否非空
                if (messagingTemplate != null) {
                    messagingTemplate.convertAndSend("/topic/pathData", data);
                    System.out.println("[推送日志] 数据已发送到 /topic/pathData");
                } else {
                    System.err.println("[错误] messagingTemplate 未注入");
                }
            } else {
                System.out.println("[推送日志] 数据队列为空");
            }
        } catch (Exception e) {
            System.err.println("[推送异常] 消息发送失败: " + e.getMessage());
            e.printStackTrace();
        }
    }



}