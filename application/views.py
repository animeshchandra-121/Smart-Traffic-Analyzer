from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.files.base import File
from django.utils.timezone import now
from .models import TrafficLog, JunctionSignals
from .detecter import EnhancedVehicleDetector
from django.conf import settings
import cv2
import os
import tempfile
import json
import subprocess
from datetime import datetime, timedelta
from rest_framework import status
from .EnhancedTrafficSignal import EnhancedTrafficSignal
from rest_framework.parsers import JSONParser
from rest_framework.decorators import api_view

@api_view(['POST', 'GET'])
def save_area(request):
    if request.method == 'POST':
        signal_id = request.data.get('signal_id')
        area = request.data.get('area')

        if not signal_id or not area or len(area) != 4:
            return Response({'error': 'signal_id and 4-point area required'}, status=400)

        # Path to the areas.json file
        areas_file = os.path.join(os.path.dirname(__file__), 'areas.json')

        # Load existing areas
        if os.path.exists(areas_file):
            with open(areas_file, 'r') as f:
                areas_data = json.load(f)
        else:
            areas_data = {}

        # Save or update area for this signal
        areas_data[signal_id.upper()] = area

        # Write back to file
        with open(areas_file, 'w') as f:
            json.dump(areas_data, f, indent=4)

        return Response({'message': f'Area for signal {signal_id} saved successfully'})
    
    elif request.method == 'GET':
        signal_id = request.query_params.get('signal_id')
        if not signal_id:
            return Response({'error': 'signal_id is required'}, status=400)

        # Path to the areas.json file
        areas_file = os.path.join(os.path.dirname(__file__), 'areas.json')

        # Load existing areas
        if os.path.exists(areas_file):
            with open(areas_file, 'r') as f:
                areas_data = json.load(f)
                area = areas_data.get(signal_id.upper())
                if area:
                    return Response({'signal_id': signal_id.upper(), 'area': area})
                else:
                    return Response({'error': f'No area found for signal {signal_id}'}, status=404)
        else:
            return Response({'error': 'No areas have been defined yet'}, status=404)

areas_path = os.path.join(os.path.dirname(__file__), 'areas.json')
with open(areas_path, 'r') as f:
    AREA_POLYGONS = json.load(f)

# Initialize YOLO detector
detecter = EnhancedVehicleDetector()

def letter_to_number(signal_id):
    """Convert signal letter (A,B,C,D) to number (1,2,3,4)"""
    if isinstance(signal_id, int):
        return signal_id
    return ord(signal_id.upper()) - ord('A') + 1

def number_to_letter(number):
    """Convert signal number (1,2,3,4) to letter (A,B,C,D)"""
    return chr(ord('A') + number - 1)

# def index(request):
#     return render(request, 'index.html')

@method_decorator(csrf_exempt, name='dispatch')
class TrafficLogView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    authentication_classes = []  # Disable authentication for this view
    permission_classes = []      # Disable permission checks for this view

    def post(self, request):
        print("[DEBUG] Received request data:", request.data)
        print("[DEBUG] Received files:", request.FILES)
        
        video_files = request.FILES.getlist('video')       
        signal_ids = request.data.getlist('signal_id') # Will be A, B, C, or D
        junction_id = request.data.get('junction_id')
        
        if not video_files:
            print("[ERROR] No video file found in request")
            print("[DEBUG] Available files:", list(request.FILES.keys()))
            return Response({'error': 'No video file uploaded'}, status=400)    
        if not signal_ids:   
            print("[ERROR] No signal_id found in request")
            print("[DEBUG] Available data:", request.data)
            return Response({'error': 'Signal ID is required'}, status=400)
        if not junction_id:
            return Response({'error': 'junction_id is required'}, status=400)

        if len(video_files) != len(signal_ids):
            return Response({
                'error': f'Number of videos ({len(video_files)}) does not match number of signal IDs ({len(signal_ids)})'
            }, status=400)

        print(f"[INFO] Processing videos for signals {signal_ids} at junction {junction_id}")
        
         # ⬇️ Move area loading here (DYNAMIC)
        areas_path = os.path.join(os.path.dirname(__file__), 'areas.json')
        try:
            with open(areas_path, 'r') as f:
                AREA_POLYGONS = json.load(f)
        except Exception as e:
            return Response({'error': f'Failed to load area definitions: {e}'}, status=500)
        # Convert letter signal_id to number
        response_data = []

        for idx, file_obj in enumerate(video_files):
            signal_id = signal_ids[idx]
            if signal_id not in ['A', 'B', 'C', 'D']:
                return Response({
                    'error': f'Invalid signal ID: {signal_id}. Must be one of: A, B, C, D'
                }, status=400)

            numeric_signal_id = letter_to_number(signal_id)
            print(f"[DEBUG] Processing video {idx + 1}/{len(video_files)} for signal {signal_id} (numeric: {numeric_signal_id})")

            # Save uploaded video temporarily
            temp_input = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
            for chunk in file_obj.chunks():
                temp_input.write(chunk)
            temp_input.close()
            print(f"[DEBUG] Saved temporary input file to {temp_input.name}")

            cap = cv2.VideoCapture(temp_input.name)
            if not cap.isOpened():
                return Response({'error': 'Cannot open video'}, status=400)

            # Output video settings
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            fps = cap.get(cv2.CAP_PROP_FPS) or 25
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            temp_output_path = os.path.join(tempfile.gettempdir(), f'processed_output_{signal_id}.mp4')
            out = cv2.VideoWriter(temp_output_path, fourcc, fps, (width, height))

            # Get the appropriate area for this signal
            area_index = ord(signal_id) - ord('A')  # Convert A->0, B->1, etc.
            area = AREA_POLYGONS.get(signal_id)
            if not area or len(area) != 4:
                return Response({'error': f'Area not defined for signal {signal_id}'}, status=400)

            # Tracking
            total_vehicle_count = 0
            total_weight = 0.0
            vehicle_type_counts = {v: 0 for v in detecter.vehicle_classes}

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                vc, wt, processed_frame, type_counts = detecter.detect_vehicles_in_area(frame, area)
                total_vehicle_count += vc
                total_weight += wt
                for vt, count in type_counts.items():
                    vehicle_type_counts[vt] += count

                out.write(processed_frame)

            cap.release()
            out.release()

            # Convert processed video to browser-friendly format using ffmpeg
            ffmpeg_path = r'C:\Users\anime\Downloads\ffmpeg-2025-06-11-git-f019dd69f0-essentials_build\ffmpeg-2025-06-11-git-f019dd69f0-essentials_build\bin\ffmpeg.exe'
            browser_friendly_path = temp_output_path.replace('.mp4', '_browser.mp4')
            try:
                subprocess.run([
                    ffmpeg_path, '-y', '-i', temp_output_path,
                    '-vcodec', 'libx264', '-acodec', 'aac', browser_friendly_path
                ], check=True)
            except Exception as e:
                return Response({'error': f'ffmpeg conversion failed: {e}'}, status=500)

            # Save processed video to model
            with open(browser_friendly_path, 'rb') as f:
                django_file = File(f, name=f'processed_video_{signal_id}.mp4')
                log = TrafficLog.objects.create(
                    junction_id=junction_id,
                    videos=file_obj,
                    processed_videos=django_file,
                    signal_id=numeric_signal_id,  # Use numeric ID for database
                    vehicle_count=total_vehicle_count,
                    traffic_weight=total_weight,
                    green_time=10,
                    efficiency_score=round(total_vehicle_count / max(total_weight, 1.0) * 10, 2),
                    Car=vehicle_type_counts.get('car', 0),
                    Truck=vehicle_type_counts.get('truck', 0),
                    Bus=vehicle_type_counts.get('bus', 0),
                    Motorcycle=vehicle_type_counts.get('motorcycle', 0),
                    Bicycle=vehicle_type_counts.get('bicycle', 0),
                    timestamp=now()
                )
                
                # Ensure the file is properly saved
                if not os.path.exists(log.processed_videos.path):
                    return Response({'error': 'Failed to save processed video'}, status=500)

            # Clean up temporary files
            try:
                os.unlink(temp_input.name)
                os.unlink(temp_output_path)
                os.unlink(browser_friendly_path)
            except Exception as e:
                print(f"Warning: Failed to clean up temporary files: {e}")

            response_data.append({
                'message': f'Video for signal {signal_id} processed',
                'signal_id': signal_id,
                'vehicle_count': total_vehicle_count,
                'video_url': request.build_absolute_uri(log.processed_videos.url)
            })
        print(f"[DEBUG] Response data: {response_data}")
        return Response(response_data, status=200)

@api_view(['GET'])
def latest_stats(request):
    junction_id = request.GET.get('junction_id')
    signal_ids = request.GET.getlist('signal_id')

    # If no signal_ids are provided, return all signals
    if not signal_ids:
        signal_ids = ['A', 'B', 'C', 'D']

    signals = []
    total_vehicle_count = 0
    total_weight = 0.0
    total_efficiency = 0.0
    count = 0

    # Convert signal letters to numbers
    signal_id_map = {letter: ord(letter.upper()) - ord('A') + 1 for letter in ['A', 'B', 'C', 'D']}

    for signal_letter in signal_ids:
        numeric_signal_id = signal_id_map.get(signal_letter.upper())
        try:
            if junction_id:
                log = TrafficLog.objects.filter(
                    junction_id=junction_id,
                    signal_id=numeric_signal_id
                ).latest('timestamp')
            else:
                log = TrafficLog.objects.filter(
                    signal_id=numeric_signal_id
                ).latest('timestamp')

            video_url = request.build_absolute_uri(log.processed_videos.url) if log.processed_videos else ''
            signals.append({
                'id': signal_letter,
                'vehicles': log.vehicle_count,
                'weight': log.traffic_weight,
                'efficiency': log.efficiency_score,
                'time': log.green_time,
                'status': 'green',
                'video': video_url
            })
            total_vehicle_count += log.vehicle_count
            total_weight += log.traffic_weight
            total_efficiency += log.efficiency_score
            count += 1
        except TrafficLog.DoesNotExist:
            signals.append({
                'id': signal_letter,
                'vehicles': 0,
                'weight': 0.0,
                'efficiency': 0.0,
                'time': 0,
                'status': 'red',
                'video': ''
            })

    avg_efficiency = round(total_efficiency / count, 2) if count > 0 else 0.0

    return Response({
        'signals': signals,
        'total_vehicles': total_vehicle_count,
        'total_weight': total_weight,
        'avg_efficiency': avg_efficiency
    })


@method_decorator(csrf_exempt, name='dispatch')
class AdaptiveGreenTime(APIView):
    authentication_classes = []  # Disable authentication for this view
    permission_classes = []      # Disable permission checks for this view
    def post(self, request):
        signal_id = request.data.get('signal_id')
        if not signal_id:
            return Response({"error": "Missing signal_id"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            log = TrafficLog.objects.filter(signal_id=signal_id).latest('timestamp')
        except TrafficLog.DoesNotExist:
            return Response({"error": "No traffic data found for this signal"}, status=status.HTTP_404_NOT_FOUND)
                # Fetch data from log
        vehicle_count = log.vehicle_count
        traffic_weight = log.traffic_weight
        time_of_day = log.timestamp or datetime.now()

        # Create and calculate
        signal = EnhancedTrafficSignal(signal_id)
        green_time = signal.calculate_adaptive_green_time(vehicle_count, traffic_weight, time_of_day)

        return Response({
            "signal_id": signal_id,
            "calculated_green_time": green_time
        }, status=status.HTTP_200_OK)

@api_view(['GET', 'POST'])
def junctions_list(request):
    if request.method == 'GET':
        junctions = JunctionSignals.objects.all().values('id', 'name')
        return Response(list(junctions))
    elif request.method == 'POST':
        name = request.data.get('name')
        if not name:
            return Response({'error': 'Name is required'}, status=400)
        junction, created = JunctionSignals.objects.get_or_create(name=name)
        return Response({'id': junction.id, 'name': junction.name}, status=201 if created else 200)
