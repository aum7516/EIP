from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from shared.db import engine, Base
import shared.models  # Ensure models are registered

# Automatically initialize tables on startup
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Database schema auto-creation notice: {e}")

from auth.routes import router as auth_router
from backtesting.routes import router as backtest_router
from datamart.routes import router as datamart_router
from retail_assistant.routes import router as assistant_router

app = FastAPI(
    title="Orbit - EIP Backend",
    description="Enterprise Intelligence Platform API - Unified Backtesting, DataMart & AI Assistant",
    version="1.0.0",
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(auth_router,      prefix="/auth",      tags=["Auth"])
app.include_router(backtest_router,  prefix="/backtest",  tags=["Backtesting"])
app.include_router(datamart_router,  prefix="/datamart",  tags=["DataMart"])
app.include_router(assistant_router, prefix="/assistant", tags=["Retail Assistant"])

@app.get("/")
def health_check():
    return {"status": "ok", "platform": "Orbit - EIP", "version": "1.0.0"}

