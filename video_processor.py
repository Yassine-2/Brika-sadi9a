"""
Video Processing Server
Receives stream from camera laptop, detects QR codes, 
looks up product names, and re-streams with annotations
"""
from flask import Flask, Response
from flask_cors import CORS
import cv2
import numpy as np
import requests
from pyzbar import pyzbar
import threading
import time

app = Flask(__name__)
CORS(app)

# Configuration
CAMERA_STREAM_URL = "http://192.168.1.185:5001/video_feed"  # Camera laptop stream
API_BASE_URL = "http://localhost:8000"  # Your FastAPI backend

# Cache for product lookups (avoid repeated API calls)
product_cache = {}
cache_lock = threading.Lock()

# Frame buffer for thread-safe frame sharing
current_frame = None
frame_lock = threading.Lock()


def get_product_by_qr(qr_code):
    """Look up product name by QR code from the API"""
    with cache_lock:
        if qr_code in product_cache:
            return product_cache[qr_code]
    
    try:
        # Use public endpoint (no auth required)
        response = requests.get(
            f"{API_BASE_URL}/products/qr/{qr_code}",
            timeout=2
        )
        if response.status_code == 200:
            data = response.json()
            name = data.get('name', qr_code)
            with cache_lock:
                product_cache[qr_code] = name
            return name
    except Exception as e:
        print(f"API lookup failed for {qr_code}: {e}")
    
    # Return QR code itself if product not found
    return qr_code


def process_frame(frame):
    """Detect QR codes and draw boxes with product names"""
    if frame is None:
        return None
    
    # Decode QR codes
    qr_codes = pyzbar.decode(frame)
    
    for qr in qr_codes:
        # Get bounding box
        points = qr.polygon
        if len(points) == 4:
            pts = np.array([[p.x, p.y] for p in points], np.int32)
            pts = pts.reshape((-1, 1, 2))
            
            # Draw green box around QR code
            cv2.polylines(frame, [pts], True, (0, 255, 0), 3)
            
            # Get QR code data
            qr_data = qr.data.decode('utf-8')
            
            # Look up product name
            product_name = get_product_by_qr(qr_data)
            
            # Calculate text position (above the QR code)
            x_min = min(p.x for p in points)
            y_min = min(p.y for p in points)
            
            # Draw background rectangle for text
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.8
            thickness = 2
            (text_width, text_height), baseline = cv2.getTextSize(
                product_name, font, font_scale, thickness
            )
            
            # Background for text
            cv2.rectangle(
                frame,
                (x_min, y_min - text_height - 15),
                (x_min + text_width + 10, y_min - 5),
                (0, 255, 0),
                -1  # Filled
            )
            
            # Draw product name
            cv2.putText(
                frame,
                product_name,
                (x_min + 5, y_min - 10),
                font,
                font_scale,
                (0, 0, 0),  # Black text
                thickness
            )
        else:
            # Fallback for non-quadrilateral QR codes
            rect = qr.rect
            cv2.rectangle(
                frame,
                (rect.left, rect.top),
                (rect.left + rect.width, rect.top + rect.height),
                (0, 255, 0),
                3
            )
            
            qr_data = qr.data.decode('utf-8')
            product_name = get_product_by_qr(qr_data)
            
            cv2.putText(
                frame,
                product_name,
                (rect.left, rect.top - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 255, 0),
                2
            )
    
    return frame


def fetch_and_process_stream():
    """Background thread to fetch and process frames"""
    global current_frame
    
    while True:
        try:
            # Open stream from camera laptop
            stream = requests.get(CAMERA_STREAM_URL, stream=True, timeout=10)
            bytes_data = b''
            
            for chunk in stream.iter_content(chunk_size=1024):
                bytes_data += chunk
                
                # Look for JPEG frame boundaries
                start = bytes_data.find(b'\xff\xd8')  # JPEG start
                end = bytes_data.find(b'\xff\xd9')    # JPEG end
                
                if start != -1 and end != -1 and end > start:
                    # Extract JPEG frame
                    jpg_data = bytes_data[start:end + 2]
                    bytes_data = bytes_data[end + 2:]
                    
                    # Decode frame
                    frame = cv2.imdecode(
                        np.frombuffer(jpg_data, dtype=np.uint8),
                        cv2.IMREAD_COLOR
                    )
                    
                    if frame is not None:
                        # Process frame (QR detection)
                        processed = process_frame(frame)
                        
                        with frame_lock:
                            current_frame = processed
                            
        except Exception as e:
            print(f"Stream error: {e}")
            time.sleep(2)  # Wait before reconnecting


def generate_frames():
    """Generate processed frames for MJPEG stream"""
    global current_frame
    
    while True:
        with frame_lock:
            if current_frame is not None:
                frame = current_frame.copy()
            else:
                # Generate placeholder frame if no stream
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(
                    frame,
                    "Waiting for camera stream...",
                    (100, 240),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (255, 255, 255),
                    2
                )
        
        # Encode as JPEG
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        
        if ret:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        
        time.sleep(0.033)  # ~30 FPS


@app.route('/video_feed')
def video_feed():
    """Processed video feed endpoint"""
    return Response(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame',
        headers={
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        }
    )


@app.route('/')
def index():
    """Test page"""
    return '''
    <!DOCTYPE html>
    <html>
    <head><title>QR Code Video Processor</title></head>
    <body style="background: #1a1a2e; color: white; font-family: sans-serif; text-align: center; padding: 20px;">
        <h1>QR Code Video Processor</h1>
        <p>Processing stream from: ''' + CAMERA_STREAM_URL + '''</p>
        <img src="/video_feed" style="max-width: 100%; border: 2px solid #4a90d9; border-radius: 8px;">
        <p style="color: #888; margin-top: 20px;">QR codes will be detected and product names displayed</p>
    </body>
    </html>
    '''


@app.route('/health')
def health():
    """Health check endpoint"""
    return {
        'status': 'ok',
        'camera_url': CAMERA_STREAM_URL,
        'cached_products': len(product_cache)
    }


@app.route('/clear_cache')
def clear_cache():
    """Clear product cache"""
    global product_cache
    with cache_lock:
        product_cache = {}
    return {'status': 'cache cleared'}


if __name__ == '__main__':
    print("=" * 50)
    print("QR Code Video Processor")
    print("=" * 50)
    print(f"Camera stream: {CAMERA_STREAM_URL}")
    print(f"API backend: {API_BASE_URL}")
    print("=" * 50)
    
    # Start background thread to fetch and process stream
    stream_thread = threading.Thread(target=fetch_and_process_stream, daemon=True)
    stream_thread.start()
    
    print("Starting processed video server on http://localhost:5002")
    app.run(host='0.0.0.0', port=5002, threaded=True)
