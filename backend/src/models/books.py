from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from sqlalchemy.sql import func
from src.core.database import Base

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True, nullable=False)
    author = Column(String(150), index=True, nullable=False)
    
    # dung text luu mo ta dai cho bert
    description = Column(Text, nullable=True) 
    
    category = Column(String(100), index=True, nullable=True)
    cover_url = Column(String(255), nullable=True)
    
    # diem danh gia trung binh
    average_rating = Column(Float, default=0.0) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())