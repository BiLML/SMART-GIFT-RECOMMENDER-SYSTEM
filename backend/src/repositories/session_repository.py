from sqlalchemy.orm import Session
from models.user_action import UserAction

class SessionRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def get_all_sessions(self):
        actions = self.db.query(UserAction).all()
        return actions