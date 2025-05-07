@echo off
chcp 65001
echo 开始优化node_modules...

REM 进入前端目录
cd front

REM 清理缓存
echo 清理npm缓存...
call npm cache clean --force

REM 删除旧的node_modules
echo 删除旧的node_modules目录...
if exist node_modules rmdir /s /q node_modules

REM 使用clean-install重新安装依赖
echo 使用优化方式重新安装依赖...
call npm install --production=false

REM 删除.vite缓存
echo 删除.vite缓存目录...
if exist node_modules\.vite rmdir /s /q node_modules\.vite

REM 删除开发工具插件
echo 删除未使用的Vue开发工具...
if exist node_modules\vite-plugin-vue-devtools rmdir /s /q node_modules\vite-plugin-vue-devtools

echo 优化完成！node_modules大小已减小。
pause 