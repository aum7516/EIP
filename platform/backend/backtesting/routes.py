import uuid
import io
import os
import threading
import yfinance as yf
import pandas as pd
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from shared.db import get_db
from shared.models import BacktestRun, BacktestMetrics, Strategy, User
from auth.routes import get_current_user
from backtesting.engine import run_backtest
from backtesting.strategies import get_all_strategies, get_strategy

router = APIRouter()

# In-memory run store for async status (replace with Redis in prod)
_run_store: dict = {}

PRELOADED_TICKERS = ["AAPL", "TSLA", "INFY.NS"]
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "seed")


# --- Schemas -----------------------------------------------------------------
class BacktestRequest(BaseModel):
    ticker: str
    strategy_id: str
    start_date: str
    end_date: str
    split_date: Optional[str] = None
    parameters: Optional[dict] = {}


# --- Helpers -----------------------------------------------------------------
def _load_ohlcv(ticker: str) -> pd.DataFrame:
    """Load OHLCV: try preloaded CSV first, fall back to yfinance."""
    csv_path = os.path.join(DATA_DIR, f"{ticker.replace('.', '_')}_historical.csv")
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path, parse_dates=["Date"], index_col="Date")
    else:
        df = yf.download(ticker, period="5y", progress=False)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for ticker: {ticker}")
    df.columns = [c.lower().replace(" ", "_") for c in df.columns]
    if "adj_close" not in df.columns and "adj close" in df.columns:
        df.rename(columns={"adj close": "adj_close"}, inplace=True)
    df.sort_index(inplace=True)
    return df


def _run_async(run_id: str, ticker: str, strategy_id: str, params: dict,
               start_date: str, end_date: str, split_date: str, db_url: str):
    """Background thread: runs backtest and saves results."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        df = _load_ohlcv(ticker)
        result = run_backtest(df, strategy_id, params, start_date, end_date, split_date)
        
        run = db.query(BacktestRun).filter(BacktestRun.id == uuid.UUID(run_id)).first()
        if run:
            run.status = "completed"
            run.bias_check_passed = result["bias_check_passed"]
            db.commit()

        metrics = BacktestMetrics(
            run_id=uuid.UUID(run_id),
            cagr=result["metrics"]["cagr"],
            sharpe_ratio=result["metrics"]["sharpe_ratio"],
            max_drawdown=result["metrics"]["max_drawdown"],
            win_rate=result["metrics"]["win_rate"],
            equity_curve=result["equity_curve"]
        )
        db.add(metrics)
        db.commit()
        _run_store[run_id] = {"status": "completed", "result": result}

    except Exception as e:
        run = db.query(BacktestRun).filter(BacktestRun.id == uuid.UUID(run_id)).first()
        if run:
            run.status = "failed"
            db.commit()
        _run_store[run_id] = {"status": "failed", "error": str(e)}
    finally:
        db.close()


# --- Routes ------------------------------------------------------------------
@router.get("/strategies")
def list_strategies():
    return get_all_strategies()

@router.get("/tickers")
def list_tickers():
    return {"preloaded": PRELOADED_TICKERS}

@router.post("/run")
def start_backtest(req: BacktestRequest, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    strategy_def = get_strategy(req.strategy_id)
    if not strategy_def:
        raise HTTPException(status_code=400, detail="Unknown strategy_id")

    # Merge default params with user overrides
    default_params = {k: v["default"] for k, v in strategy_def.get("parameters", {}).items()}
    merged_params = {**default_params, **(req.parameters or {})}

    # Persist strategy if not exists
    strat = Strategy(name=strategy_def["name"], type="preset",
                     parameters=merged_params, created_by=current_user.id)
    db.add(strat)
    db.commit()
    db.refresh(strat)

    run = BacktestRun(
        strategy_id=strat.id,
        ticker=req.ticker,
        start_date=req.start_date,
        end_date=req.end_date,
        split_date=req.split_date,
        status="running"
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    run_id = str(run.id)
    _run_store[run_id] = {"status": "running"}

    db_url = os.getenv("DATABASE_URL", "postgresql://localhost/eip_db")
    t = threading.Thread(target=_run_async, args=(
        run_id, req.ticker, req.strategy_id, merged_params,
        req.start_date, req.end_date, req.split_date or req.end_date, db_url
    ), daemon=True)
    t.start()

    return {"run_id": run_id, "status": "running"}


@router.get("/results/{run_id}")
def get_results(run_id: str, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    store = _run_store.get(run_id)
    if not store:
        # Try DB
        run = db.query(BacktestRun).filter(BacktestRun.id == uuid.UUID(run_id)).first()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        metrics = db.query(BacktestMetrics).filter(BacktestMetrics.run_id == run.id).first()
        if not metrics:
            return {"run_id": run_id, "status": run.status}
        return {
            "run_id": run_id,
            "status": run.status,
            "bias_check_passed": run.bias_check_passed,
            "metrics": {
                "cagr": float(metrics.cagr or 0),
                "sharpe_ratio": float(metrics.sharpe_ratio or 0),
                "max_drawdown": float(metrics.max_drawdown or 0),
                "win_rate": float(metrics.win_rate or 0),
            },
            "equity_curve": metrics.equity_curve or []
        }

    if store["status"] == "running":
        return {"run_id": run_id, "status": "running"}
    if store["status"] == "failed":
        return {"run_id": run_id, "status": "failed", "error": store.get("error")}

    result = store["result"]
    run = db.query(BacktestRun).filter(BacktestRun.id == uuid.UUID(run_id)).first()
    return {
        "run_id": run_id,
        "status": "completed",
        "bias_check_passed": result["bias_check_passed"],
        "metrics": result["metrics"],
        "equity_curve": result["equity_curve"],
        "trades_sample": result.get("trades", [])
    }


@router.get("/history")
def get_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    runs = db.query(BacktestRun).order_by(BacktestRun.created_at.desc()).limit(20).all()
    result = []
    for run in runs:
        metrics = db.query(BacktestMetrics).filter(BacktestMetrics.run_id == run.id).first()
        result.append({
            "run_id": str(run.id),
            "ticker": run.ticker,
            "status": run.status,
            "bias_check_passed": run.bias_check_passed,
            "created_at": str(run.created_at),
            "cagr": float(metrics.cagr) if metrics and metrics.cagr else None,
            "sharpe_ratio": float(metrics.sharpe_ratio) if metrics and metrics.sharpe_ratio else None,
        })
    return result
