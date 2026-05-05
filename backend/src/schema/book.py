from pydantic import BaseModel
from typing import Optional, List

class BookCreate(BaseModel):
    title: str
    author: str
    description: Optional[str] = None
    category: Optional[str] = None
    cover_url: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = 10

class BookResponse(BaseModel):
    id: int
    title: str
    author: str
    description: Optional[str] = None
    category: Optional[str] = None
    cover_url: Optional[str] = None
    price: Optional[float] = None
    average_rating: float = 0.0
    stock: int = 10

    class Config:
        from_attributes = True

class ActionTrack(BaseModel):
    session_id: str
    book_id: int
    action_type: str = "view_detail"
    user_id: Optional[int] = None

class SearchHistoryCreate(BaseModel):
    query: str

class SearchHistoryResponse(BaseModel):
    id: int
    query: str
    created_at: str

    class Config:
        from_attributes = True
