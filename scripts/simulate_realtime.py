#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import requests
import time
import os
import threading
from colorama import init, Fore, Style

# 初始化 colorama 以支持彩色输出
init()

# 配置
JSON_FILES_DIR = "src/main/resources/data"  # JSON文件所在目录
API_ENDPOINT = "http://localhost:8080/api/realtime/paths/batch"  # 默认的批量接口
CHECK_ENDPOINT = "http://localhost:8080/api/realtime/devices"  # 检查服务器是否在线的接口
INTERVAL = 0.1  # 发送间隔(秒) - 更快的发送速度
BATCH_SIZE = 20  # 每次发送的数据条数 - 增加批次大小
COLORS = {
    "success": Fore.GREEN,
    "error": Fore.RED,
    "info": Fore.BLUE,
    "warn": Fore.YELLOW,
    "file": Fore.MAGENTA,
    "reset": Style.RESET_ALL
}

# 颜色输出
def cprint(text, color="reset"):
    print(f"{COLORS.get(color, Style.RESET_ALL)}{text}{Style.RESET_ALL}")

# 加载JSON文件
def load_json_data(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        cprint(f"加载文件 {file_path} 失败: {e}", "error")
        return []

# 检查服务器是否在线
def check_server():
    try:
        response = requests.get(CHECK_ENDPOINT, timeout=5)
        if response.status_code == 200:
            cprint(f"✅ 后端服务器在线，状态码: {response.status_code}", "success")
            return True
        else:
            cprint(f"❌ 后端服务器返回错误: {response.status_code}", "error")
            return False
    except requests.exceptions.RequestException as e:
        cprint(f"❌ 无法连接到后端服务器: {e}", "error")
        return False

# 发送数据批次
def send_batch(batch_data, thread_id=0):
    try:
        headers = {'Content-Type': 'application/json'}
        response = requests.post(API_ENDPOINT, json=batch_data, headers=headers, timeout=10)
        
        if response.status_code in [200, 202]:  # 200 OK 或 202 Accepted
            cprint(f"线程 {thread_id}: 成功发送 {len(batch_data)} 条数据，状态码: {response.status_code}", "success")
            return True
        else:
            cprint(f"线程 {thread_id}: 发送失败，状态码: {response.status_code}", "error")
            return False
    except Exception as e:
        cprint(f"线程 {thread_id}: 发送异常: {e}", "error")
        return False

# 显示发送进度
def display_progress(current, total, thread_id=0):
    percent = (current / total) * 100
    bar_length = 30
    filled_length = int(bar_length * current / total)
    bar = '=' * filled_length + '-' * (bar_length - filled_length)
    cprint(f"线程 {thread_id}: [{bar}] {percent:.1f}% ({current}/{total})", "info")

# 处理单个文件
def process_file(file_path, thread_id):
    file_name = os.path.basename(file_path)
    cprint(f"线程 {thread_id}: 开始处理文件 {file_name}", "file")
    
    # 加载数据
    data = load_json_data(file_path)
    if not data:
        return
    
    total_items = len(data)
    cprint(f"线程 {thread_id}: 文件 {file_name} 共 {total_items} 条数据", "info")
    
    # 分批处理数据
    processed = 0
    while processed < total_items:
        if not check_server():
            cprint(f"线程 {thread_id}: 服务器不可用，暂停 5 秒后重试...", "warn")
            time.sleep(5)
            continue
        
        batch_end = min(processed + BATCH_SIZE, total_items)
        batch = data[processed:batch_end]
        
        # 发送批次数据
        send_batch(batch, thread_id)
        
        # 更新进度
        processed = batch_end
        display_progress(processed, total_items, thread_id)
        
        # 延时
        time.sleep(INTERVAL)
    
    cprint(f"线程 {thread_id}: 文件 {file_name} 处理完成", "success")

# 主函数
def main():
    cprint("==== 轨迹数据模拟发送工具 ====", "info")
    cprint(f"发送间隔: {INTERVAL} 秒", "info")
    cprint(f"批次大小: {BATCH_SIZE} 条", "info")
    cprint("===========================", "info")
    
    # 检查服务器连接
    if not check_server():
        cprint("无法连接到后端服务器，请检查服务是否已启动", "error")
        return
    
    # 准备test.json文件路径
    test_file = os.path.join(JSON_FILES_DIR, "test.json")
    
    if not os.path.exists(test_file):
        cprint("文件 test.json 不存在", "error")
        return
    
    cprint(f"找到轨迹文件: test.json", "info")
    
    # 处理test.json文件
    process_file(test_file, 0)
    
    cprint("轨迹文件处理完毕", "success")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        cprint("\n用户中断，程序退出", "warn")
    except Exception as e:
        cprint(f"程序异常: {e}", "error")
    finally:
        cprint("模拟发送程序已结束", "info")