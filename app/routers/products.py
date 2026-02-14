from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import io
import base64
import uuid

from app.database import get_db
from app.models import Product, ProductPosition, User, ThresholdStatus
from app.schemas import (
    ProductCreate, ProductUpdate, ProductResponse,
    ProductPositionCreate, ProductPositionResponse
)
from app.auth import require_business_mode

router = APIRouter(prefix="/products", tags=["Products - Business Mode"])


def generate_qr_code(data: str) -> str:
    """Generate a QR code and return as base64 data URL"""
    try:
        import qrcode
        from qrcode.main import QRCode
        from qrcode.constants import ERROR_CORRECT_L
        
        qr = QRCode(
            version=1,
            error_correction=ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return f"data:image/png;base64,{img_base64}"
    except ImportError:
        # If qrcode not available, return None
        return None


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Create a new product with auto-generated QR code"""
    # Generate unique QR code identifier
    qr_code_id = f"PROD-{uuid.uuid4().hex[:8].upper()}"
    qr_code_image = generate_qr_code(qr_code_id)
    
    # Determine threshold status
    threshold_status = ThresholdStatus.BELOW if product.quantity < product.threshold else ThresholdStatus.ENOUGH
    
    # Create product
    db_product = Product(
        name=product.name,
        image=product.image,
        qr_code=qr_code_id,
        qr_code_image=qr_code_image,
        quantity=product.quantity,
        threshold=product.threshold,
        threshold_status=threshold_status
    )
    db.add(db_product)
    db.flush()  # Get the product ID
    
    # Add positions
    for pos in product.positions:
        db_position = ProductPosition(
            product_id=db_product.id,
            position=pos.position,
            percentage=pos.percentage
        )
        db.add(db_position)
    
    db.commit()
    db.refresh(db_product)
    return db_product


@router.get("/", response_model=List[ProductResponse])
def get_products(
    skip: int = 0,
    limit: int = 100,
    below_threshold: bool = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Get all products with optional filtering"""
    query = db.query(Product)
    
    if below_threshold is not None:
        if below_threshold:
            query = query.filter(Product.threshold_status == ThresholdStatus.BELOW)
        else:
            query = query.filter(Product.threshold_status == ThresholdStatus.ENOUGH)
    
    products = query.offset(skip).limit(limit).all()
    return products


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Get a specific product by ID"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product


@router.get("/qr/{qr_code}", response_model=ProductResponse)
def get_product_by_qr(
    qr_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Get a product by its QR code"""
    product = db.query(Product).filter(Product.qr_code == qr_code).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Update a product"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Update fields if provided
    if product_update.name is not None:
        db_product.name = product_update.name
    if product_update.image is not None:
        db_product.image = product_update.image
    if product_update.qr_code is not None:
        # Check if QR code is unique
        existing = db.query(Product).filter(
            Product.qr_code == product_update.qr_code,
            Product.id != product_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product with this QR code already exists"
            )
        db_product.qr_code = product_update.qr_code
    if product_update.quantity is not None:
        db_product.quantity = product_update.quantity
    if product_update.threshold is not None:
        db_product.threshold = product_update.threshold
    
    # Update threshold status
    db_product.update_threshold_status()
    
    # Update positions if provided
    if product_update.positions is not None:
        # Delete existing positions
        db.query(ProductPosition).filter(ProductPosition.product_id == product_id).delete()
        # Add new positions
        for pos in product_update.positions:
            db_position = ProductPosition(
                product_id=product_id,
                position=pos.position,
                percentage=pos.percentage
            )
            db.add(db_position)
    
    db.commit()
    db.refresh(db_product)
    return db_product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Delete a product"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    db.delete(db_product)
    db.commit()
    return None


@router.post("/{product_id}/positions", response_model=ProductPositionResponse)
def add_product_position(
    product_id: int,
    position: ProductPositionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Add a position to a product"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    db_position = ProductPosition(
        product_id=product_id,
        position=position.position,
        percentage=position.percentage
    )
    db.add(db_position)
    db.commit()
    db.refresh(db_position)
    return db_position


@router.put("/{product_id}/quantity")
def update_product_quantity(
    product_id: int,
    quantity_change: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_business_mode)
):
    """Update product quantity (positive to add, negative to subtract)"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    new_quantity = db_product.quantity + quantity_change
    if new_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity cannot be negative"
        )
    
    db_product.quantity = new_quantity
    db_product.update_threshold_status()
    
    db.commit()
    db.refresh(db_product)
    
    return {
        "product_id": db_product.id,
        "name": db_product.name,
        "quantity": db_product.quantity,
        "threshold_status": db_product.threshold_status.value
    }
