# Indian Law RAG Chatbot - User Schemas
"""
Pydantic schemas for user-related request/response validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


# =============================================================================
# User Schemas
# =============================================================================
class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr = Field(..., description="User email address")
    full_name: Optional[str] = Field(None, description="User's full name")


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(
        ..., 
        min_length=6, 
        description="Password (min 6 characters)"
    )


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """Schema for user response (excludes password, excludes superuser flag)."""
    id: UUID
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class AdminUserResponse(UserResponse):
    """Extended user response for admin-only endpoints. Includes privilege info."""
    is_superuser: bool
    
    class Config:
        from_attributes = True


class UserInDB(UserBase):
    """Schema for user stored in database."""
    id: UUID
    hashed_password: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# Token Schemas
# =============================================================================
class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str  # User ID
    exp: datetime  # Expiration time
