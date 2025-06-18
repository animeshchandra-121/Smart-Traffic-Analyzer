# Traffic Management System

A Django-based smart traffic management system that leverages computer vision (YOLOv8) to analyze traffic videos, adapt signal timings, and provide real-time traffic insights for urban intersections.

## Features

- **Video Upload & Processing:** Upload intersection videos for each signal (A, B, C, D). The system detects and counts vehicles using YOLOv8, calculates traffic weights, and processes videos for browser playback.
- **Adaptive Signal Timing:** Dynamically adjusts green light durations based on real-time vehicle counts, traffic weights, and time-of-day patterns.
- **Area Configuration:** Define and save polygonal detection areas for each signal via API.
- **Traffic Logging:** Stores raw and processed videos, vehicle counts, traffic weights, and efficiency scores in the database.
- **REST API:** Exposes endpoints for video upload, area management, statistics retrieval, and adaptive timing.
- **User Authentication:** Includes a `user_login` app for user management and authentication (token-based).
- **Media Management:** Handles storage of uploaded and processed videos.
- **Admin Interface:** Manage junctions, logs, and users via Django admin.

## Directory Structure

```
traffic_management/
│
├── application/                # Core app: video processing, detection, adaptive logic
│   ├── detecter.py             # YOLOv8-based vehicle detection
│   ├── EnhancedTrafficSignal.py# Adaptive signal timing logic
│   ├── models.py               # TrafficLog, JunctionSignals models
│   ├── views.py                # API endpoints for upload, stats, area config
│   ├── serializers.py          # DRF serializers
│   ├── urls.py                 # App-specific routes
│   ├── areas.json              # Stores polygonal detection areas
│   └── config.json             # (Optional) App configuration
│
├── user_login/                 # User authentication app
│   ├── models.py, views.py, etc.
│
├── traffic_management/         # Django project settings
│   ├── settings.py, urls.py, wsgi.py, asgi.py
│
├── templates/
│   └── index.html              # Main HTML template (if using server-side rendering)
│
├── media/
│   ├── videos/                 # Uploaded raw videos
│   └── processed_videos/       # Processed, annotated videos
│
├── yolov8n.pt                  # YOLOv8 model weights
├── db.sqlite3                  # SQLite database
└── manage.py                   # Django management script
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- pip
- [ffmpeg](https://ffmpeg.org/) (for video conversion)
- (Optional) CUDA-enabled GPU for faster YOLO inference

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd traffic_management
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install django djangorestframework opencv-python torch ultralytics numpy
   pip install djangorestframework-simplejwt django-cors-headers
   ```

4. **Download YOLOv8 weights:**
   - Place `yolov8n.pt` in the project root (already present).

5. **Apply migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Create a superuser (optional, for admin):**
   ```bash
   python manage.py createsuperuser
   ```

7. **Run the development server:**
   ```bash
   python manage.py runserver
   ```

## API Overview

- **POST `/application/trafficlog/`**  
  Upload videos for signals, process, and get traffic stats.
- **POST `/application/save_area/`**  
  Save polygonal area for a signal.
- **GET `/application/save_area/?signal_id=A`**  
  Retrieve area for a signal.
- **GET `/application/latest_stats/`**  
  Get latest traffic statistics.
- **POST `/application/adaptive_green_time/`**  
  Get adaptive green time for a signal.

(See `application/views.py` for full API details.)

## Notes

- **FFmpeg Path:** Update the `ffmpeg_path` in `views.py` to your local ffmpeg binary if needed.
- **Media Files:** Uploaded and processed videos are stored in `media/videos/` and `media/processed_videos/`.
- **Detection Areas:** Areas for each signal are stored in `application/areas.json`.
- **Model Weights:** The project uses YOLOv8 (`yolov8n.pt`). You can swap for a different YOLOv8 variant if desired.

## License

MIT License (or specify your own). 
