#!/bin/bash

# 显示信息
echo "正在安装Maven..."

# 检测操作系统类型
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
elif type lsb_release >/dev/null 2>&1; then
    OS=$(lsb_release -si)
else
    OS=$(uname -s)
fi

# 根据不同操作系统安装Maven
case "$OS" in
    *Ubuntu*|*Debian*)
        echo "检测到Debian/Ubuntu系统，使用apt安装Maven..."
        sudo apt-get update
        sudo apt-get install -y maven
        ;;
    *CentOS*|*Red*|*Fedora*)
        echo "检测到CentOS/RHEL/Fedora系统，使用yum安装Maven..."
        sudo yum install -y maven
        ;;
    *SUSE*)
        echo "检测到SUSE系统，使用zypper安装Maven..."
        sudo zypper install -y maven
        ;;
    *)
        echo "无法自动检测操作系统，正在手动下载和安装Maven..."
        MAVEN_VERSION=3.8.6
        
        # 下载Maven二进制包
        wget https://archive.apache.org/dist/maven/maven-3/$MAVEN_VERSION/binaries/apache-maven-$MAVEN_VERSION-bin.tar.gz
        
        # 解压
        tar -xzf apache-maven-$MAVEN_VERSION-bin.tar.gz
        
        # 移动到/opt目录
        sudo mv apache-maven-$MAVEN_VERSION /opt/
        
        # 创建软链接
        sudo ln -s /opt/apache-maven-$MAVEN_VERSION/bin/mvn /usr/local/bin/mvn
        
        # 清理下载文件
        rm apache-maven-$MAVEN_VERSION-bin.tar.gz
        ;;
esac

# 验证安装
mvn -version

echo "Maven安装完成！"
echo "您现在可以执行 ./build-docker.sh 来构建项目。" 