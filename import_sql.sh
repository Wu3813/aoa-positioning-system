#!/bin/bash

# --- 配置 --- 
CONTAINER_NAME="aoa-mysql"
DB_NAME="aoa"
DB_USER="root"
DB_PASS="123456"
SQL_DIR="docs/mysql" # SQL文件所在的目录 (相对于脚本执行位置)

# --- 检查MySQL容器是否在运行 ---
echo "Checking if container '$CONTAINER_NAME' is running..."
if ! docker ps --filter "name=^/${CONTAINER_NAME}$" --filter "status=running" --format "{{.ID}}" | grep -q .; then
    echo "Error: Container '$CONTAINER_NAME' is not running."
    echo "Please start the container using 'docker-compose up -d mysql' or 'docker-compose up -d'."
    exit 1
fi
echo "Container '$CONTAINER_NAME' is running."

# --- 检查SQL目录是否存在 ---
if [ ! -d "$SQL_DIR" ]; then
    echo "Error: SQL directory '$SQL_DIR' not found."
    echo "Please make sure the script is run from the project root or adjust the SQL_DIR path."
    exit 1
fi

# --- 遍历并导入SQL文件 ---
echo "Starting SQL import into container '$CONTAINER_NAME', database '$DB_NAME'..."

# 定义导入顺序（可选，如果表之间有依赖关系）
# 如果没有严格的依赖，可以省略这个数组，直接用 for sql_file in "$SQL_DIR"/*.sql
# 注意：combined_map.sql 应该先执行，因为它创建了 map 表，而其他表可能依赖它。
# user.sql 通常没有依赖，可以先执行。
# station, engine, tag 依赖 map 表。
import_order=(
  "user.sql"
  "combined_map.sql"
  "station.sql"
  "engine.sql"
  "tag.sql"
)

import_successful=true

for filename in "${import_order[@]}"; do
    sql_file="$SQL_DIR/$filename"
    if [ -f "$sql_file" ]; then # 检查文件是否存在
        echo "-----------------------------------------"
        echo "Importing '$sql_file'..."
        # 使用 docker exec 将 SQL 文件内容导入 mysql 客户端
        if docker exec -i "$CONTAINER_NAME" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$sql_file"; then
            echo "Successfully imported '$sql_file'."
        else
            echo "Error importing '$sql_file'. Please check the SQL syntax and container logs."
            import_successful=false
            # 可以选择在这里退出脚本: exit 1
        fi
    else
        echo "Warning: SQL file '$sql_file' not found in '$SQL_DIR'. Skipping."
    fi
done

echo "-----------------------------------------"
if $import_successful; then
    echo "SQL import process finished successfully."
else
    echo "SQL import process finished with errors."
fi 