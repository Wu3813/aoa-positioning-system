#!/bin/bash

# 显示信息
echo "正在初始化数据库..."

# 确保MySQL容器正在运行
echo "检查MySQL容器状态..."
if ! docker ps | grep -q aoa-mysql; then
  echo "错误: MySQL容器未运行，请先启动服务"
  echo "运行命令: docker-compose up -d"
  exit 1
fi

# 等待MySQL完全启动
echo "等待MySQL完全启动..."
sleep 10

# 创建临时目录
mkdir -p ./tmp_sql

# 创建主SQL文件
cat > ./tmp_sql/init.sql << EOF
-- 创建数据库如果不存在
CREATE DATABASE IF NOT EXISTS aoa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE aoa;

-- 用户表
$(cat docs/mysql/user.sql)

-- 地图表
$(cat docs/mysql/map.sql)

-- 地图ID修改
$(cat docs/mysql/mapid.sql)
EOF

# 复制SQL文件到MySQL容器
echo "复制SQL文件到MySQL容器..."
docker cp ./tmp_sql/init.sql aoa-mysql:/tmp/init.sql

# 执行SQL文件
echo "执行SQL初始化脚本..."
docker exec -i aoa-mysql mysql -uroot -p123456 < ./tmp_sql/init.sql

# 检查结果
if [ $? -eq 0 ]; then
  echo "数据库初始化成功！"
  echo "默认管理员账户: admin / admin123"
else
  echo "数据库初始化失败，请检查错误信息"
fi

# 清理临时文件
rm -rf ./tmp_sql

echo "初始化完成" 