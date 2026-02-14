from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Task, TaskItem, Product, User, TaskState, TaskType
from app.schemas import (
    TaskCreate, TaskUpdate, TaskResponse,
    TaskItemCreate, TaskItemUpdate, TaskItemResponse
)
from app.auth import require_business_mode

router = APIRouter(prefix="/tasks", tags=["Tasks - Business Mode"])


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Create a new task with items"""
    # Create task
    db_task = Task(
        title=task.title,
        description=task.description,
        created_by=current_user.id
    )
    db.add(db_task)
    db.flush()  # Get task ID
    
    # Add task items
    for item in task.items:
        # Verify product exists
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {item.product_id} not found"
            )
        
        db_item = TaskItem(
            task_id=db_task.id,
            product_id=item.product_id,
            quantity_needed=item.quantity_needed,
            task_type=item.task_type,
            state=TaskState.ONGOING
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_task)
    return db_task


@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    skip: int = 0,
    limit: int = 100,
    state: TaskState = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Get all tasks with optional state filtering"""
    query = db.query(Task)
    
    if state is not None:
        query = query.filter(Task.overall_state == state)
    
    tasks = query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Get a specific task by ID"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Update a task"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    if task_update.title is not None:
        db_task.title = task_update.title
    if task_update.description is not None:
        db_task.description = task_update.description
    if task_update.overall_state is not None:
        db_task.overall_state = task_update.overall_state
    
    db.commit()
    db.refresh(db_task)
    return db_task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Delete a task"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    db.delete(db_task)
    db.commit()
    return None


@router.post("/{task_id}/items", response_model=TaskItemResponse)
def add_task_item(
    task_id: int,
    item: TaskItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Add an item to a task"""
    # Verify task exists
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Verify product exists
    product = db.query(Product).filter(Product.id == item.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    db_item = TaskItem(
        task_id=task_id,
        product_id=item.product_id,
        quantity_needed=item.quantity_needed,
        task_type=item.task_type,
        state=TaskState.ONGOING
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Update task overall state
    task.update_overall_state()
    db.commit()
    
    return db_item


@router.put("/{task_id}/items/{item_id}", response_model=TaskItemResponse)
def update_task_item(
    task_id: int,
    item_id: int,
    item_update: TaskItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Update a task item"""
    db_item = db.query(TaskItem).filter(
        TaskItem.id == item_id,
        TaskItem.task_id == task_id
    ).first()
    
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task item not found"
        )
    
    if item_update.quantity_needed is not None:
        db_item.quantity_needed = item_update.quantity_needed
    if item_update.task_type is not None:
        db_item.task_type = item_update.task_type
    if item_update.state is not None:
        db_item.state = item_update.state
    
    db.commit()
    db.refresh(db_item)
    
    # Update task overall state
    task = db.query(Task).filter(Task.id == task_id).first()
    task.update_overall_state()
    db.commit()
    
    return db_item


@router.post("/{task_id}/items/{item_id}/complete")
def complete_task_item(
    task_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Mark a task item as finished and update product quantity"""
    db_item = db.query(TaskItem).filter(
        TaskItem.id == item_id,
        TaskItem.task_id == task_id
    ).first()
    
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task item not found"
        )
    
    if db_item.state == TaskState.FINISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task item is already finished"
        )
    
    # Update product quantity based on task type
    product = db.query(Product).filter(Product.id == db_item.product_id).first()
    
    if db_item.task_type == TaskType.IN:
        # Getting products in - add to quantity
        product.quantity += db_item.quantity_needed
    else:
        # Getting products out - subtract from quantity
        if product.quantity < db_item.quantity_needed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient quantity. Available: {product.quantity}, Needed: {db_item.quantity_needed}"
            )
        product.quantity -= db_item.quantity_needed
    
    product.update_threshold_status()
    db_item.state = TaskState.FINISHED
    
    # Update task overall state
    task = db.query(Task).filter(Task.id == task_id).first()
    task.update_overall_state()
    
    db.commit()
    
    return {
        "message": "Task item completed",
        "item_id": item_id,
        "product_id": product.id,
        "product_name": product.name,
        "new_quantity": product.quantity,
        "threshold_status": product.threshold_status.value,
        "task_overall_state": task.overall_state.value
    }


@router.delete("/{task_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_item(
    task_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Delete a task item"""
    db_item = db.query(TaskItem).filter(
        TaskItem.id == item_id,
        TaskItem.task_id == task_id
    ).first()
    
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task item not found"
        )
    
    db.delete(db_item)
    db.commit()
    
    # Update task overall state
    task = db.query(Task).filter(Task.id == task_id).first()
    if task:
        task.update_overall_state()
        db.commit()
    
    return None
