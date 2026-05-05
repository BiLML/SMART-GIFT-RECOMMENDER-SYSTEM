from pydantic import BaseModel, model_validator
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str

    @model_validator(mode='after')
    def check_email_or_phone(self):
        if not self.email and not self.phone:
            raise ValueError('Vui lòng cung cấp email hoặc số điện thoại')
        return self

class UserLogin(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str

    @model_validator(mode='after')
    def check_email_or_phone(self):
        if not self.email and not self.phone:
            raise ValueError('Vui lòng cung cấp email hoặc số điện thoại')
        return self

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserProfile(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
