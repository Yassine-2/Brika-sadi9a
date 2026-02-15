from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Forklift, ForkliftState, User
from app.schemas import (
    ForkliftCreate, ForkliftUpdate, ForkliftResponse, ForkliftSummary
)
from app.auth import require_industrial_mode

router = APIRouter(prefix="/forklifts", tags=["Forklifts - Industrial Mode"])


@router.post("/", response_model=ForkliftResponse, status_code=status.HTTP_201_CREATED)
def create_forklift(
    forklift: ForkliftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_industrial_mode)
):
    """Create a new forklift"""
    db_forklift = Forklift(
        name=forklift.name,
        state=forklift.state,
        last_maintenance=forklift.last_maintenance,
        position=forklift.position,
        image=forklift.image,
        video_url=forklift.video_url
    )
    
    # Auto-calculate next maintenance (3 months after last)
    if forklift.last_maintenance:
        db_forklift.next_maintenance = forklift.last_maintenance + timedelta(days=90)
    
    db.add(db_forklift)
    db.commit()
    db.refresh(db_forklift)
    return db_forklift


@router.get("/", response_model=List[ForkliftResponse])
def get_forklifts(
    skip: int = 0,
    limit: int = 100,
    state: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_industrial_mode)
):
    """Get all forklifts with optional filtering"""
    query = db.query(Forklift)
    
    if state:
        if state == "sane":
            query = query.filter(Forklift.state == ForkliftState.SANE)
        elif state == "trouble":
            query = query.filter(Forklift.state == ForkliftState.TROUBLE)
    
    forklifts = query.offset(skip).limit(limit).all()
    return forklifts


@router.get("/summary", response_model=ForkliftSummary)
def get_forklift_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_industrial_mode)
):
    """Get summary of all forklifts"""
    forklifts = db.query(Forklift).all()
    
    total = len(forklifts)
    sane_count = len([f for f in forklifts if f.state == ForkliftState.SANE])
    trouble_count = len([f for f in forklifts if f.state == ForkliftState.TROUBLE])
    free_count = len([f for f in forklifts if not f.has_ongoing_task])
    busy_count = len([f for f in forklifts if f.has_ongoing_task])
    
    # Find closest maintenance date
    maintenance_dates = [f.next_maintenance for f in forklifts if f.next_maintenance]
    closest_maintenance = min(maintenance_dates) if maintenance_dates else None
    
    return ForkliftSummary(
        total=total,
        sane_count=sane_count,
        trouble_count=trouble_count,
        free_count=free_count,
        busy_count=busy_count,
        closest_maintenance=closest_maintenance
    )


@router.get("/{forklift_id}", response_model=ForkliftResponse)
def get_forklift(
    forklift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_industrial_mode)
):
    """Get a specific forklift by ID"""
    forklift = db.query(Forklift).filter(Forklift.id == forklift_id).first()
    if not forklift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forklift not found"
        )
    return forklift


@router.put("/{forklift_id}", response_model=ForkliftResponse)
def update_forklift(
    forklift_id: int,
    forklift_update: ForkliftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_industrial_mode)
):
    """Update a forklift"""
    forklift = db.query(Forklift).filter(Forklift.id == forklift_id).first()
    if not forklift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forklift not found"
        )
    
    update_data = forklift_update.model_dump(exclude_unset=True)
    
    # If last_maintenance is updated, recalculate next_maintenance
    if 'last_maintenance' in update_data and update_data['last_maintenance']:
        update_data['next_maintenance'] = update_data['last_maintenance'] + timedelta(days=90)
    
    for field, value in update_data.items():
        setattr(forklift, field, value)
    
    db.commit()
    db.refresh(forklift)
    return forklift


@router.delete("/{forklift_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_forklift(
    forklift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_industrial_mode)
):
    """Delete a forklift"""
    forklift = db.query(Forklift).filter(Forklift.id == forklift_id).first()
    if not forklift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forklift not found"
        )
    
    db.delete(forklift)
    db.commit()
    return None


@router.post("/{forklift_id}/maintenance", response_model=ForkliftResponse)
def record_maintenance(
    forklift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_industrial_mode)
):
    """Record a maintenance for a forklift (sets last_maintenance to today)"""
    forklift = db.query(Forklift).filter(Forklift.id == forklift_id).first()
    if not forklift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forklift not found"
        )
    
    today = datetime.now().date()
    forklift.last_maintenance = today
    forklift.next_maintenance = today + timedelta(days=90)
    forklift.state = ForkliftState.SANE  # Maintenance fixes issues
    
    db.commit()
    db.refresh(forklift)
    return forklift


@router.post("/{forklift_id}/assign-task", response_model=ForkliftResponse)
def assign_task(
    forklift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_industrial_mode)
):
    """Assign a task to a forklift"""
    forklift = db.query(Forklift).filter(Forklift.id == forklift_id).first()
    if not forklift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forklift not found"
        )
    
    forklift.has_ongoing_task = True
    db.commit()
    db.refresh(forklift)
    return forklift


@router.post("/{forklift_id}/complete-task", response_model=ForkliftResponse)
def complete_task(
    forklift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_industrial_mode)
):
    """Mark a forklift as free (task completed)"""
    forklift = db.query(Forklift).filter(Forklift.id == forklift_id).first()
    if not forklift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forklift not found"
        )
    
    forklift.has_ongoing_task = False
    db.commit()
    db.refresh(forklift)
    return forklift
