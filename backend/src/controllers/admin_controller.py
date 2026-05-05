from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta

from src.core.database import get_db
from src.models.users import User
from src.models.books import Book
from src.models.user_action import UserAction
from src.models.orders import Order
from src.middlewares.auth import get_current_user
import os
import subprocess
import shutil

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    user_count = db.query(func.count(User.id)).scalar() or 0
    book_count = db.query(func.count(Book.id)).scalar() or 0
    action_count = db.query(func.count(UserAction.id)).scalar() or 0

    # Monthly stats – last 7 months
    now = datetime.utcnow()
    monthly_stats = []
    for i in range(6, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0)
        month_end = (month_start + timedelta(days=31)).replace(day=1)
        u_count = db.query(func.count(User.id)).filter(
            User.created_at >= month_start,
            User.created_at < month_end,
        ).scalar() or 0
        a_count = db.query(func.count(UserAction.id)).filter(
            UserAction.timestamp >= month_start,
            UserAction.timestamp < month_end,
        ).scalar() or 0
        monthly_stats.append({
            "month": month_start.strftime("%b"),
            "users": u_count,
            "actions": a_count,
        })

    # Recent activity logs (last 20 actions)
    recent_actions = db.query(UserAction).order_by(desc(UserAction.timestamp)).limit(20).all()
    logs = []
    for a in recent_actions:
        user = db.query(User).filter(User.id == a.user_id).first() if a.user_id else None
        book = db.query(Book).filter(Book.id == a.book_id).first() if a.book_id else None
        logs.append({
            "timestamp": a.timestamp.strftime("%Y-%m-%d %H:%M:%S") if a.timestamp else "Unknown",
            "event": a.action_type.replace("_", " ").title(),
            "user": user.email if user else f"session:{(a.session_id or '')[:12]}",
            "book": book.title if book else f"Book #{a.book_id}",
            "status": "success",
        })

    return {
        "active_users": user_count,
        "total_books": book_count,
        "total_actions": action_count,
        "system_health": "99.8%",
        "monthly_stats": monthly_stats,
        "recent_logs": logs,
    }

@router.get("/users")
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    users = db.query(User).order_by(desc(User.created_at)).all()
    return [{
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "role": u.role,
        "is_active": u.is_active,
        "created_at": u.created_at
    } for u in users]

@router.put("/users/{user_id}/role")
def update_user_role(user_id: int, role: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if role not in ["reader", "staff", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    user.role = role
    db.commit()
    return {"message": "Role updated successfully"}

@router.get("/stats/revenue")
def get_revenue_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    # Total revenue from Paid or Shipped orders
    total_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.status.in_(["Paid", "Shipped"])
    ).scalar() or 0
    
    # Monthly revenue trends
    now = datetime.utcnow()
    revenue_history = []
    for i in range(6, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0)
        month_end = (month_start + timedelta(days=31)).replace(day=1)
        
        m_rev = db.query(func.sum(Order.total_amount)).filter(
            Order.status.in_(["Paid", "Shipped"]),
            Order.created_at >= month_start,
            Order.created_at < month_end
        ).scalar() or 0
        
        revenue_history.append({
            "month": month_start.strftime("%b"),
            "revenue": m_rev
        })
        
    return {
        "total_revenue": total_revenue,
        "revenue_history": revenue_history
    }

@router.post("/system/backup")
def create_backup(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    backup_dir = "backups"
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
    filepath = os.path.join(backup_dir, filename)
    
    # Get DB connection info from env or use defaults
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@smartbookdb:5432/smartbook")
    
    try:
        # Construct pg_dump command
        # Note: This assumes pg_dump is available in the environment
        cmd = f"pg_dump {db_url} > {filepath}"
        subprocess.run(cmd, shell=True, check=True)
        
        # Also backup ai_config.json if it exists
        config_path = os.path.join("data", "ai_config.json")
        if os.path.exists(config_path):
            shutil.copy(config_path, filepath + ".config.json")
            
        return {"message": "Backup created successfully", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@router.get("/system/backups")
def list_backups(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    backup_dir = "backups"
    if not os.path.exists(backup_dir):
        return []
    
    backups = []
    for f in os.listdir(backup_dir):
        if f.endswith(".sql"):
            path = os.path.join(backup_dir, f)
            backups.append({
                "filename": f,
                "size": os.path.getsize(path),
                "created_at": datetime.fromtimestamp(os.path.getctime(path)).isoformat()
            })
    return sorted(backups, key=lambda x: x["created_at"], reverse=True)
