FROM openjdk:8-jdk-alpine

LABEL maintainer="support@aoa-monitor.com"

WORKDIR /app

# 安装依赖
RUN apk add --no-cache tzdata

# 设置时区为亚洲/上海
ENV TZ=Asia/Shanghai

# 添加JAR文件
COPY target/AOA_monitor-1.0-SNAPSHOT.jar app.jar

# 创建上传目录
RUN mkdir -p /app/uploads/maps

# 暴露端口
EXPOSE 8080

# 启动命令
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/app/app.jar", "--spring.profiles.active=prod"] 