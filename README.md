# AOA监控系统Docker部署指南

## 系统环境需求

- Docker >= 20.10.x
- Docker Compose >= 2.x
- Linux 系统 (推荐CentOS 7+/Ubuntu 18.04+)
- 至少2GB内存
- 至少10GB磁盘空间

## 部署步骤

### 1. 安装Docker和Docker Compose

如果您的服务器尚未安装Docker和Docker Compose，请按照以下步骤安装：

- CentOS: https://docs.docker.com/engine/install/centos/

- Ubuntu: https://docs.docker.com/engine/install/ubuntu/

### 3. 构建镜像

```bash
docker compose build
```

### 4. 启动服务

```bash
docker compose up -d
```

## 服务访问

部署成功后，服务将在以下地址可用：

- 前端界面: http://您的服务器IP:8081

## 管理服务

```bash
# 查看所有容器状态
docker compose ps

# 查看服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql
docker compose logs -f redis

# 停止所有服务
docker-compose down

# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
docker-compose restart frontend
```

## 数据持久化

以下数据将被持久化：

- MySQL数据 - 存储在目录 `./data/mysql` 目录
- 上传的地图文件 - 存储在目录 `./data/uploads` 目录

## 性能优化

对于生产环境，推荐在Linux系统中添加以下配置以提高系统性能：

```bash
# 编辑系统限制配置
sudo nano /etc/security/limits.conf

# 添加以下内容
*           soft    nofile          65535
*           hard    nofile          65535
```
