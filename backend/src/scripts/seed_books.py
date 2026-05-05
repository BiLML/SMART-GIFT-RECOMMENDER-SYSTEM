import json
import os
import sys

# Add the project root to the python path so we can import src modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.core.database import SessionLocal, engine
from src.models.books import Book

from sqlalchemy import text
from src.core.database import Base

def clean_price(price_str):
    if not price_str:
        return 0.0
    try:
        return float(price_str.replace('.', ''))
    except ValueError:
        return 0.0

def seed():
    print("Connecting to database...")
    db = SessionLocal()
    try:
        print("Dropping tables...")
        db.execute(text("DROP TABLE IF EXISTS user_actions CASCADE"))
        db.execute(text("DROP TABLE IF EXISTS books CASCADE"))
        db.commit()
        
        print("Recreating tables...")
        Base.metadata.create_all(bind=engine)
        
        json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/du_lieu_sach_fahasa.json'))
        if not os.path.exists(json_path):
            json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../data/du_lieu_sach_fahasa.json'))
        print(f"Reading data from {json_path}")
        
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        print(f"Loaded {len(data)} books. Seeding...")
        
        books_to_insert = []
        seen_ids = set()
        
        for item in data:
            book_id = int(item.get('id', 0))
            if book_id in seen_ids:
                continue
            seen_ids.add(book_id)
            
            book = Book(
                id=book_id,
                title=item.get('title', 'Unknown Title'),
                author="Unknown Author",
                description=item.get('description', ''),
                category="General",
                cover_url="https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop",
                price=clean_price(item.get('price', '')),
                average_rating=0.0
            )
            books_to_insert.append(book)
            
            if len(books_to_insert) >= 500:
                db.bulk_save_objects(books_to_insert)
                db.commit()
                books_to_insert = []
                
        if books_to_insert:
            db.bulk_save_objects(books_to_insert)
            db.commit()
            
        print("Database seeded successfully!")
        
    except Exception as e:
        print("Error seeding database!")
        if hasattr(e, 'orig'):
            print(f"Original error: {e.orig}")
        else:
            print(f"Error type: {type(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
