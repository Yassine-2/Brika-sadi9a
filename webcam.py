from flask import Flask, Response
from flask_cors import CORS
import cv2

app = Flask("yassine")
CORS(app)

camera = None

def get_camera():
    """Try to open camera with different indices and backends"""
    global camera
    if camera is not None and camera.isOpened():
        return camera
    
    # Try different camera indices and backends
    backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]
    indices = [0, 1, 2]
    
    for idx in indices:
        for backend in backends:
            print(f"Trying camera index {idx} with backend {backend}...")
            cam = cv2.VideoCapture(idx, backend)
            if cam.isOpened():
                ret, frame = cam.read()
                if ret and frame is not None:
                    print(f"SUCCESS: Camera {idx} with backend {backend}")
                    cam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                    cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                    camera = cam
                    return camera
                cam.release()
    
    # Last resort - try without backend specification
    for idx in indices:
        print(f"Trying camera index {idx} without backend...")
        cam = cv2.VideoCapture(idx)
        if cam.isOpened():
            ret, frame = cam.read()
            if ret and frame is not None:
                print(f"SUCCESS: Camera {idx}")
                camera = cam
                return camera
            cam.release()
    
    print("ERROR: No camera found!")
    return None


def generate_frames():
    """Capture and stream frames from webcam"""
    cam = get_camera()
    if cam is None:
        # Return error image
        import numpy as np
        error_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(error_frame, "No Camera Found", (150, 240), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
        ret, buffer = cv2.imencode('.jpg', error_frame)
        while True:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
    
    print("Streaming started...")
    
    while True:
        success, frame = cam.read()
        if not success:
            cam = get_camera()
            continue
        
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if ret:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')


@app.route('/video_feed')
def video_feed():
    """MJPEG video feed endpoint"""
    return Response(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


@app.route('/')
def index():
    """Simple test page"""
    return '''
    <!DOCTYPE html>
    <html>
    <head><title>Camera Stream</title></head>
    <body style="background: #1a1a2e; color: white; font-family: sans-serif; text-align: center; padding: 20px;">
        <h1>Camera Stream Server</h1>
        <img src="/video_feed" style="max-width: 100%; border: 2px solid #4a90d9; border-radius: 8px;">
    </body>
    </html>
    '''


if __name__ == '__main__':
    print("Starting camera server...")
    print("Make sure camera is connected and not used by another app")
    app.run(host='0.0.0.0', port=5001, threaded=True)