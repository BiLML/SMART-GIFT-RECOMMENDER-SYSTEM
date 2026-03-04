from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from src.core.database import Base

class UserAction(Base):
    __tablename__ = "user_actions"

    id = Column(Integer, primary_key=True, index=True)
    # khoa chinh
    session_id = Column(String(255), index=True, nullable=False) # theo doi khach chua dang nhap, dung cho ma tran chuyen doi
    # khoa ngoai
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # khoa ngoai
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    
    # hanh dong cua khach
    action_type = Column(String(50), nullable=False, default='view_detail')
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)