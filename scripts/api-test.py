import requests
import time
import random
from datetime import datetime

API_SERVER = "http://192.168.8.131:8080"
API_URL = API_SERVER + "/api/realtime/paths/batch"

# 初始坐标
x = 0.0
y = 0.0
mac_address = "84FD27EEE605"
delta = 0.1  # 每次最大移动量

while True:
    # 生成当前时间戳
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # 构造数据
    data = [{
        "mac": mac_address,
        "x": round(x, 6),  # 保留6位小数
        "y": round(y, 6),
        "timestamp": current_time
    }]

    # 发送请求
    try:
        response = requests.post(
            API_URL,
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"发送成功，状态码：{response.status_code}")
    except Exception as e:
        print(f"发送失败：{str(e)}")

    # 生成随机位移（-delta到+delta之间）
    x += random.uniform(-delta, delta)
    y += random.uniform(-delta, delta)
    
    # 等待1秒
    time.sleep(1)
 