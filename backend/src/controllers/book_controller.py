from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional

from src.core.database import get_db
from src.models.books import Book
from src.models.interactions import SearchHistory
from src.models.user_action import UserAction
from src.models.users import User
from src.schema.book import BookCreate, BookResponse, ActionTrack, SearchHistoryCreate, SearchHistoryResponse
from src.middlewares.auth import get_current_user

router = APIRouter(tags=["Books"])


@router.get("/books", response_model=List[BookResponse])
def list_books(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    books = db.query(Book).offset(skip).limit(limit).all()
    return books


@router.get("/books/{book_id}", response_model=BookResponse)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.post("/books", response_model=BookResponse)
def create_book(
    data: BookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("staff", "admin"):
        raise HTTPException(status_code=403, detail="Staff or Admin only")
    book = Book(
        title=data.title,
        author=data.author,
        description=data.description,
        category=data.category,
        cover_url=data.cover_url,
        price=data.price,
        stock=data.stock if data.stock is not None else 10
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.put("/books/{book_id}", response_model=BookResponse)
def update_book(
    book_id: int,
    data: BookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("staff", "admin"):
        raise HTTPException(status_code=403, detail="Staff or Admin only")
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    book.title = data.title
    book.author = data.author
    book.description = data.description
    book.category = data.category
    book.cover_url = data.cover_url
    book.price = data.price
    if data.stock is not None:
        book.stock = data.stock
    db.commit()
    db.refresh(book)
    return book


@router.delete("/books/{book_id}")
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("staff", "admin"):
        raise HTTPException(status_code=403, detail="Staff or Admin only")
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    db.delete(book)
    db.commit()
    return {"message": "Book deleted successfully"}


@router.post("/actions/track")
def track_action(
    data: ActionTrack,
    db: Session = Depends(get_db),
):
    action = UserAction(
        session_id=data.session_id,
        book_id=data.book_id,
        action_type=data.action_type,
        user_id=data.user_id if hasattr(data, "user_id") else None,
    )
    db.add(action)
    db.commit()
    return {"message": "Action tracked successfully"}


@router.get("/profile/stats")
def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return real reading stats for the logged-in user."""
    action_count = db.query(func.count(UserAction.id)).filter(
        UserAction.user_id == current_user.id
    ).scalar() or 0

    # Unique books viewed
    books_viewed = db.query(func.count(func.distinct(UserAction.book_id))).filter(
        UserAction.user_id == current_user.id,
        UserAction.action_type == "view_detail",
    ).scalar() or 0

    # Category distribution
    category_counts = (
        db.query(Book.category, func.count(UserAction.id).label("cnt"))
        .join(UserAction, UserAction.book_id == Book.id)
        .filter(UserAction.user_id == current_user.id, Book.category.isnot(None))
        .group_by(Book.category)
        .order_by(desc("cnt"))
        .limit(5)
        .all()
    )

    total_cat = sum(r.cnt for r in category_counts) or 1
    reading_preferences = [
        {"category": r.category, "value": round(r.cnt / total_cat * 100)}
        for r in category_counts
    ]

    return {
        "books_viewed": books_viewed,
        "total_actions": action_count,
        "reading_preferences": reading_preferences,
        "member_since": str(current_user.created_at) if current_user.created_at else None,
    }

@router.get("/search-history", response_model=List[SearchHistoryResponse])
def get_search_history(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    history = (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == current_user.id)
        .order_by(desc(SearchHistory.created_at))
        .limit(limit)
        .all()
    )
    # Format dates
    res = []
    for h in history:
        res.append({
            "id": h.id,
            "query": h.query,
            "created_at": str(h.created_at)
        })
    return res


@router.post("/search-history")
def save_search_history(
    data: SearchHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only save if it's a new query (not the immediate previous one) to avoid spam
    last_search = (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == current_user.id)
        .order_by(desc(SearchHistory.created_at))
        .first()
    )
    if last_search and last_search.query == data.query:
        return {"message": "Already saved"}

    history = SearchHistory(user_id=current_user.id, query=data.query)
    db.add(history)
    db.commit()
    return {"message": "Search history saved"}

@router.get("/inventory/stats")
def get_inventory_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("staff", "admin"):
        raise HTTPException(status_code=403, detail="Staff or Admin only")
    
    total_books = db.query(func.count(Book.id)).scalar() or 0
    total_stock = db.query(func.sum(Book.stock)).scalar() or 0
    total_value = db.query(func.sum(Book.stock * Book.price)).scalar() or 0
    
    low_stock_books = db.query(Book).filter(Book.stock < 5).all()
    
    category_stats = (
        db.query(Book.category, func.count(Book.id), func.sum(Book.stock))
        .group_by(Book.category)
        .all()
    )
    
    return {
        "total_books": total_books,
        "total_stock": total_stock,
        "total_value": total_value,
        "low_stock_count": len(low_stock_books),
        "low_stock_items": [{
            "id": b.id,
            "title": b.title,
            "stock": b.stock
        } for b in low_stock_books],
        "category_distribution": [{
            "category": c[0] or "Uncategorized",
            "book_count": c[1],
            "stock_count": c[2]
        } for c in category_stats]
    }
