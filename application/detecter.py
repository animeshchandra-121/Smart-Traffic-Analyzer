import torch
import numpy as np
import cv2

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

class EnhancedVehicleDetector:
    def __init__(self):
        self.model = None
        self.vehicle_classes = ['car', 'truck', 'bus', 'motorcycle', 'bicycle']
        self.vehicle_weights = {
            'car': 1.0,
            'truck': 2.5,
            'bus': 2.0,
            'motorcycle': 0.5,
            'bicycle': 0.3
        }
        self.coco_vehicle_classes = {
            2: 'car',
            3: 'motorcycle',
            5: 'bus',
            7: 'truck',
            1: 'bicycle'
        }
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Using device: {self.device}")
        self.load_yolo_model()

    def load_yolo_model(self):
        if YOLO_AVAILABLE:
            try:
                self.model = YOLO("yolov8n.pt")
                self.model.to(self.device)
                print("✅ YOLOv8 model loaded successfully")
                return True
            except Exception as e:
                print(f"Error loading YOLOv8 model: {e}")
        else:
            print("YOLOv8 not available. Using simulated detection.")
        return False

    def point_in_polygon(self, point, polygon):
        x, y = point
        n = len(polygon)
        inside = False
        p1x, p1y = polygon[0]
        for i in range(1, n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    def simulate_detection(self, frame, mask):
        vehicle_type_counts = {key: 0 for key in self.vehicle_classes}
        processed_frame = frame.copy()
        height, width = frame.shape[:2]
        num_vehicles = np.random.randint(1, 12)
        total_weight = 0

        for _ in range(num_vehicles):
            x = np.random.randint(0, width - 100)
            y = np.random.randint(0, height - 60)
            w = np.random.randint(80, 120)
            h = np.random.randint(40, 80)
            class_name = np.random.choice(self.vehicle_classes)
            confidence = np.random.uniform(0.5, 0.95)
            vehicle_type_counts[class_name] += 1
            total_weight += self.vehicle_weights.get(class_name, 1.0)
            color = {
                'car': (0, 255, 0),
                'truck': (255, 0, 0),
                'bus': (255, 165, 0),
                'motorcycle': (0, 255, 255),
                'bicycle': (255, 0, 255)
            }.get(class_name, (0, 255, 0))
            cv2.rectangle(processed_frame, (x, y), (x + w, y + h), color, 2)
            label = f"{class_name}: {confidence:.2f}"
            cv2.putText(processed_frame, label, (x, y - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        return num_vehicles, total_weight, processed_frame, vehicle_type_counts

    def detect_vehicles_in_area(self, frame, area_points, draw_area=True):
        if frame is None:
            return 0, 0, None, {key: 0 for key in self.vehicle_classes}

        try:
            mask = np.zeros(frame.shape[:2], dtype=np.uint8)
            area_points_np = np.array(area_points, dtype=np.int32)
            cv2.fillPoly(mask, [area_points_np], 255)
            processed_frame = frame.copy()

            if draw_area:
                cv2.polylines(processed_frame, [area_points_np], True, (0, 255, 255), 3)
                cv2.putText(processed_frame, "Detection Area",
                            (area_points_np[0][0], area_points_np[0][1] - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

            vehicle_counts = {key: 0 for key in self.vehicle_classes}

            if self.model is not None:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = self.model(frame_rgb, conf=0.25, iou=0.45,
                                     max_det=50, classes=[1, 2, 3, 5, 7], verbose=False)

                vehicle_count = 0
                traffic_weight = 0
                detected_centers = []

                for result in results:
                    boxes = result.boxes
                    if boxes is not None:
                        for box in boxes:
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                            x, y = int((x1 + x2) / 2), int((y1 + y2) / 2)
                            if self.point_in_polygon((x, y), area_points):
                                if any(abs(x - cx) < 30 and abs(y - cy) < 30 for cx, cy in detected_centers):
                                    continue
                                detected_centers.append((x, y))
                                class_id = int(box.cls[0].cpu().numpy())
                                confidence = float(box.conf[0].cpu().numpy())
                                if class_id in self.coco_vehicle_classes:
                                    class_name = self.coco_vehicle_classes[class_id]
                                    vehicle_count += 1
                                    traffic_weight += self.vehicle_weights.get(class_name, 1.0)
                                    vehicle_counts[class_name] += 1
                                    color = {
                                        'car': (0, 255, 0),
                                        'truck': (255, 0, 0),
                                        'bus': (255, 165, 0),
                                        'motorcycle': (0, 255, 255),
                                        'bicycle': (255, 0, 255)
                                    }.get(class_name, (0, 255, 0))
                                    cv2.rectangle(processed_frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                                    label = f"{class_name}: {confidence:.2f}"
                                    (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
                                    cv2.rectangle(processed_frame, (int(x1), int(y1 - 20)),
                                                  (int(x1 + label_w), int(y1)), color, -1)
                                    cv2.putText(processed_frame, label, (int(x1), int(y1 - 5)),
                                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

                cv2.rectangle(processed_frame, (10, 10), (150, 35), (0, 0, 0), -1)
                cv2.putText(processed_frame, f"Vehicles: {vehicle_count}", (15, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                cv2.rectangle(processed_frame, (10, 40), (200, 65), (0, 0, 0), -1)
                cv2.putText(processed_frame, f"Traffic Weight: {traffic_weight:.1f}", (15, 60),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

                return vehicle_count, traffic_weight, processed_frame, vehicle_counts

            return self.simulate_detection(frame, mask)

        except Exception as e:
            print(f"Error in vehicle detection: {e}")
            return 0, 0, frame, {key: 0 for key in self.vehicle_classes}