from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import datetime
import json

from app.database import get_db
from app.models import RaspberryPiDevice, User
from app.schemas import (
    RaspberryPiCreate, RaspberryPiUpdate, RaspberryPiResponse,
    RaspberryPiCommand, RaspberryPiCommandResponse
)
from app.auth import get_current_active_user

router = APIRouter(prefix="/raspberry-pi", tags=["Raspberry Pi"])


# In-memory storage for connected WebSocket clients
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, device_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[device_id] = websocket
    
    def disconnect(self, device_id: str):
        if device_id in self.active_connections:
            del self.active_connections[device_id]
    
    async def send_command(self, device_id: str, command: dict) -> bool:
        if device_id in self.active_connections:
            websocket = self.active_connections[device_id]
            await websocket.send_json(command)
            return True
        return False
    
    def is_connected(self, device_id: str) -> bool:
        return device_id in self.active_connections


manager = ConnectionManager()


@router.post("/devices", response_model=RaspberryPiResponse, status_code=status.HTTP_201_CREATED)
def register_device(
    device: RaspberryPiCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Register a new Raspberry Pi device"""
    # Check if device already exists
    existing = db.query(RaspberryPiDevice).filter(
        RaspberryPiDevice.device_id == device.device_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device with this ID already exists"
        )
    
    db_device = RaspberryPiDevice(
        device_id=device.device_id,
        name=device.name,
        ip_address=device.ip_address,
        location=device.location
    )
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device


@router.get("/devices", response_model=List[RaspberryPiResponse])
def get_devices(
    online_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all registered Raspberry Pi devices"""
    query = db.query(RaspberryPiDevice)
    
    if online_only:
        query = query.filter(RaspberryPiDevice.is_online == True)
    
    devices = query.all()
    
    # Update online status based on WebSocket connections
    for device in devices:
        device.is_online = manager.is_connected(device.device_id)
    
    return devices


@router.get("/devices/{device_id}", response_model=RaspberryPiResponse)
def get_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific Raspberry Pi device"""
    device = db.query(RaspberryPiDevice).filter(
        RaspberryPiDevice.device_id == device_id
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    device.is_online = manager.is_connected(device.device_id)
    return device


@router.put("/devices/{device_id}", response_model=RaspberryPiResponse)
def update_device(
    device_id: str,
    device_update: RaspberryPiUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a Raspberry Pi device"""
    db_device = db.query(RaspberryPiDevice).filter(
        RaspberryPiDevice.device_id == device_id
    ).first()
    
    if not db_device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    if device_update.name is not None:
        db_device.name = device_update.name
    if device_update.ip_address is not None:
        db_device.ip_address = device_update.ip_address
    if device_update.location is not None:
        db_device.location = device_update.location
    
    db.commit()
    db.refresh(db_device)
    return db_device


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a Raspberry Pi device"""
    db_device = db.query(RaspberryPiDevice).filter(
        RaspberryPiDevice.device_id == device_id
    ).first()
    
    if not db_device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    db.delete(db_device)
    db.commit()
    return None


@router.post("/command", response_model=RaspberryPiCommandResponse)
async def send_command(
    command: RaspberryPiCommand,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send a command to a Raspberry Pi device"""
    # Check if device exists
    device = db.query(RaspberryPiDevice).filter(
        RaspberryPiDevice.device_id == command.device_id
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    # Check if device is connected
    if not manager.is_connected(command.device_id):
        return RaspberryPiCommandResponse(
            device_id=command.device_id,
            status="error",
            error="Device is not connected"
        )
    
    # Send command via WebSocket
    command_data = {
        "command": command.command,
        "parameters": command.parameters or {}
    }
    
    success = await manager.send_command(command.device_id, command_data)
    
    if success:
        return RaspberryPiCommandResponse(
            device_id=command.device_id,
            status="sent",
            result={"message": "Command sent successfully"}
        )
    else:
        return RaspberryPiCommandResponse(
            device_id=command.device_id,
            status="error",
            error="Failed to send command"
        )


@router.websocket("/ws/{device_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    device_id: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for Raspberry Pi devices to connect"""
    # Verify device exists
    device = db.query(RaspberryPiDevice).filter(
        RaspberryPiDevice.device_id == device_id
    ).first()
    
    if not device:
        await websocket.close(code=4004, reason="Device not registered")
        return
    
    await manager.connect(device_id, websocket)
    
    # Update device status
    device.is_online = True
    device.last_seen = datetime.utcnow()
    db.commit()
    
    try:
        while True:
            # Receive data from Raspberry Pi
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "heartbeat":
                device.last_seen = datetime.utcnow()
                db.commit()
                await websocket.send_json({"type": "heartbeat_ack"})
            
            elif message.get("type") == "scan_result":
                # Handle QR code scan results
                # This could trigger product lookup or task updates
                pass
            
            elif message.get("type") == "sensor_data":
                # Handle sensor data
                pass
    
    except WebSocketDisconnect:
        manager.disconnect(device_id)
        device.is_online = False
        device.last_seen = datetime.utcnow()
        db.commit()
    except Exception as e:
        manager.disconnect(device_id)
        device.is_online = False
        db.commit()
