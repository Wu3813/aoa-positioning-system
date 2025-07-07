From maven:3-amazoncorretto-8 AS builder

WORKDIR /app

COPY ./pom.xml /app/
COPY ./src /app/src

RUN mvn clean package -DskipTests

FROM amazoncorretto:8-alpine-jre

WORKDIR /app

# 安装依赖
RUN apk add --no-cache tzdata

# 添加JAR文件
COPY --from=builder /app/target/AOA_monitor-1.0-SNAPSHOT.jar app.jar

# 创建上传目录
RUN mkdir -p /app/uploads/maps

# 暴露端口
EXPOSE 8080

# 启动命令（修正了主类路径）
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/urandom", "-jar", "/app/app.jar", "--spring.profiles.active=prod", "--spring.main.allow-bean-definition-overriding=true", "--spring.main.allow-circular-references=true"]
