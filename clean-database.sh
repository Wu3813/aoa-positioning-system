#!/bin/bash

# 停止并删除所有容器
docker-compose down

# 删除数据卷（包含数据库数据）
docker volume rm aoa_monitor_mysql-data

# 清理未使用的卷和镜像
docker system prune -f

echo "数据库残留已清空" 