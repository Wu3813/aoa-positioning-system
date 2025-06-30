#!/bin/bash

# OpenWrt MariaDB容器 SQL导入脚本

CONTAINER_NAME="aoa-mysql"
DB_NAME="aoa"
DB_USER="root"
DB_PASS="123456"
SQL_DIR="docs/mysql"

echo "=== OpenWrt MariaDB 容器导入脚本 ==="

# 检查容器
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ 容器 $CONTAINER_NAME 未运行"
    exit 1
fi
echo "✅ 容器运行中"

# 创建数据库
docker exec $CONTAINER_NAME mariadb -u$DB_USER -p$DB_PASS -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null

# 导入SQL文件
echo "开始导入..."

echo "📄 user.sql"
docker exec -i $CONTAINER_NAME mariadb -u$DB_USER -p$DB_PASS $DB_NAME < "$SQL_DIR/user.sql" 2>/dev/null
echo "✅ 完成"

echo "📄 combined_map.sql"
docker exec -i $CONTAINER_NAME mariadb -u$DB_USER -p$DB_PASS $DB_NAME < "$SQL_DIR/combined_map.sql" 2>/dev/null
echo "✅ 完成"

echo "📄 station.sql"
docker exec -i $CONTAINER_NAME mariadb -u$DB_USER -p$DB_PASS $DB_NAME < "$SQL_DIR/station.sql" 2>/dev/null
echo "✅ 完成"

echo "📄 engine.sql"
docker exec -i $CONTAINER_NAME mariadb -u$DB_USER -p$DB_PASS $DB_NAME < "$SQL_DIR/engine.sql" 2>/dev/null
echo "✅ 完成"

echo "📄 tag.sql"
docker exec -i $CONTAINER_NAME mariadb -u$DB_USER -p$DB_PASS $DB_NAME < "$SQL_DIR/tag.sql" 2>/dev/null
echo "✅ 完成"

echo "📄 geofence.sql"
docker exec -i $CONTAINER_NAME mariadb -u$DB_USER -p$DB_PASS $DB_NAME < "$SQL_DIR/geofence.sql" 2>/dev/null
echo "✅ 完成"

echo "📄 alarm.sql"
docker exec -i $CONTAINER_NAME mariadb -u$DB_USER -p$DB_PASS $DB_NAME < "$SQL_DIR/alarm.sql" 2>/dev/null
echo "✅ 完成"

echo "📄 task_config.sql"
docker exec -i $CONTAINER_NAME mariadb -u$DB_USER -p$DB_PASS $DB_NAME < "$SQL_DIR/task_config.sql" 2>/dev/null
echo "✅ 完成"

echo "📄 trajectory.sql"
docker exec -i $CONTAINER_NAME mariadb -u$DB_USER -p$DB_PASS $DB_NAME < "$SQL_DIR/trajectory.sql" 2>/dev/null
echo "✅ 完成"

echo "🎉 导入完成"
docker exec $CONTAINER_NAME mariadb -u$DB_USER -p$DB_PASS $DB_NAME -e "SHOW TABLES;" 2>/dev/null 