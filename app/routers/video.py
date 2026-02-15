"""
Video Processing Router
Receives stream from camera laptop, detects QR codes,
looks up product names, and re-streams with annotations
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import cv2
import numpy as np
import requests
import threading
import time

from app.database import SessionLocal
from app.models import Product

router = APIRouter(prefix="/video", tags=["Video"])

# Configuration
CAMERA_STREAM_URL = "http://192.168.1.185:5001/video_feed"

# Cache for product lookups
product_cache = {}
cache_lock = threading.Lock()

# Frame buffer
current_frame = None
frame_lock = threading.Lock()
stream_thread = None
stream_running = False

# QR Code detector using OpenCV (no external DLL needed)
qr_detector = cv2.QRCodeDetector()


def get_product_name_from_db(qr_code: str) -> str:
    """Look up product name by QR code"""
    with cache_lock:
        if qr_code in product_cache:
            return product_cache[qr_code]
    
    try:
        db = SessionLocal()
        product = db.query(Product).filter(Product.qr_code == qr_code).first()
        db.close()
        
        if product:
            with cache_lock:
                product_cache[qr_code] = product.name
            return product.name
    except Exception as e:
        print(f"DB lookup failed for {qr_code}: {e}")
    
    return qr_code


def process_frame(frame):
    """Detect QR codes and draw boxes with product names"""
    if frame is None:
        return None
    
    # Detect QR codes using OpenCV's built-in detector
    data, points, _ = qr_detector.detectAndDecode(frame)
    
    if points is not None and data:
        points = points[0].astype(int)
        
        # Draw green box around QR code
        cv2.polylines(frame, [points], True, (0, 255, 0), 3)
        
        # Look up product name
        product_name = get_product_name_from_db(data)
        
        # Calculate text position
        x_min = int(min(p[0] for p in points))
        y_min = int(min(p[1] for p in points))
        
        font = cv2.FONT_HERSHEY_SIMPLEX
        (text_width, text_height), _ = cv2.getTextSize(product_name, font, 0.8, 2)
        
        # Background for text
        cv2.rectangle(frame, (x_min, y_min - text_height - 15),
                     (x_min + text_width + 10, y_min - 5), (0, 255, 0), -1)
        cv2.putText(frame, product_name, (x_min + 5, y_min - 10),
                   font, 0.8, (0, 0, 0), 2)
    
    return frame


def fetch_and_process_stream():
    """Background thread to fetch and process frames"""
    global current_frame, stream_running
    stream_running = True
    
    while stream_running:
        try:
            stream = requests.get(CAMERA_STREAM_URL, stream=True, timeout=10)
            bytes_data = b''
            
            for chunk in stream.iter_content(chunk_size=1024):
                if not stream_running:
                    break
                bytes_data += chunk
                
                start = bytes_data.find(b'\xff\xd8')
                end = bytes_data.find(b'\xff\xd9')
                
                if start != -1 and end != -1 and end > start:
                    jpg_data = bytes_data[start:end + 2]
                    bytes_data = bytes_data[end + 2:]
                    
                    frame = cv2.imdecode(np.frombuffer(jpg_data, dtype=np.uint8), cv2.IMREAD_COLOR)
                    if frame is not None:
                        with frame_lock:
                            current_frame = process_frame(frame)
        except Exception as e:
            print(f"Stream error: {e}")
            time.sleep(2)


def generate_frames():
    """Generate processed frames for MJPEG stream"""
    while True:
        with frame_lock:
            if current_frame is not None:
                frame = current_frame.copy()
            else:
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(frame, "Waiting for camera stream...", (100, 240),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if ret:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        time.sleep(0.033)


def start_stream_processor():
    global stream_thread
    if stream_thread is None or not stream_thread.is_alive():
        stream_thread = threading.Thread(target=fetch_and_process_stream, daemon=True)
        stream_thread.start()


@router.get("/feed")
async def video_feed():
    """Processed video feed with QR detection"""
    start_stream_processor()
    return StreamingResponse(
        generate_frames(),
        media_type='multipart/x-mixed-replace; boundary=frame'
    )


@router.get("/status")
async def video_status():
    return {'camera_url': CAMERA_STREAM_URL, 'stream_running': stream_running, 'cached_products': len(product_cache)}
