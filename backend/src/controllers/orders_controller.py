from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from pydantic import BaseModel
from src.core.database import get_db
from src.models.orders import Order, OrderItem
from src.models.payments import Payment
from src.models.books import Book
from src.models.users import User
from src.models.discounts import DiscountCode
from src.controllers.auth_controller import get_current_user
from src.services.email_service import send_notification_email
from datetime import datetime
import uuid

router = APIRouter(prefix="/orders", tags=["orders"])

class OrderItemCreate(BaseModel):
    book_id: int
    quantity: int

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    discount_code: str = None

class PaymentCreate(BaseModel):
    method: str  # COD, Banking, E-Wallet
    shipping_name: str = ""
    shipping_phone: str = ""
    shipping_address: str = ""

@router.post("/")
def create_order(order_data: OrderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_amount = 0
    items_to_create = []

    for item in order_data.items:
        book = db.query(Book).filter(Book.id == item.book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail=f"Book ID {item.book_id} not found")
        if book.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for book: {book.title}")
        
        book.stock -= item.quantity
        price = book.price if book.price else 0
        total_amount += price * item.quantity
        
        items_to_create.append({
            "book_id": book.id,
            "quantity": item.quantity,
            "price": price
        })

    # Apply discount
    discount_amount = 0
    valid_discount_code = None
    if order_data.discount_code:
        discount = db.query(DiscountCode).filter(DiscountCode.code == order_data.discount_code).first()
        if discount and discount.is_active and (not discount.expiration_date or discount.expiration_date > datetime.now()):
            if total_amount >= discount.min_order_value:
                if not discount.usage_limit or discount.used_count < discount.usage_limit:
                    valid_discount_code = discount.code
                    if discount.discount_type == "percentage":
                        discount_amount = total_amount * (discount.value / 100)
                        if discount.max_discount_amount:
                            discount_amount = min(discount_amount, discount.max_discount_amount)
                    else: # fixed
                        discount_amount = discount.value
                    
                    discount.used_count += 1
    
    final_total = max(0, total_amount - discount_amount)

    new_order = Order(
        user_id=current_user.id,
        total_amount=final_total,
        discount_code=valid_discount_code,
        discount_amount=discount_amount,
        status="Pending"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    for item_data in items_to_create:
        order_item = OrderItem(
            order_id=new_order.id,
            book_id=item_data["book_id"],
            quantity=item_data["quantity"],
            price=item_data["price"]
        )
        db.add(order_item)
    
    db.commit()
    db.refresh(new_order)
    
    return {"message": "Order created successfully", "order_id": new_order.id, "total": total_amount}

@router.get("/me")
def get_my_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    orders = db.query(Order).filter(Order.user_id == current_user.id).order_by(desc(Order.created_at)).all()
    result = []
    for order in orders:
        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        item_details = []
        for item in items:
            book = db.query(Book).filter(Book.id == item.book_id).first()
            item_details.append({
                "id": item.id,
                "book_id": item.book_id,
                "book_title": book.title if book else "Unknown",
                "quantity": item.quantity,
                "price": item.price
            })
        
        payment = db.query(Payment).filter(Payment.order_id == order.id).first()
        
        result.append({
            "id": order.id,
            "total_amount": order.total_amount,
            "status": order.status,
            "created_at": order.created_at,
            "items": item_details,
            "payment": {
                "method": payment.method,
                "transaction_ref": payment.transaction_ref,
                "paid_at": payment.paid_at
            } if payment else None
        })
    return result

@router.get("/admin")
def get_all_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "staff"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    orders = db.query(Order).order_by(desc(Order.created_at)).all()
    result = []
    for order in orders:
        user = db.query(User).filter(User.id == order.user_id).first()
        payment = db.query(Payment).filter(Payment.order_id == order.id).first()
        result.append({
            "id": order.id,
            "user_email": user.email if user else "Unknown",
            "total_amount": order.total_amount,
            "status": order.status,
            "created_at": order.created_at,
            "payment_method": payment.method if payment else None
        })
    return result

@router.put("/{order_id}/status")
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "staff"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    old_status = order.status
    order.status = status
    
    # Restore stock if order is cancelled
    if status == "Cancelled" and old_status != "Cancelled":
        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        for item in items:
            book = db.query(Book).filter(Book.id == item.book_id).first()
            if book:
                book.stock += item.quantity
    
    db.commit()
    
    # Send email notification based on status change
    user = db.query(User).filter(User.id == order.user_id).first()
    if user and user.email:
        subject = ""
        body = ""
        
        if status == "Shipped":
            subject = f"Đơn hàng #{order.id} của bạn đã được duyệt và đang giao"
            body = f"Chào {user.username},\n\nĐơn hàng #{order.id} của bạn đã được duyệt thành công và đang trên đường giao đến bạn.\nCảm ơn bạn đã mua sắm tại LUMINA!"
        elif status == "Cancelled":
            subject = f"Đơn hàng #{order.id} của bạn đã bị từ chối/hủy"
            body = f"Chào {user.username},\n\nRất tiếc, đơn hàng #{order.id} của bạn đã bị từ chối hoặc hủy bỏ. Vui lòng liên hệ hỗ trợ nếu bạn có thắc mắc.\nTrân trọng,\nLUMINA"
            
        if subject and body:
            send_notification_email(user.email, subject, body)

    return {"message": "Order status updated", "order_id": order_id, "status": status}

@router.post("/{order_id}/cancel")
def cancel_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Đơn hàng không tồn tại")
        
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền hủy đơn hàng này")
        
    if order.status not in ["Pending", "Paid"]:
        raise HTTPException(status_code=400, detail=f"Không thể hủy đơn hàng ở trạng thái: {order.status}")
        
    old_status = order.status
    order.status = "Cancelled"
    
    # Restore stock
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    for item in items:
        book = db.query(Book).filter(Book.id == item.book_id).first()
        if book:
            book.stock += item.quantity
            
    db.commit()
    
    # Send email notification
    user = db.query(User).filter(User.id == order.user_id).first()
    if user and user.email:
        subject = f"Bạn đã hủy đơn hàng #{order.id} thành công"
        body = f"Chào {user.username},\n\nBạn đã yêu cầu hủy đơn hàng #{order.id} thành công. Chúng tôi đã cập nhật lại trạng thái đơn hàng và tồn kho.\nCảm ơn bạn!"
        send_notification_email(user.email, subject, body)
        
    return {"message": "Hủy đơn hàng thành công", "order_id": order_id}

@router.post("/{order_id}/pay")
def pay_order(order_id: int, payment_data: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mock thanh toan"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Đơn hàng không tồn tại")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền thanh toán đơn hàng này")
    if order.status == "Paid":
        raise HTTPException(status_code=400, detail="Đơn hàng đã được thanh toán")
    
    valid_methods = ["COD", "Banking", "E-Wallet"]
    if payment_data.method not in valid_methods:
        raise HTTPException(status_code=400, detail=f"Phương thức không hợp lệ. Chọn: {', '.join(valid_methods)}")
    
    transaction_ref = f"LUMINA-{uuid.uuid4().hex[:8].upper()}"
    
    payment = Payment(
        order_id=order_id,
        method=payment_data.method,
        amount=order.total_amount,
        status="Completed",
        transaction_ref=transaction_ref
    )
    db.add(payment)
    order.status = "Paid"
    db.commit()
    db.refresh(payment)
    
    return {
        "message": "Thanh toán thành công!",
        "order_id": order_id,
        "transaction_ref": transaction_ref,
        "method": payment_data.method,
        "amount": order.total_amount,
        "status": "Paid"
    }

@router.get("/{order_id}/payment")
def get_payment(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Đơn hàng không tồn tại")
    
    if order.user_id != current_user.id and current_user.role not in ["admin", "staff"]:
        raise HTTPException(status_code=403, detail="Không có quyền xem thông tin thanh toán")
    
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    if not payment:
        return {"message": "Chưa thanh toán", "payment": None}
    
    return {
        "id": payment.id,
        "order_id": payment.order_id,
        "method": payment.method,
        "amount": payment.amount,
        "status": payment.status,
        "transaction_ref": payment.transaction_ref,
        "paid_at": payment.paid_at
    }
