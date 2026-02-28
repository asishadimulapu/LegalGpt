# Admin Dashboard - Admin-only Dependencies
"""
Dependency injection for admin-only routes.
Checks is_superuser flag on the authenticated user.
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import User
from app.api.dependencies import get_current_user


async def require_admin(
    user: User = Depends(get_current_user),
) -> User:
    """
    Dependency that enforces admin access.
    
    Raises:
        HTTPException 403 if user is not a superuser.
    """
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
