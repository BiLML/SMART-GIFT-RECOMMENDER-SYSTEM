from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.core.database import get_db
from src.models.users import User
from src.middlewares.auth import get_current_user
from src.services.email_service import send_notification_email
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/users", tags=["Users"])

class EmailNotificationRequest(BaseModel):
    user_ids: List[int]
    subject: str
    body: str

@router.get("/")
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện hành động này")
    
    # Chỉ lấy những người dùng có vai trò là 'reader' (khách hàng)
    users = db.query(User).filter(User.role == "reader").all()
    return [{
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "phone": u.phone,
        "role": u.role,
        "is_active": u.is_active
    } for u in users]

@router.post("/notify")
def notify_users(data: EmailNotificationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện hành động này")
    
    # Chỉ gửi cho những người dùng có vai trò là 'reader'
    users = db.query(User).filter(User.id.in_(data.user_ids), User.role == "reader").all()
    
    sent_count = 0
    errors = []
    
    for user in users:
        if not user.email:
            errors.append(f"Người dùng {user.username} không có email")
            continue
            
        success = send_notification_email(user.email, data.subject, data.body)
        if success:
            sent_count += 1
        else:
            errors.append(f"Lỗi khi gửi email cho {user.username}")
            
    return {
        "message": f"Đã gửi thành công {sent_count} email",
        "sent_count": sent_count,
        "errors": errors
    }
