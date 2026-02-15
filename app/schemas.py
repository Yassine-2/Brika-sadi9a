from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from enum import Enum


# Enums
class UserMode(str, Enum):
    BUSINESS = "business"
    INDUSTRIAL = "industrial"


class TaskType(str, Enum):
    IN = "in"
    OUT = "out"


class TaskState(str, Enum):
    ONGOING = "ongoing"
    FINISHED = "finished"


class ThresholdStatus(str, Enum):
    BELOW = "below"
    ENOUGH = "enough"


# ============ User Schemas ============
class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str
    modes: List[UserMode] = [UserMode.BUSINESS]


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    modes: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# ============ Product Position Schemas ============
class ProductPositionBase(BaseModel):
    position: str
    percentage: float = 0
    units: int = 0  # Number of units at this position (max 9)


class ProductPositionCreate(ProductPositionBase):
    pass


class ProductPositionResponse(ProductPositionBase):
    id: int

    class Config:
        from_attributes = True


# Schema for quantity update with position
class QuantityUpdateRequest(BaseModel):
    quantity_change: int  # Positive to add, negative to remove
    position_id: int  # The position ID where the change happens


# ============ Product Schemas ============
class ProductBase(BaseModel):
    name: str
    image: Optional[str] = None
    qr_code: Optional[str] = None
    quantity: int = 0
    threshold: int = 10


class ProductCreate(ProductBase):
    positions: List[ProductPositionCreate] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    image: Optional[str] = None
    qr_code: Optional[str] = None
    quantity: Optional[int] = None
    threshold: Optional[int] = None
    positions: Optional[List[ProductPositionCreate]] = None


class ProductResponse(ProductBase):
    id: int
    qr_code_image: Optional[str] = None
    threshold_status: ThresholdStatus
    positions: List[ProductPositionResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Task Item Schemas ============
class TaskItemBase(BaseModel):
    product_id: int
    quantity_needed: int
    task_type: TaskType


class TaskItemCreate(TaskItemBase):
    pass


class TaskItemUpdate(BaseModel):
    quantity_needed: Optional[int] = None
    task_type: Optional[TaskType] = None
    state: Optional[TaskState] = None


class TaskItemResponse(TaskItemBase):
    id: int
    state: TaskState
    product: Optional[ProductResponse] = None

    class Config:
        from_attributes = True


# ============ Task Schemas ============
class TaskBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class TaskCreate(TaskBase):
    items: List[TaskItemCreate] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    overall_state: Optional[TaskState] = None


class TaskResponse(TaskBase):
    id: int
    overall_state: TaskState
    items: List[TaskItemResponse]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


# ============ Raspberry Pi Device Schemas ============
class RaspberryPiBase(BaseModel):
    device_id: str
    name: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None


class RaspberryPiCreate(RaspberryPiBase):
    pass


class RaspberryPiUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    is_online: Optional[bool] = None


class RaspberryPiResponse(RaspberryPiBase):
    id: int
    is_online: bool
    last_seen: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Raspberry Pi Command Schemas ============
class RaspberryPiCommand(BaseModel):
    device_id: str
    command: str
    parameters: Optional[dict] = None


class RaspberryPiCommandResponse(BaseModel):
    device_id: str
    status: str
    result: Optional[dict] = None
    error: Optional[str] = None


# ============ Forklift Schemas (Industrial Mode) ============
class ForkliftState(str, Enum):
    SANE = "sane"
    TROUBLE = "trouble"


class ForkliftBase(BaseModel):
    name: str
    state: ForkliftState = ForkliftState.SANE
    last_maintenance: Optional[datetime] = None
    next_maintenance: Optional[datetime] = None
    has_ongoing_task: bool = False
    position: Optional[str] = None
    image: Optional[str] = None
    video_url: Optional[str] = None


class ForkliftCreate(BaseModel):
    name: str
    state: ForkliftState = ForkliftState.SANE
    last_maintenance: Optional[datetime] = None
    position: Optional[str] = None
    image: Optional[str] = None
    video_url: Optional[str] = "http://172.17.86.17/"


class ForkliftUpdate(BaseModel):
    name: Optional[str] = None
    state: Optional[ForkliftState] = None
    last_maintenance: Optional[datetime] = None
    has_ongoing_task: Optional[bool] = None
    position: Optional[str] = None
    image: Optional[str] = None
    video_url: Optional[str] = None


class ForkliftResponse(ForkliftBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ForkliftSummary(BaseModel):
    total: int
    sane_count: int
    trouble_count: int
    free_count: int
    busy_count: int
    closest_maintenance: Optional[datetime] = None
