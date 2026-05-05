import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import chromadb
from chromadb.utils import embedding_functions

from src.services.recommender import HybridRecommender
from src.controllers.auth_controller import router as auth_router
from src.controllers.book_controller import router as book_router
from src.controllers.admin_controller import router as admin_router
from src.controllers.orders_controller import router as orders_router
from src.controllers.interactions_controller import router as interactions_router
from src.controllers.chat_controller import router as chat_router
from src.controllers.discounts_controller import router as discounts_router
from src.controllers.users_controller import router as users_router
from src.controllers.ai_controller import router as ai_router
from src.core.database import engine, Base

from src.models import interactions, orders
from src.models import messages, payments, discounts
# 1. Create all tables on startup
Base.metadata.create_all(bind=engine)

# 2. Initialize FastAPI
app = FastAPI(title="LUMINA AI Search Engine")

# 3. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Register routers
app.include_router(auth_router)
app.include_router(book_router)
app.include_router(admin_router)
app.include_router(orders_router)
app.include_router(interactions_router)
app.include_router(chat_router)
app.include_router(discounts_router)
app.include_router(users_router)
app.include_router(ai_router)

# 5. ChromaDB semantic search
try:
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name='paraphrase-multilingual-MiniLM-L12-v2'
    )
    collection = chroma_client.get_collection(name="sach_fahasa", embedding_function=sentence_transformer_ef)
except Exception as e:
    import traceback
    print("CHROMADB INIT ERROR:")
    traceback.print_exc()
    collection = None

@app.get("/search")
def search_books(q: str, limit: int = 5):
    if collection is None:
        raise HTTPException(status_code=503, detail="ChromaDB not available")
    
    ket_qua = collection.query(
        query_texts=[q],
        n_results=limit,
        include=["metadatas", "documents", "distances"]
    )
    
    metadatas = ket_qua.get('metadatas', [[]])[0]
    chroma_ids = ket_qua.get('ids', [[]])[0]
    distances = ket_qua.get('distances', [[]])[0]
    
    # Merge the ChromaDB document ID into each result as 'id'
    # The document ID is the Fahasa product ID, which matches the PostgreSQL books.id
    for i, item in enumerate(metadatas):
        if i < len(chroma_ids):
            # ChromaDB IDs are stored as strings; convert to int to match DB
            try:
                item['id'] = int(chroma_ids[i])
            except (ValueError, TypeError):
                item['id'] = chroma_ids[i]
        # Also compute a relevance score (1 - normalized distance)
        if i < len(distances):
            item['relevance_score'] = max(0.0, 1.0 - distances[i])
    
    return {
        "thong_diep": "Tim kiem thanh cong!",
        "cau_hoi": q,
        "ket_qua": metadatas
    }

# 6. Hybrid Recommender
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))

try:
    recommender = HybridRecommender(
        vector_path=os.path.join(BASE_DIR, 'backend', 'src', 'bert-server', 'du_lieu_sach_fahasa_vector.pkl'),
        model_path=os.path.join(BASE_DIR, 'data', 'cf_model_pytorch.pth'),
        mapping_path=os.path.join(BASE_DIR, 'data', 'id_mappings.pkl')
    )
except Exception:
    recommender = None

@app.get("/recommend/{user_id}/{book_id}")
async def recommend(user_id: str, book_id: int, alpha: float = 0.5):
    if recommender is None:
        raise HTTPException(status_code=503, detail="Recommender not available")
    results = recommender.get_recommendations(user_id, book_id, alpha=alpha)
    if not results:
        raise HTTPException(status_code=404, detail="Book not found")
    return {"data": results}

# 7. Health check
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "LUMINA Backend"}

# 8. Seed demo users on startup
@app.on_event("startup")
def seed_demo_users():
    from src.core.database import SessionLocal
    from src.models.users import User
    from src.middlewares.auth import hash_password
    
    db = SessionLocal()
    try:
        # Create demo users if they don't exist
        demos = [
            {"username": "reader", "email": "reader@lumina.io", "role": "reader"},
            {"username": "staff", "email": "staff@lumina.io", "role": "staff"},
            {"username": "admin", "email": "admin@lumina.io", "role": "admin"},
        ]
        for demo in demos:
            existing = db.query(User).filter(User.email == demo["email"]).first()
            if not existing:
                user = User(
                    username=demo["username"],
                    email=demo["email"],
                    hashed_password=hash_password("demo123"),
                    role=demo["role"],
                )
                db.add(user)
        db.commit()
    except Exception as e:
        print(f"Warning: Could not seed demo users: {e}")
        db.rollback()
    finally:
        db.close()