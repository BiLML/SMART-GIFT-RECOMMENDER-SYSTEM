from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from src.core.database import Base

class DiscountCode(Base):
    __tablename__ = "discount_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    discount_type = Column(String(20), nullable=False) # percentage, fixed
    value = Column(Float, nullable=False)
    min_order_value = Column(Float, default=0)
    max_discount_amount = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    expiration_date = Column(DateTime(timezone=True), nullable=True)
    usage_limit = Column(Integer, nullable=True) # None = unlimited
    used_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
