package com.wu.monitor.controller;

import com.wu.monitor.model.Engine;
import com.wu.monitor.service.EngineService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * 引擎代理控制器 - 用于转发前端对引擎的API请求，避免跨域问题
 */
@RestController
@RequestMapping("/api/engines/proxy")
public class EngineProxyController {

    private static final Logger logger = LoggerFactory.getLogger(EngineProxyController.class);

    @Autowired
    private EngineService engineService;

    @Autowired
    private RestTemplate restTemplate;

    /**
     * 构建引擎管理URL
     */
    private String buildManagementUrl(String ipOrUrl, Integer port) {
        if (ipOrUrl == null || ipOrUrl.trim().isEmpty()) {
            throw new IllegalArgumentException("引擎管理IP不能为空");
        }
        
        // 如果已经是完整的URL，直接返回
        if (ipOrUrl.startsWith("http://") || ipOrUrl.startsWith("https://")) {
            return ipOrUrl;
        }
        
        // 如果是IP地址，使用配置中的端口构建完整的URL
        int configPort = (port != null) ? port : 9999;
        return "http://" + ipOrUrl + ":" + configPort;
    }

    /**
     * 健康检查代理
     */
    @GetMapping("/{engineId}/health")
    public ResponseEntity<?> healthCheck(@PathVariable Long engineId) {
        try {
            Engine engine = engineService.getEngineById(engineId);
            if (engine == null) {
                return ResponseEntity.notFound().build();
            }

            String baseUrl = buildManagementUrl(engine.getManagementUrl(), engine.getConfigApiPort());
            String healthUrl = baseUrl + "/api/v1/health";
            
            logger.info("代理健康检查请求: {}", healthUrl);
            
            ResponseEntity<Map> response = restTemplate.getForEntity(healthUrl, Map.class);
            
            // 无论健康检查成功与否，都更新最后通信时间
            engineService.updateLastCommunication(engineId);
            
            return ResponseEntity.ok(response.getBody());
            
        } catch (Exception e) {
            logger.error("健康检查代理失败: {}", e.getMessage(), e);
            
            // 即使健康检查失败，也更新最后通信时间（表示尝试过通信）
            try {
                engineService.updateLastCommunication(engineId);
            } catch (Exception updateException) {
                logger.warn("更新最后通信时间失败: {}", updateException.getMessage());
            }
            
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "健康检查失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorResponse);
        }
    }

    /**
     * 获取当前配置代理
     */
    @GetMapping("/{engineId}/config/current")
    public ResponseEntity<?> getCurrentConfig(@PathVariable Long engineId) {
        try {
            Engine engine = engineService.getEngineById(engineId);
            if (engine == null) {
                return ResponseEntity.notFound().build();
            }

            String baseUrl = buildManagementUrl(engine.getManagementUrl(), engine.getConfigApiPort());
            String configUrl = baseUrl + "/api/v1/config/current";
            
            logger.info("代理获取配置请求: {}", configUrl);
            
            ResponseEntity<Map> response = restTemplate.getForEntity(configUrl, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            // 处理嵌套的配置结构，避免重复
            if (responseBody != null && responseBody.containsKey("config")) {
                // 如果引擎返回的是 { config: { ... }, success: true } 格式
                Map<String, Object> configData = (Map<String, Object>) responseBody.get("config");
                if (configData != null) {
                    // 返回扁平化的配置数据
                    return ResponseEntity.ok(configData);
                }
            }
            
            return ResponseEntity.ok(responseBody);
            
        } catch (Exception e) {
            logger.error("获取配置代理失败: {}", e.getMessage(), e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "获取配置失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorResponse);
        }
    }

    /**
     * 更新配置代理
     */
    @PostMapping("/{engineId}/config/update")
    public ResponseEntity<?> updateConfig(@PathVariable Long engineId, @RequestBody Map<String, Object> configData) {
        try {
            Engine engine = engineService.getEngineById(engineId);
            if (engine == null) {
                return ResponseEntity.notFound().build();
            }

            String baseUrl = buildManagementUrl(engine.getManagementUrl(), engine.getConfigApiPort());
            String configUrl = baseUrl + "/api/v1/config/update";
            
            logger.info("代理更新配置请求: {}", configUrl);
            logger.debug("配置数据: {}", configData);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(configData, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(configUrl, request, Map.class);
            
            // 配置更新成功后，更新最后配置时间
            engineService.updateLastConfigTime(engineId);
            
            return ResponseEntity.ok(response.getBody());
            
        } catch (Exception e) {
            logger.error("更新配置代理失败: {}", e.getMessage(), e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "更新配置失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorResponse);
        }
    }

    /**
     * 上传模型文件代理
     */
    @PostMapping("/{engineId}/model/upload")
    public ResponseEntity<?> uploadModel(@PathVariable Long engineId, @RequestParam("file") MultipartFile file) {
        try {
            // 验证文件
            if (file == null || file.isEmpty()) {
                logger.warn("上传文件为空");
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", "上传文件不能为空");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            Engine engine = engineService.getEngineById(engineId);
            if (engine == null) {
                return ResponseEntity.notFound().build();
            }

            String baseUrl = buildManagementUrl(engine.getManagementUrl(), engine.getConfigApiPort());
            String uploadUrl = baseUrl + "/api/v1/model/upload";
            
            logger.info("代理上传模型请求: {}", uploadUrl);
            logger.info("文件信息: name={}, size={}, contentType={}", 
                       file.getOriginalFilename(), file.getSize(), file.getContentType());
            
            // 准备文件数据
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };
            body.add("file", resource);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(uploadUrl, request, Map.class);
            return ResponseEntity.ok(response.getBody());
            
        } catch (Exception e) {
            logger.error("上传模型代理失败: {}", e.getMessage(), e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "上传模型失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorResponse);
        }
    }

    /**
     * 清理模型文件代理
     */
    @PostMapping("/{engineId}/model/cleanup")
    public ResponseEntity<?> cleanupModels(@PathVariable Long engineId) {
        try {
            Engine engine = engineService.getEngineById(engineId);
            if (engine == null) {
                return ResponseEntity.notFound().build();
            }

            String baseUrl = buildManagementUrl(engine.getManagementUrl(), engine.getConfigApiPort());
            String cleanupUrl = baseUrl + "/api/v1/model/cleanup";
            
            logger.info("代理清理模型请求: {}", cleanupUrl);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(new HashMap<>(), headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(cleanupUrl, request, Map.class);
            return ResponseEntity.ok(response.getBody());
            
        } catch (Exception e) {
            logger.error("清理模型代理失败: {}", e.getMessage(), e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "清理模型失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorResponse);
        }
    }
}
