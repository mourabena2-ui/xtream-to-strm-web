from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from app.core import security
from app.core.config import settings

router = APIRouter()

@router.post("/login/access-token")
def login_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    # Simple hardcoded auth for now as per config
    if form_data.username != settings.ADMIN_USER or form_data.password != settings.ADMIN_PASS:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            form_data.username, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
