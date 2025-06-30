#!/bin/bash

# 配置参数
CONTAINER_NAME="aoa-mysql"
DB_NAME="aoa"
DB_USER="root"
DB_PASS="123456"
SQL_DIR="docs/mysql"

echo "=== AOA MySQL 数据库导入脚本 ==="

# 检查容器状态
echo "检查MySQL容器状态..."
if ! docker ps --filter "name=^/${CONTAINER_NAME}$" --filter "status=running" -q | grep -q .; then
    echo "❌ 容器 '$CONTAINER_NAME' 未运行"
    echo "请先启动容器: docker-compose up -d mysql"
    exit 1
fi
echo "✅ 容器 '$CONTAINER_NAME' 正在运行"

# 检查SQL目录
if [ ! -d "$SQL_DIR" ]; then
    echo "❌ SQL目录 '$SQL_DIR' 不存在"
    exit 1
fi

# 按依赖顺序导入SQL文件
sql_files=(
    "user.sql"           # 用户表 - 无依赖
    "combined_map.sql"   # 地图表 - 无依赖，其他表依赖此表
    "station.sql"        # 基站表 - 依赖map表
    "engine.sql"         # 引擎表 - 依赖map表
    "tag.sql"           # 标签表 - 依赖map表
    "geofence.sql"      # 围栏表 - 依赖map表
    "alarm.sql"         # 告警表 - 依赖map表和tag表
    "task_config.sql"   # 任务配置表 - 无依赖
    "trajectory.sql"    # 轨迹表 - 依赖tag表
)

echo "开始导入SQL文件..."
success_count=0
error_count=0

for sql_file in "${sql_files[@]}"; do
    file_path="$SQL_DIR/$sql_file"
    
    if [ ! -f "$file_path" ]; then
        echo "⚠️  文件不存在: $sql_file (跳过)"
        continue
    fi
    
    echo "📄 导入: $sql_file"
    
    if docker exec -i "$CONTAINER_NAME" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$file_path" 2>/dev/null; then
        echo "✅ 成功: $sql_file"
        ((success_count++))
    else
        echo "❌ 失败: $sql_file"
        ((error_count++))
    fi
done

echo "===================="
echo "导入完成: 成功 $success_count 个，失败 $error_count 个"

if [ $error_count -eq 0 ]; then
    echo "🎉 所有SQL文件导入成功！"
    exit 0
else
    echo "⚠️  部分文件导入失败，请检查错误信息"
    exit 1
fi 