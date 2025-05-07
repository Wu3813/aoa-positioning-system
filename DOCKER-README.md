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

#### CentOS:

```bash
# 安装Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.6/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Ubuntu:

```bash
# 安装Docker
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.6/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 克隆代码并准备环境

```bash
# 克隆代码
git clone https://your-repository/AOA_monitor.git
cd AOA_monitor

# 赋予脚本执行权限
chmod +x build-docker.sh
chmod +x start-service.sh
```

### 3. 构建镜像

```bash
./build-docker.sh
```

### 4. 启动服务

```bash
./start-service.sh
```

## 服务访问

部署成功后，服务将在以下地址可用：

- 前端界面: http://您的服务器IP
- 后端API: http://您的服务器IP:8080

## 管理服务

```bash
# 查看所有容器状态
docker-compose ps

# 查看服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
docker-compose logs -f redis

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

- MySQL数据 - 存储在Docker卷 `mysql-data` 中
- 上传的地图文件 - 存储在宿主机的 `./uploads` 目录

## 性能优化

对于生产环境，推荐在Linux系统中添加以下配置以提高系统性能：

```bash
# 编辑系统限制配置
sudo nano /etc/security/limits.conf

# 添加以下内容
*           soft    nofile          65535
*           hard    nofile          65535
```

## 常见问题

1. **问题**: MySQL容器无法启动
   **解决方案**: 检查是否有其他MySQL实例占用3306端口，可以修改`docker-compose.yml`中的端口映射

2. **问题**: 前端无法连接后端API
   **解决方案**: 检查nginx配置文件中的代理设置，确保路径正确

3. **问题**: 服务器内存不足
   **解决方案**: 调整`docker-compose.yml`中服务的内存限制，或增加服务器内存

4. **问题**: 数据库连接失败
   **解决方案**: 检查环境变量和数据库配置，确保用户名密码正确，等待MySQL服务完全启动

