#!/bin/bash

# 显示信息
echo "正在启动AOA监控系统..."

# 检查Docker是否运行
docker info > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "错误: Docker未运行，请先启动Docker"
  exit 1
fi

# 启动服务
echo "正在启动所有服务..."
docker-compose up -d

# 检查服务是否成功启动
if [ $? -ne 0 ]; then
  echo "服务启动失败，请检查错误"
  exit 1
fi

# 等待服务就绪
echo "等待服务就绪..."
sleep 10

# 检查服务状态
echo "检查服务状态:"
docker-compose ps

# 显示成功信息
echo "=========================================="
echo "服务启动成功！"
echo "- 前端: http://localhost"
echo "- 后端API: http://localhost:8080"
echo "=========================================="
echo "使用以下命令可以查看日志:"
echo "docker-compose logs -f"
echo "使用以下命令可以停止服务:"
echo "docker-compose down" 