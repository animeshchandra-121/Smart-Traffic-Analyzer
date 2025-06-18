from .models import TrafficLog

def log_traffic_data(signal_id, vehicle_count, traffic_weight, green_time, efficiency_score, vehicle_type_counts):
    try:
        TrafficLog.objects.create(
            signal_id=signal_id,
            vehicle_count=vehicle_count,
            traffic_weight=traffic_weight,
            green_time=green_time,
            efficiency_score=efficiency_score,
            Car=vehicle_type_counts.get('car', 0),
            Truck=vehicle_type_counts.get('truck', 0),
            Motorcycle=vehicle_type_counts.get('motorcycle', 0),
            Bicycle=vehicle_type_counts.get('bicycle', 0),
            Bus=vehicle_type_counts.get('bus', 0),
        )
        print(f"Traffic data logged successfully for signal {signal_id}")
    except Exception as e:
        print(f"Error logging traffic data: {e}")
