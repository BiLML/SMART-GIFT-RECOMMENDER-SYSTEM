from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from src.core.database import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    method = Column(String(50), nullable=False)  # COD, Banking, E-Wallet
    amount = Column(Float, nullable=False)
    status = Column(String(50), default="Completed", nullable=False)  # Completed, Failed, Refunded
    transaction_ref = Column(String(100), nullable=True)  # Ma giao dich
    paid_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
