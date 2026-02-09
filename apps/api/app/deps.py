from fastapi import Depends, HTTPException, Request, WebSocket, status
from sqlalchemy.orm import Session
from jose import JWTError
from .database import SessionLocal
from .config import settings
from .auth import decode_token
from .models import User, UserRole


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_user_from_token(db: Session, token: str) -> User:
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.get(User, int(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    # Try to get token from cookie first (for web app)
    token = request.cookies.get(settings.cookie_name)
    
    # If no cookie, try Authorization header (for mobile app)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
    
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return _get_user_from_token(db, token)


def get_current_user_ws(websocket: WebSocket, db: Session) -> User:
    token = websocket.cookies.get(settings.cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return _get_user_from_token(db, token)


def require_role(*roles: UserRole):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return dependency
