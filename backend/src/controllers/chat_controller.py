from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_
from pydantic import BaseModel
from src.core.database import get_db
from src.models.messages import Conversation, Message
from src.models.users import User
from src.controllers.auth_controller import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

class ConversationCreate(BaseModel):
    subject: str = "Hỗ trợ chung"

class MessageCreate(BaseModel):
    content: str

# --- Conversations ---

@router.post("/conversations")
def create_conversation(data: ConversationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Reader tao cuoc hoi thoai moi, tu dong gan staff ngau nhien"""
    if current_user.role not in ["reader"]:
        raise HTTPException(status_code=400, detail="Chỉ reader mới có thể tạo cuộc hội thoại hỗ trợ")

    # Tim staff co it hoi thoai nhat de phan cong
    staff_list = db.query(User).filter(User.role == "staff", User.is_active == True).all()
    if not staff_list:
        # Neu khong co staff, tim admin
        staff_list = db.query(User).filter(User.role == "admin", User.is_active == True).all()

    assigned_staff = None
    if staff_list:
        # Gan staff it hoi thoai nhat
        min_convos = float('inf')
        for s in staff_list:
            count = db.query(Conversation).filter(
                Conversation.staff_id == s.id,
                Conversation.status == "open"
            ).count()
            if count < min_convos:
                min_convos = count
                assigned_staff = s

    conv = Conversation(
        reader_id=current_user.id,
        staff_id=assigned_staff.id if assigned_staff else None,
        subject=data.subject,
        status="open"
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    return {
        "id": conv.id,
        "reader_id": conv.reader_id,
        "staff_id": conv.staff_id,
        "staff_name": assigned_staff.username if assigned_staff else None,
        "subject": conv.subject,
        "status": conv.status,
        "created_at": conv.created_at
    }

@router.get("/conversations")
def get_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lay danh sach hoi thoai - reader thay cua minh, staff thay duoc gan"""
    if current_user.role == "reader":
        convos = db.query(Conversation).filter(
            Conversation.reader_id == current_user.id
        ).order_by(desc(Conversation.updated_at)).all()
    else:
        # Staff/admin thay tat ca duoc gan cho minh
        convos = db.query(Conversation).filter(
            or_(
                Conversation.staff_id == current_user.id,
                Conversation.staff_id == None  # Chua assign
            )
        ).order_by(desc(Conversation.updated_at)).all()

    result = []
    for c in convos:
        reader = db.query(User).filter(User.id == c.reader_id).first()
        staff = db.query(User).filter(User.id == c.staff_id).first() if c.staff_id else None

        # Dem tin nhan chua doc
        unread_count = db.query(Message).filter(
            Message.conversation_id == c.id,
            Message.sender_id != current_user.id,
            Message.is_read == False
        ).count()

        # Lay tin nhan cuoi cung
        last_msg = db.query(Message).filter(
            Message.conversation_id == c.id
        ).order_by(desc(Message.created_at)).first()

        result.append({
            "id": c.id,
            "reader_id": c.reader_id,
            "reader_name": reader.username if reader else "Unknown",
            "staff_id": c.staff_id,
            "staff_name": staff.username if staff else "Chưa phân công",
            "subject": c.subject,
            "status": c.status,
            "unread_count": unread_count,
            "last_message": last_msg.content[:50] if last_msg else None,
            "last_message_at": last_msg.created_at if last_msg else c.created_at,
            "created_at": c.created_at
        })

    return result

# --- Messages ---

@router.post("/conversations/{conversation_id}/messages")
def send_message(conversation_id: int, data: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Gui tin nhan trong cuoc hoi thoai"""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Cuộc hội thoại không tồn tại")

    # Kiem tra quyen truy cap
    if current_user.role == "reader" and conv.reader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền gửi tin nhắn trong cuộc hội thoại này")
    if current_user.role in ["staff", "admin"] and conv.staff_id != current_user.id:
        # Neu staff chua duoc assign, tu nhan
        if conv.staff_id is None:
            conv.staff_id = current_user.id
        else:
            raise HTTPException(status_code=403, detail="Cuộc hội thoại này đã được gán cho nhân viên khác")

    if conv.status == "closed":
        raise HTTPException(status_code=400, detail="Cuộc hội thoại đã đóng")

    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được trống")

    msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=data.content.strip()
    )
    db.add(msg)
    conv.updated_at = msg.created_at
    db.commit()
    db.refresh(msg)

    return {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "sender_id": msg.sender_id,
        "sender_name": current_user.username,
        "content": msg.content,
        "is_read": msg.is_read,
        "created_at": msg.created_at
    }

@router.get("/conversations/{conversation_id}/messages")
def get_messages(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lay lich su tin nhan trong cuoc hoi thoai"""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Cuộc hội thoại không tồn tại")

    # Kiem tra quyen truy cap
    if current_user.role == "reader" and conv.reader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền xem cuộc hội thoại này")
    if current_user.role in ["staff", "admin"] and conv.staff_id != current_user.id and conv.staff_id is not None:
        raise HTTPException(status_code=403, detail="Không có quyền xem cuộc hội thoại này")

    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at).all()

    # Danh dau da doc cho tin nhan cua doi phuong
    for msg in messages:
        if msg.sender_id != current_user.id and not msg.is_read:
            msg.is_read = True
    db.commit()

    result = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        result.append({
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": sender.username if sender else "Unknown",
            "content": m.content,
            "is_read": m.is_read,
            "created_at": m.created_at
        })

    return result

@router.put("/conversations/{conversation_id}/close")
def close_conversation(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Staff/Admin dong cuoc hoi thoai"""
    if current_user.role not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Chỉ nhân viên mới có thể đóng cuộc hội thoại")

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Cuộc hội thoại không tồn tại")

    conv.status = "closed"
    db.commit()
    return {"message": "Đã đóng cuộc hội thoại", "id": conv.id}
