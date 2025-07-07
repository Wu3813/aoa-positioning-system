package com.wu.monitor.service;

import com.wu.monitor.model.User;
import java.util.List;

public interface UserService {
    List<User> getAllUsers();
    User getUserById(Long id);
    User createUser(User user);
    User updateUser(Long id, User user);
    void deleteUser(Long id);
    
    User login(String username, String password);
    
    // 添加批量删除方法
    void batchDeleteUsers(List<Long> ids);
    
    // 添加按用户名搜索方法
    List<User> getUsersByUsername(String username);
}