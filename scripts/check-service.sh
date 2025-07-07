#!/bin/bash

# 显示信息
echo "正在检查AOA监控系统服务状态..."

# 检查Docker是否运行
docker info > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "错误: Docker未运行，请先启动Docker"
  exit 1
fi

# 检查服务状态
echo "检查容器状态:"
docker-compose ps

# 检查后端健康状态
echo "检查后端健康状态:"
curl -s http://localhost:8080/api/health

# 检查前端访问
echo "检查前端访问状态:"
curl -I -s http://localhost:80/ | head -n 1

# 检查地图目录
echo "检查上传目录状态:"
if [ -d "./uploads/maps" ]; then
  echo "✓ 上传目录存在"
  ls -la ./uploads/maps
else
  echo "✗ 警告: 上传目录不存在，创建目录"
  mkdir -p ./uploads/maps
  chmod -R 777 ./uploads
fi

# 显示服务日志摘要
echo "后端服务日志摘要:"
docker logs --tail 20 aoa-backend

echo "前端服务日志摘要:"
docker logs --tail 10 aoa-frontend

echo "=========================================="
echo "检查完成！"
echo "如果出现连接问题，尝试重启服务:"
echo "docker-compose restart"
echo "==========================================" 