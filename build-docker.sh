#!/bin/bash

# 显示信息
echo "正在构建AOA监控系统Docker镜像..."

# 编译后端
echo "步骤1: 编译后端服务"
mvn clean package -DskipTests

# 检查后端编译是否成功
if [ $? -ne 0 ]; then
  echo "后端编译失败，请检查错误"
  exit 1
fi

# 编译前端
echo "步骤2: 编译前端服务"
cd front
npm install
npm run build
cd ..

# 检查前端编译是否成功
if [ $? -ne 0 ]; then
  echo "前端编译失败，请检查错误"
  exit 1
fi

# 构建Docker镜像
echo "步骤3: 构建Docker镜像"
docker-compose build

# 显示构建完成信息
echo "镜像构建完成！"
echo "您可以使用以下命令运行服务："
echo "docker-compose up -d" 