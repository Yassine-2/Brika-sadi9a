from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, Enum, Text, DateTime, Table
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
import enum

from app.database import Base


# Enums
class UserMode(str, enum.Enum):
    BUSINESS = "business"
    INDUSTRIAL = "industrial"


class TaskType(str, enum.Enum):
    IN = "in"  # Getting products in
    OUT = "out"  # Getting products out


class TaskState(str, enum.Enum):
    ONGOING = "ongoing"
    FINISHED = "finished"


class ThresholdStatus(str, enum.Enum):
    BELOW = "below"
    ENOUGH = "enough"


# Association table for User modes
user_modes = Table(
    'user_modes',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('mode', Enum(UserMode), primary_key=True)
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # User can have access to multiple modes
    modes = Column(JSONB, default=["business"])  # List of modes: ["business"], ["industrial"], or ["business", "industrial"]
    
    # Relationship to tasks created by user
    tasks = relationship("Task", back_populates="created_by_user")


class ProductPosition(Base):
    """Represents a position where a product is stored with its percentage"""
    __tablename__ = "product_positions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    position = Column(String(100), nullable=False)  # e.g., "A1-B2", "Shelf-3-Row-1"
    percentage = Column(Float, nullable=False)  # Percentage of product at this position
    
    product = relationship("Product", back_populates="positions")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)  # noun/name of the product
    image = Column(Text, nullable=True)  # URL or base64 encoded image
    qr_code = Column(String(500), unique=True, nullable=True)  # QR code data
    quantity = Column(Integer, default=0)
    threshold = Column(Integer, default=10)  # Minimum quantity threshold
    threshold_status = Column(Enum(ThresholdStatus), default=ThresholdStatus.ENOUGH)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to positions
    positions = relationship("ProductPosition", back_populates="product", cascade="all, delete-orphan")
    
    # Relationship to task items
    task_items = relationship("TaskItem", back_populates="product")

    def update_threshold_status(self):
        """Update threshold status based on current quantity"""
        if self.quantity < self.threshold:
            self.threshold_status = ThresholdStatus.BELOW
        else:
            self.threshold_status = ThresholdStatus.ENOUGH


class TaskItem(Base):
    """Represents a product item within a task"""
    __tablename__ = "task_items"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    quantity_needed = Column(Integer, nullable=False)
    task_type = Column(Enum(TaskType), nullable=False)  # in or out
    state = Column(Enum(TaskState), default=TaskState.ONGOING)
    
    task = relationship("Task", back_populates="items")
    product = relationship("Product", back_populates="task_items")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Overall task state (computed from items or set manually)
    overall_state = Column(Enum(TaskState), default=TaskState.ONGOING)
    
    created_by_user = relationship("User", back_populates="tasks")
    items = relationship("TaskItem", back_populates="task", cascade="all, delete-orphan")

    def update_overall_state(self):
        """Update overall state based on all items"""
        if all(item.state == TaskState.FINISHED for item in self.items):
            self.overall_state = TaskState.FINISHED
        else:
            self.overall_state = TaskState.ONGOING


class RaspberryPiDevice(Base):
    """Represents a connected Raspberry Pi device"""
    __tablename__ = "raspberry_pi_devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    location = Column(String(255), nullable=True)
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
