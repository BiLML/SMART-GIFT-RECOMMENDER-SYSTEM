import json
import os
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from src.core.database import get_db
from src.models.users import User
from src.middlewares.auth import get_current_user
import uuid
import random

router = APIRouter(prefix="/admin/ai", tags=["AI Management"])

# Path to the AI config file
CONFIG_PATH = os.path.join("data", "ai_config.json")

# Ensure the data directory exists
os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)

class AIConfigUpdate(BaseModel):
    alpha: float
    top_n: int

class AIRetrainResponse(BaseModel):
    message: str
    new_version: str
    last_retrained: str

def get_default_config() -> Dict[str, Any]:
    return {
        "alpha": 0.5,
        "top_n": 10,
        "version": "v1.0.0",
        "last_retrained": datetime.now().isoformat()
    }

def load_config() -> Dict[str, Any]:
    if not os.path.exists(CONFIG_PATH):
        config = get_default_config()
        save_config(config)
        return config
    try:
        with open(CONFIG_PATH, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return get_default_config()

def save_config(config: Dict[str, Any]):
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=4)

@router.get("/config")
def get_ai_config(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return load_config()

@router.put("/config")
def update_ai_config(data: AIConfigUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    if not (0 <= data.alpha <= 1):
        raise HTTPException(status_code=400, detail="Alpha must be between 0 and 1")
    
    config = load_config()
    config["alpha"] = data.alpha
    config["top_n"] = data.top_n
    save_config(config)
    return config

@router.get("/performance")
def get_ai_performance(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    # Mocking AI performance metrics as discussed
    metrics = {
        "rmse": round(random.uniform(0.8, 1.2), 3),
        "precision_at_k": round(random.uniform(0.65, 0.85), 3),
        "recall_at_k": round(random.uniform(0.55, 0.75), 3),
        "f1_score": round(random.uniform(0.60, 0.80), 3),
        "training_loss": round(random.uniform(0.2, 0.5), 3),
        "validation_loss": round(random.uniform(0.3, 0.6), 3)
    }
    
    history = []
    for i in range(10):
        history.append({
            "epoch": i + 1,
            "loss": round(max(0.1, 0.8 - (i * 0.05) + random.uniform(-0.02, 0.02)), 4),
            "val_loss": round(max(0.15, 0.85 - (i * 0.04) + random.uniform(-0.02, 0.02)), 4)
        })

    return {
        "current_metrics": metrics,
        "training_history": history
    }

@router.post("/retrain", response_model=AIRetrainResponse)
def retrain_ai_model(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    config = load_config()
    # Simulate a version bump and date update
    current_version = config.get("version", "v1.0.0")
    try:
        v_parts = current_version.replace("v", "").split(".")
        new_minor = int(v_parts[1]) + 1
        new_version = f"v{v_parts[0]}.{new_minor}.0"
    except Exception:
        new_version = f"v1.{random.randint(1,100)}.0"
        
    now_str = datetime.now().isoformat()
    config["version"] = new_version
    config["last_retrained"] = now_str
    save_config(config)
    
    return AIRetrainResponse(
        message="Mô hình AI đã được huấn luyện lại thành công.",
        new_version=new_version,
        last_retrained=now_str
    )
