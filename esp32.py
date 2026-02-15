import socket
import json

HOST = ''   # listen on all interfaces
PORT = 5003

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.bind((HOST, PORT))
s.listen(1)
print("Waiting for ESP32 connection...")

conn, addr = s.accept()
print("Connected by", addr)

while True:
    data = conn.recv(1024).decode().strip()
    if not data:
        continue
    try:
        json_data = json.loads(data)
        print("Sensor:", json_data["sensor"])
        print("Distance:", json_data["distance_cm"], "cm")
        print("Alert:", json_data["alert"])
        print("--------")
    except json.JSONDecodeError:
        print("Received invalid JSON:", data)
