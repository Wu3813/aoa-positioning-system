FROM node:18-alpine AS build

WORKDIR /app

# 复制配置文件
COPY package*.json ./

# 设置npm镜像源为淘宝镜像，解决网络超时问题
RUN npm config set registry https://registry.npmmirror.com/

# 安装依赖
RUN npm install
# 确保axios和其他必要依赖已安装
RUN npm install axios@1.8.4 mitt@3.0.1 --save

# 复制源代码
COPY . .

# 确保vite有执行权限
RUN chmod +x ./node_modules/.bin/vite

# 构建前端
RUN npm run build

# 生产环境
FROM nginx:stable-alpine

# 复制前端构建产物
COPY --from=build /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 
