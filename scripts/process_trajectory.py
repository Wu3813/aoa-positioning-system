import json
import random

def process_trajectory_data(input_file, output_file):
    """
    处理轨迹数据：
    1. 移除所有stdev字段和z字段
    2. 添加rssi值（-50至-80之间的随机值）
    3. 添加电量信息（80-100波动）
    4. 添加地图id（固定为1）
    """
    
    # 读取原始数据
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    processed_data = []
    
    for item in data:
        # 创建新的数据项，只保留需要的字段
        new_item = {
            "tag_mac": item["tag_mac"],
            "timestamp": item["timestamp"],
            "x": item["x"],
            "y": item["y"],
            "rssi": random.randint(-80, -50),  # -50至-80之间的随机值
            "battery": random.randint(80, 100),  # 80-100之间的电量
            "map_id": 1  # 固定为1
        }
        
        processed_data.append(new_item)
    
    # 保存处理后的数据
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(processed_data, f, ensure_ascii=False, indent=2)
    
    print(f"处理完成！")
    print(f"原始数据条数: {len(data)}")
    print(f"处理后数据条数: {len(processed_data)}")
    print(f"输出文件: {output_file}")

if __name__ == "__main__":
    input_file = "src/main/resources/data/trajectory.json"
    output_file = "src/main/resources/data/trajectory_processed.json"
    
    process_trajectory_data(input_file, output_file) 