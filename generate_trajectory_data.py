#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
轨迹数据生成脚本
生成符合系统要求的测试轨迹数据
"""

import json
import random
import time
from datetime import datetime, timedelta

def generate_random_mac():
    """生成随机MAC地址"""
    mac = []
    for i in range(6):
        mac.append("%02X" % random.randint(0, 255))
    return "".join(mac)

def generate_trajectory_data(
    num_points=1000,
    time_interval_minutes=1,  # 时间间隔分钟
    x_range=(-2.0, 2.0),   # X坐标范围
    y_range=(-2.0, 2.0),   # Y坐标范围
    rssi_range=(-90, -50), # RSSI范围
    battery_range=(70, 100), # 电量范围
    map_id=1
):
    """
    生成轨迹数据
    
    Args:
        num_points: 生成的数据点数量
        time_interval_minutes: 数据点之间的时间间隔（分钟）
        x_range: X坐标范围 (min, max)
        y_range: Y坐标范围 (min, max)
        rssi_range: RSSI值范围 (min, max)
        battery_range: 电量范围 (min, max)
        map_id: 地图ID（固定为1）
    
    Returns:
        list: 轨迹数据列表
    """
    
    # 生成统一的MAC地址
    tag_mac = generate_random_mac()
    
    # 起始时间戳（当前时间）
    base_timestamp = time.time()
    
    trajectory_data = []
    
    # 生成模拟移动路径的起始位置
    current_x = random.uniform(x_range[0], x_range[1])
    current_y = random.uniform(y_range[0], y_range[1])
    
    print(f"生成轨迹数据...")
    print(f"MAC地址: {tag_mac}")
    print(f"数据点数量: {num_points}")
    print(f"时间间隔: {time_interval_minutes}分钟")
    print(f"坐标范围: X{x_range}, Y{y_range}")
    
    for i in range(num_points):
        # 递增时间戳（以分钟为单位）
        timestamp = base_timestamp + (i * time_interval_minutes * 60.0)  # 转换为秒
        
        # 生成相对平滑的移动轨迹
        # 每次移动的步长相对较小，模拟真实移动
        step_size = 0.1
        direction_x = random.uniform(-step_size, step_size)
        direction_y = random.uniform(-step_size, step_size)
        
        current_x += direction_x
        current_y += direction_y
        
        # 确保坐标在范围内
        current_x = max(x_range[0], min(x_range[1], current_x))
        current_y = max(y_range[0], min(y_range[1], current_y))
        
        # 生成数据点
        data_point = {
            "tag_mac": tag_mac,
            "timestamp": f"{timestamp:.6f}",
            "x": round(current_x, 15),  # 保持高精度
            "y": round(current_y, 15),
            "rssi": random.randint(rssi_range[0], rssi_range[1]),
            "battery": random.randint(battery_range[0], battery_range[1]),
            "map_id": map_id
        }
        
        trajectory_data.append(data_point)
        
        # 显示进度
        if (i + 1) % 100 == 0:
            print(f"已生成 {i + 1}/{num_points} 个数据点")
    
    return trajectory_data

def save_trajectory_data(trajectory_data, filename):
    """保存轨迹数据到JSON文件"""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(trajectory_data, f, indent=2, ensure_ascii=False)
        print(f"数据已保存到: {filename}")
        return True
    except Exception as e:
        print(f"保存文件失败: {e}")
        return False

def main():
    """主函数"""
    print("=== 轨迹数据生成器 ===")
    
    # 配置参数
    config = {
        "num_points": 100,         # 数据点数量（减少数量因为间隔变长）
        "time_interval_minutes": 1, # 时间间隔（分钟）
        "x_range": (-3.0, 3.0),    # X坐标范围
        "y_range": (-3.0, 3.0),    # Y坐标范围
        "rssi_range": (-90, -50),  # RSSI范围
        "battery_range": (70, 100), # 电量范围
        "map_id": 1                # 地图ID（固定）
    }
    
    # 生成数据
    trajectory_data = generate_trajectory_data(**config)
    
    # 保存到文件
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"src/main/resources/data/generated_trajectory_{timestamp_str}.json"
    
    if save_trajectory_data(trajectory_data, filename):
        print(f"\n生成完成!")
        print(f"文件位置: {filename}")
        print(f"数据统计:")
        print(f"  - MAC地址: {trajectory_data[0]['tag_mac']}")
        print(f"  - 数据点数: {len(trajectory_data)}")
        print(f"  - 时间跨度: {float(trajectory_data[-1]['timestamp']) - float(trajectory_data[0]['timestamp']):.1f}秒 ({(float(trajectory_data[-1]['timestamp']) - float(trajectory_data[0]['timestamp'])) / 60:.1f}分钟)")
        print(f"  - 起始时间: {datetime.fromtimestamp(float(trajectory_data[0]['timestamp'])).strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  - 结束时间: {datetime.fromtimestamp(float(trajectory_data[-1]['timestamp'])).strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 显示前几个数据点作为示例
        print(f"\n前3个数据点示例:")
        for i, point in enumerate(trajectory_data[:3]):
            print(f"  {i+1}. MAC:{point['tag_mac']}, 时间:{point['timestamp']}, 坐标:({point['x']:.3f}, {point['y']:.3f}), RSSI:{point['rssi']}, 电量:{point['battery']}%")

if __name__ == "__main__":
    main()
