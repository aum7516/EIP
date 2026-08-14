import os
import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from shared.db import get_db
from shared.models import AuthSession, User
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET", "orbit-eip-secret-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


# --- Pydantic schemas ---------------------------------------------------------
class SignupRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "customer"

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    role: str


# --- Helpers ------------------------------------------------------------------
def hash_password(password: str) -> str:
    pwd = password[:72]
    try:
        return pwd_context.hash(pwd)
    except Exception:
        import hashlib
        return "sha256$" + hashlib.sha256(pwd.encode("utf-8")).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    pwd = plain[:72]
    if hashed.startswith("sha256$"):
        import hashlib
        return "sha256$" + hashlib.sha256(pwd.encode("utf-8")).hexdigest() == hashed
    try:
        return pwd_context.verify(pwd, hashed)
    except Exception:
        import hashlib
        return "sha256$" + hashlib.sha256(pwd.encode("utf-8")).hexdigest() == hashed


def create_access_token(data: dict, jti: Optional[str] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "jti": jti or str(uuid.uuid4())})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def issue_token_for_user(user: User, db: Session) -> TokenResponse:
    token_jti = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        {"sub": str(user.id), "email": user.email, "role": user.role},
        jti=token_jti,
    )
    db.add(AuthSession(user_id=user.id, token_jti=token_jti, expires_at=expires_at))
    db.commit()
    return TokenResponse(access_token=token, user_id=str(user.id), email=user.email, role=user.role)


# --- Shared dependency: get_current_user -------------------------------------
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        token_jti = payload.get("jti")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    session = db.query(AuthSession).filter(AuthSession.token_jti == token_jti).first()
    if not session or session.revoked or session.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Session expired or revoked")
    return user


# --- Routes -------------------------------------------------------------------
@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=req.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return issue_token_for_user(user, db)


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return issue_token_for_user(user, db)


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": str(current_user.id), "email": current_user.email, "role": current_user.role}
