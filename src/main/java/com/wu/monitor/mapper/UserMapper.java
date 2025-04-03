package com.wu.monitor.mapper;

import com.wu.monitor.model.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserMapper {
    List<User> selectAllUsers();
    
    User selectUserById(@Param("id") Long id);
    
    User selectUserByUsername(@Param("username") String username);
    
    int insertUser(User user);
    
    int updateUser(User user);
    
    int deleteUserById(@Param("id") Long id);
}