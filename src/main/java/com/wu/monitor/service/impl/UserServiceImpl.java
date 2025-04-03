package com.wu.monitor.service.impl;

import com.wu.monitor.mapper.UserMapper;
import com.wu.monitor.model.User;
import com.wu.monitor.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class UserServiceImpl implements UserService {
    
    private final UserMapper userMapper;
    
    @Autowired
    public UserServiceImpl(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    @Override
    public List<User> getAllUsers() {
        return userMapper.selectAllUsers();
    }

    @Override
    public User getUserById(Long id) {
        return userMapper.selectUserById(id);
    }

    @Override
    public User createUser(User user) {
        user.setCreateTime(LocalDateTime.now());
        userMapper.insertUser(user);
        return user;
    }

    @Override
    public User updateUser(Long id, User user) {
        User existingUser = userMapper.selectUserById(id);
        if (existingUser == null) {
            return null;
        }
        
        user.setId(id);
        userMapper.updateUser(user);
        return userMapper.selectUserById(id);
    }

    @Override
    public void deleteUser(Long id) {
        userMapper.deleteUserById(id);
    }

    @Override
    public User login(String username, String password) {
        User user = userMapper.selectUserByUsername(username);
        if (user != null && password.equals(user.getPassword())) {
            return user;
        }
        return null;
    }
}