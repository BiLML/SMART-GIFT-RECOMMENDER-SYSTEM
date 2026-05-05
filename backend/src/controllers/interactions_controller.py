from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List
from pydantic import BaseModel
from src.core.database import get_db
from src.models.interactions import Review, Favorite
from src.models.books import Book
from src.models.users import User
from src.controllers.auth_controller import get_current_user

router = APIRouter(prefix="/interactions", tags=["interactions"])

class ReviewCreate(BaseModel):
    rating: int
    comment: str = None

@router.post("/books/{book_id}/reviews")
def create_review(book_id: int, review_data: ReviewCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    if not (1 <= review_data.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
    # Check if user already reviewed
    existing_review = db.query(Review).filter(Review.user_id == current_user.id, Review.book_id == book_id).first()
    if existing_review:
        existing_review.rating = review_data.rating
        existing_review.comment = review_data.comment
    else:
        new_review = Review(
            user_id=current_user.id,
            book_id=book_id,
            rating=review_data.rating,
            comment=review_data.comment
        )
        db.add(new_review)
        
    db.commit()
    
    # Recalculate book average rating
    avg_rating = db.query(func.avg(Review.rating)).filter(Review.book_id == book_id).scalar()
    book.average_rating = float(avg_rating) if avg_rating else 0.0
    db.commit()
    
    return {"message": "Review submitted successfully", "average_rating": book.average_rating}

@router.get("/books/{book_id}/reviews")
def get_reviews(book_id: int, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.book_id == book_id).order_by(desc(Review.created_at)).all()
    result = []
    for r in reviews:
        user = db.query(User).filter(User.id == r.user_id).first()
        result.append({
            "id": r.id,
            "user_id": r.user_id,
            "username": user.username if user else "Anonymous",
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at
        })
    return result

@router.put("/reviews/{review_id}")
def update_review(review_id: int, review_data: ReviewCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this review")
        
    if not (1 <= review_data.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
    review.rating = review_data.rating
    review.comment = review_data.comment
    db.commit()
    
    # Recalculate book average rating
    book = db.query(Book).filter(Book.id == review.book_id).first()
    if book:
        avg_rating = db.query(func.avg(Review.rating)).filter(Review.book_id == book.id).scalar()
        book.average_rating = float(avg_rating) if avg_rating else 0.0
        db.commit()
        
    return {"message": "Review updated successfully"}

@router.delete("/reviews/{review_id}")
def delete_review(review_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Allow user to delete their own review or admin/staff to moderate
    if review.user_id != current_user.id and current_user.role not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Not authorized to delete this review")
        
    book_id = review.book_id
    db.delete(review)
    db.commit()
    
    # Recalculate book average rating
    book = db.query(Book).filter(Book.id == book_id).first()
    if book:
        avg_rating = db.query(func.avg(Review.rating)).filter(Review.book_id == book_id).scalar()
        book.average_rating = float(avg_rating) if avg_rating else 0.0
        db.commit()
        
    return {"message": "Review deleted successfully"}

@router.post("/books/{book_id}/favorite")
def toggle_favorite(book_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    favorite = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.book_id == book_id).first()
    
    if favorite:
        db.delete(favorite)
        db.commit()
        return {"message": "Removed from favorites", "is_favorite": False}
    else:
        new_fav = Favorite(user_id=current_user.id, book_id=book_id)
        db.add(new_fav)
        db.commit()
        return {"message": "Added to favorites", "is_favorite": True}

@router.get("/books/{book_id}/favorite/status")
def check_favorite_status(book_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    favorite = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.book_id == book_id).first()
    return {"is_favorite": bool(favorite)}

@router.get("/favorites")
def get_my_favorites(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    favorites = db.query(Favorite).filter(Favorite.user_id == current_user.id).order_by(desc(Favorite.created_at)).all()
    result = []
    for f in favorites:
        book = db.query(Book).filter(Book.id == f.book_id).first()
        if book:
            result.append({
                "id": book.id,
                "title": book.title,
                "author": book.author,
                "cover_url": book.cover_url,
                "price": book.price,
                "average_rating": book.average_rating
            })
    return result
