FROM node:18-alpine AS build

WORKDIR /app

# 复制配置文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

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