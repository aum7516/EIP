from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

import shared.models  # Ensure models are registered
from auth.routes import get_current_user, router as auth_router
from backtesting.routes import router as backtest_router
from datamart.routes import router as datamart_router
from retail_assistant.routes import router as assistant_router
from shared.db import Base, engine

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

# Create the shared schema for local/demo runs. Production can disable this and use migrations.
if os.getenv("AUTO_CREATE_SCHEMA", "true").lower() == "true":
    Base.metadata.create_all(bind=engine)


# Mount all routers. Auth is public; product modules share one auth dependency.
app.include_router(auth_router,      prefix="/auth",      tags=["Auth"])
app.include_router(backtest_router,  prefix="/backtest",  tags=["Backtesting"], dependencies=[Depends(get_current_user)])
app.include_router(datamart_router,  prefix="/datamart",  tags=["DataMart"], dependencies=[Depends(get_current_user)])
app.include_router(assistant_router, prefix="/assistant", tags=["Retail Assistant"], dependencies=[Depends(get_current_user)])

@app.get("/")
def health_check():
    return {"status": "ok", "platform": "Orbit - EIP", "version": "1.0.0"}

