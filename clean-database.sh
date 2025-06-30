#!/bin/bash

# 停止并删除所有容器
docker-compose down

# 清理MySQL数据目录
echo "清理MySQL数据目录..."
sudo rm -rf /var/lib/mysql-data/*

# 清理未使用的卷和镜像
docker system prune -f

echo "数据库残留已清空" 