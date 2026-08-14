import os
import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from shared.db import get_db
from shared.models import User
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET", "orbit-eip-secret-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
LLM_MOCK = os.getenv("LLM_MOCK", "false").lower() == "true"
DEMO_USER_NAMESPACE = uuid.UUID("86d6af5a-6c59-4f98-a9fa-90d5fe5f5a01")


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


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_demo_token(email: str, role: str = "customer") -> TokenResponse:
    user_id = str(uuid.uuid5(DEMO_USER_NAMESPACE, email.lower()))
    token = create_access_token({"sub": user_id, "email": email, "role": role, "demo": True})
    return TokenResponse(access_token=token, user_id=user_id, email=email, role=role)

def is_demo_token(payload: dict) -> bool:
    return bool(payload.get("demo")) and LLM_MOCK


# --- Shared dependency: get_current_user -------------------------------------
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        if is_demo_token(payload):
            return User(id=uuid.UUID(user_id), email=payload.get("email"), role=payload.get("role", "customer"))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# --- Routes -------------------------------------------------------------------
@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    try:
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
        
        token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
        return TokenResponse(access_token=token, user_id=str(user.id), email=user.email, role=user.role)
    except SQLAlchemyError:
        if LLM_MOCK:
            return create_demo_token(req.email, req.role or "customer")
        raise


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == req.email).first()
        if not user or not verify_password(req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
        return TokenResponse(access_token=token, user_id=str(user.id), email=user.email, role=user.role)
    except SQLAlchemyError:
        if LLM_MOCK:
            return create_demo_token(req.email)
        raise


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": str(current_user.id), "email": current_user.email, "role": current_user.role}
