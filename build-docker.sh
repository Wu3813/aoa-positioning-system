#!/bin/bash

# 显示信息
echo "正在构建AOA监控系统Docker镜像..."

# 使用Maven容器编译后端
echo "步骤1: 使用Docker编译后端服务"
docker run --rm -v "$(pwd)":/app -w /app maven:3.8.4-openjdk-8 mvn clean package -DskipTests

# 检查后端编译是否成功
if [ $? -ne 0 ]; then
  echo "后端编译失败，请检查错误"
  exit 1
fi

# 前端使用Docker Compose直接构建，不在这里单独构建
echo "步骤2: 跳过前端单独构建，将在Docker Compose中构建"

# 构建Docker镜像
echo "步骤3: 构建Docker镜像"
docker-compose build

# 显示构建完成信息
echo "镜像构建完成！"
echo "您可以使用以下命令运行服务："
echo "docker-compose up -d" 