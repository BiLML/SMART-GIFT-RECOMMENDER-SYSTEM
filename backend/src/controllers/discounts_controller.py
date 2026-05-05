from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.core.database import get_db
from src.models.discounts import DiscountCode
from src.controllers.auth_controller import get_current_user
from src.models.users import User
from datetime import datetime

router = APIRouter(prefix="/discounts", tags=["discounts"])

@router.get("/validate/{code}")
def validate_discount(code: str, order_value: float, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    discount = db.query(DiscountCode).filter(DiscountCode.code == code).first()
    
    if not discount:
        raise HTTPException(status_code=404, detail="Mã giảm giá không tồn tại")
    
    if not discount.is_active:
        raise HTTPException(status_code=400, detail="Mã giảm giá đã bị vô hiệu hóa")
        
    if discount.expiration_date and discount.expiration_date < datetime.now():
        raise HTTPException(status_code=400, detail="Mã giảm giá đã hết hạn")
        
    if discount.usage_limit and discount.used_count >= discount.usage_limit:
        raise HTTPException(status_code=400, detail="Mã giảm giá đã hết lượt sử dụng")
        
    if order_value < discount.min_order_value:
        raise HTTPException(status_code=400, detail=f"Đơn hàng phải tối thiểu {discount.min_order_value:,.0f}đ để áp dụng mã này")
        
    discount_amount = 0
    if discount.discount_type == "percentage":
        discount_amount = order_value * (discount.value / 100)
        if discount.max_discount_amount:
            discount_amount = min(discount_amount, discount.max_discount_amount)
    else: # fixed
        discount_amount = discount.value
        
    return {
        "code": discount.code,
        "discount_type": discount.discount_type,
        "value": discount.value,
        "discount_amount": discount_amount,
        "final_total": max(0, order_value - discount_amount)
    }
