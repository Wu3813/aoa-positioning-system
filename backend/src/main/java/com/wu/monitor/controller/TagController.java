package com.wu.monitor.controller;

import com.wu.monitor.model.Tag;
import com.wu.monitor.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 标签管理控制器
 */
@RestController
@RequestMapping("/api/tags")
@CrossOrigin(origins = "*")
public class TagController {

    @Autowired
    private TagService tagService;

    /**
     * 获取所有标签
     * @param name 标签名称（可选）
     * @param macAddress MAC地址（可选）
     * @param status 标签状态（可选）
     * @return 标签列表
     */
    @GetMapping
    public List<Tag> getAllTags(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String macAddress,
            @RequestParam(required = false) Integer status
    ) {
        return tagService.getAllTags(name, macAddress, status);
    }

    /**
     * 根据ID获取标签
     * @param id 标签ID
     * @return 标签信息
     */
    @GetMapping("/{id}")
    public ResponseEntity<Tag> getTagById(@PathVariable Long id) {
        Tag tag = tagService.getTagById(id);
        return tag != null ? ResponseEntity.ok(tag) : ResponseEntity.notFound().build();
    }

    /**
     * 创建标签
     * @param tag 标签信息
     * @return 创建后的标签信息
     */
    @PostMapping
    public Tag createTag(@RequestBody Tag tag) {
        return tagService.createTag(tag);
    }

    /**
     * 更新标签
     * @param id 标签ID
     * @param tag 标签信息
     * @return 更新后的标签信息
     */
    @PutMapping("/{id}")
    public Tag updateTag(@PathVariable Long id, @RequestBody Tag tag) {
        return tagService.updateTag(id, tag);
    }

    /**
     * 删除标签
     * @param id 标签ID
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTag(@PathVariable Long id) {
        tagService.deleteTag(id);
        return ResponseEntity.ok().build();
    }

    /**
     * 批量删除标签
     * @param ids 标签ID列表
     */
    @DeleteMapping("/batch")
    public ResponseEntity<Void> batchDeleteTags(@RequestBody List<Long> ids) {
        tagService.batchDeleteTags(ids);
        return ResponseEntity.ok().build();
    }

    /**
     * 获取指定地图下的所有标签
     * @param mapId 地图ID
     * @return 标签列表
     */
    @GetMapping("/map/{mapId}")
    public List<Tag> getTagsByMapId(@PathVariable Long mapId) {
        return tagService.getTagsByMapId(mapId);
    }

    /**
     * 更新标签状态和位置
     * @param id 标签ID
     * @param tag 包含状态和位置信息的标签对象
     * @return 更新后的标签信息
     */
    @PutMapping("/{id}/status")
    public Tag updateTagStatus(@PathVariable Long id, @RequestBody Tag tag) {
        return tagService.updateTagStatus(id, tag);
    }

    /**
     * 批量导入标签
     * @param tags 标签列表
     * @return 导入结果
     */
    @PostMapping("/batch")
    public ResponseEntity<Object> batchImportTags(@RequestBody List<Tag> tags) {
        try {
            List<Tag> importedTags = tagService.batchImportTags(tags);
            int totalCount = tags != null ? tags.size() : 0;
            int importedCount = importedTags.size();
            int skippedCount = totalCount - importedCount;
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "批量导入完成");
            response.put("totalCount", totalCount);
            response.put("importedCount", importedCount);
            response.put("skippedCount", skippedCount);
            response.put("data", importedTags);
            return ResponseEntity.ok().body(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "批量导入失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
} 