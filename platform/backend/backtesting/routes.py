import uuid
import io
import os
import threading
import yfinance as yf
import pandas as pd
from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from shared.db import SessionLocal, get_db
from shared.models import BacktestRun, BacktestMetrics, BacktestData, Strategy, User
from auth.routes import get_current_user
from backtesting.engine import run_backtest
from backtesting.strategies import get_all_strategies, get_strategy

router = APIRouter()

# In-memory run store for async execution status
_run_store: dict = {}

def _resolve_data_dir() -> str:
    dir1 = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "seed"))
    if os.path.exists(dir1): return dir1
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "seed"))

PRELOADED_TICKERS = [
    "RELIANCE.NS",
    "TCS.NS",
    "HDFCBANK.NS",
    "INFY.NS",
    "ICICIBANK.NS",
    "SBIN.NS",
    "BHARTIARTL.NS",
    "AAPL",
    "TSLA"
]

DATA_DIR = _resolve_data_dir()


# --- Schemas -----------------------------------------------------------------
class BacktestRequest(BaseModel):
    ticker: str
    strategy_id: str
    start_date: str
    end_date: str
    split_date: Optional[str] = None
    parameters: Optional[dict] = {}


# --- Helpers -----------------------------------------------------------------
def _get_all_available_tickers() -> List[str]:
    tickers = set(PRELOADED_TICKERS)
    if os.path.exists(DATA_DIR):
        for f in os.listdir(DATA_DIR):
            if f.endswith("_historical.csv"):
                t = f.replace("_historical.csv", "").replace("_", ".")
                tickers.add(t)
    return sorted(list(tickers))


def _process_ohlcv_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Helper to handle MultiIndex headers, normalize column names, and parse Date Index."""
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    # If row 0 is empty date or ticker header row from yfinance CSV export, drop it
    if not df.empty and (df.iloc[0, 0] is None or pd.isna(df.iloc[0, 0]) or str(df.iloc[0, 0]).strip() == ""):
        df = df.iloc[1:].copy()

    # If Date is index, reset so we can process it as column
    if "Date" in df.index.names or "date" in df.index.names or df.index.name is not None:
        df = df.reset_index()

    # Normalize column names
    df.columns = [str(c).lower().replace(" ", "_") for c in df.columns]

    # Identify Date column
    date_col = next((c for c in ["date", "datetime", "timestamp"] if c in df.columns), None)
    if not date_col:
        raise HTTPException(status_code=400, detail="Data must contain a 'Date' column.")

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce", utc=True)
    df.dropna(subset=[date_col], inplace=True)
    df[date_col] = df[date_col].dt.tz_localize(None)

    df.set_index(date_col, inplace=True)
    df = df[~df.index.duplicated(keep="last")]
    df.sort_index(inplace=True)

    # Coerce price and volume columns to float
    for col in ["close", "open", "high", "low", "adj_close", "volume"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Ensure required columns & numeric types
    if "close" not in df.columns and "adj_close" in df.columns:
        df["close"] = df["adj_close"]
    elif "close" not in df.columns:
        raise HTTPException(status_code=400, detail="Missing mandatory 'Close' price column.")

    df.dropna(subset=["close"], inplace=True)

    return df




def _load_ohlcv(ticker: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> pd.DataFrame:
    """Load OHLCV: load local CSV if available; otherwise download via yfinance with fallback suffixes like .NS."""
    clean_ticker = ticker.strip().upper()
    sanitized_ticker = clean_ticker.replace(".", "_")
    csv_path = os.path.join(DATA_DIR, f"{sanitized_ticker}_historical.csv")
    csv_df = None

    if os.path.exists(csv_path):
        try:
            raw_csv = pd.read_csv(csv_path)
            csv_df = _process_ohlcv_dataframe(raw_csv)
            if start_date and end_date:
                s_dt = pd.to_datetime(start_date)
                e_dt = pd.to_datetime(end_date)
                sub_slice = csv_df[(csv_df.index >= s_dt) & (csv_df.index <= e_dt)]
                if not sub_slice.empty:
                    return csv_df
            else:
                return csv_df
        except Exception as e:
            print(f"Warning loading CSV for {ticker}: {e}")

    # Fallback candidates: try ticker as typed first, then add .NS or .BO for Indian stocks
    candidate_tickers = [clean_ticker]
    if not clean_ticker.endswith(".NS") and not clean_ticker.endswith(".BO"):
        candidate_tickers.append(f"{clean_ticker}.NS")
        candidate_tickers.append(f"{clean_ticker}.BO")

    for t in candidate_tickers:
        try:
            if start_date and end_date:
                df_yf = yf.download(t, start=start_date, end=end_date, progress=False)
            else:
                df_yf = yf.download(t, period="5y", progress=False)

            if not df_yf.empty:
                processed_yf = _process_ohlcv_dataframe(df_yf)
                if csv_df is not None and not csv_df.empty:
                    combined = pd.concat([csv_df, processed_yf])
                    combined = combined[~combined.index.duplicated(keep="last")].sort_index()
                    return combined
                return processed_yf
        except Exception as e:
            print(f"Warning downloading yfinance for {t}: {e}")

    if csv_df is not None:
        return csv_df

    raise HTTPException(status_code=404, detail=f"No market data found for ticker: {ticker}. For Indian stocks (e.g. MRF, Reliance), try entering with '.NS' suffix (e.g. {clean_ticker}.NS).")



def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return pd.to_datetime(value).date()


def _run_async(run_id: str, ticker: str, strategy_id: str, params: dict,
               start_date: str, end_date: str, split_date: Optional[str]):
    """Background thread: runs backtest engine and persists metrics to DB."""
    db = SessionLocal()
    try:
        df = _load_ohlcv(ticker, start_date, end_date)
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
    return {"preloaded": _get_all_available_tickers()}


@router.get("/ticker-info/{ticker}")
def get_ticker_info(ticker: str):
    try:
        df = _load_ohlcv(ticker)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No market data found for ticker: {ticker}")
        return {
            "ticker": ticker,
            "start_date": str(df.index.min().date()),
            "end_date": str(df.index.max().date()),
            "row_count": len(df),
            "is_preloaded": ticker in PRELOADED_TICKERS
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload")
async def upload_ohlcv_csv(
    file: UploadFile = File(...),
    custom_ticker: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload custom OHLCV CSV file, validate schema, store in seed dir & backtest_data DB table."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    # Normalize columns
    df.columns = [str(c).lower().replace(" ", "_") for c in df.columns]
    
    date_col = next((c for c in ["date", "datetime", "timestamp"] if c in df.columns), None)
    if not date_col:
        raise HTTPException(status_code=400, detail="Missing required 'Date' column in CSV.")

    if "close" not in df.columns and "adj_close" not in df.columns:
        raise HTTPException(status_code=400, detail="Missing required 'Close' price column in CSV.")

    df[date_col] = pd.to_datetime(df[date_col])
    df.sort_values(by=date_col, inplace=True)

    ticker = (custom_ticker or os.path.splitext(file.filename)[0]).upper().replace(" ", "_")
    sanitized_filename = f"{ticker.replace('.', '_')}_historical.csv"
    os.makedirs(DATA_DIR, exist_ok=True)
    file_path = os.path.join(DATA_DIR, sanitized_filename)

    # Standardize column headers for CSV output
    standard_df = pd.DataFrame()
    standard_df["Date"] = df[date_col].dt.strftime("%Y-%m-%d")
    standard_df["Open"] = df.get("open", df.get("close", 0.0))
    standard_df["High"] = df.get("high", df.get("close", 0.0))
    standard_df["Low"] = df.get("low", df.get("close", 0.0))
    standard_df["Close"] = df.get("close", df.get("adj_close", 0.0))
    standard_df["Adj Close"] = df.get("adj_close", standard_df["Close"])
    standard_df["Volume"] = df.get("volume", 0)

    standard_df.to_csv(file_path, index=False)

    # Persist entries into backtest_data DB table
    try:
        # Delete existing data for this ticker to overwrite cleanly
        db.query(BacktestData).filter(BacktestData.ticker == ticker).delete()
        
        db_records = []
        for _, row in standard_df.iterrows():
            rec = BacktestData(
                ticker=ticker,
                date=date.fromisoformat(row["Date"]),
                open=float(row["Open"]),
                high=float(row["High"]),
                low=float(row["Low"]),
                close=float(row["Close"]),
                adj_close=float(row["Adj Close"]),
                volume=int(row["Volume"])
            )
            db_records.append(rec)
            if len(db_records) >= 500:
                db.bulk_save_objects(db_records)
                db_records = []
        if db_records:
            db.bulk_save_objects(db_records)
        db.commit()
    except Exception as e:
        db.rollback()
        # Non-fatal if DB insert fails; CSV file is saved
        print(f"Warning: Failed to seed DB for ticker {ticker}: {e}")

    return {
        "ticker": ticker,
        "row_count": len(standard_df),
        "start_date": standard_df["Date"].min(),
        "end_date": standard_df["Date"].max(),
        "message": f"Dataset for ticker '{ticker}' ingested successfully ({len(standard_df)} rows)."
    }


@router.post("/run")
def start_backtest(req: BacktestRequest, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    try:
        strategy_def = get_strategy(req.strategy_id)
        if not strategy_def:
            raise HTTPException(status_code=400, detail="Unknown strategy_id")

        default_params = {k: v["default"] for k, v in strategy_def.get("parameters", {}).items()}
        merged_params = {**default_params, **(req.parameters or {})}

        strat_id = uuid.uuid4()
        strat = Strategy(
            id=strat_id,
            name=strategy_def["name"],
            type="preset",
            parameters=merged_params,
            created_by=current_user.id
        )
        db.add(strat)
        db.commit()

        run_uuid = uuid.uuid4()
        run = BacktestRun(
            id=run_uuid,
            strategy_id=strat_id,
            ticker=req.ticker,
            start_date=_parse_date(req.start_date),
            end_date=_parse_date(req.end_date),
            split_date=_parse_date(req.split_date),
            status="running"
        )
        db.add(run)
        db.commit()

        run_id = str(run_uuid)
        _run_store[run_id] = {"status": "running"}

        t = threading.Thread(target=_run_async, args=(
            run_id, req.ticker, req.strategy_id, merged_params,
            req.start_date, req.end_date, req.split_date
        ), daemon=True)
        t.start()

        return {"run_id": run_id, "status": "running"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error starting backtest: {e}")
        raise HTTPException(status_code=500, detail=f"Backtest execution error: {str(e)}")



@router.get("/results/{run_id}")
def get_results(run_id: str, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    store = _run_store.get(run_id)
    if not store:
        run = db.query(BacktestRun).filter(BacktestRun.id == uuid.UUID(run_id)).first()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        metrics = db.query(BacktestMetrics).filter(BacktestMetrics.run_id == run.id).first()
        eq_curve = metrics.equity_curve or []
        tot_ret = 0.0
        if len(eq_curve) >= 2:
            start_eq = eq_curve[0].get("equity", 100000.0)
            end_eq = eq_curve[-1].get("equity", 100000.0)
            if start_eq > 0:
                tot_ret = round(((end_eq - start_eq) / start_eq) * 100, 4)

        return {
            "run_id": run_id,
            "status": run.status,
            "bias_check_passed": run.bias_check_passed,
            "split_date": str(run.split_date) if run.split_date else None,
            "metrics": {
                "cagr": float(metrics.cagr or 0),
                "sharpe_ratio": float(metrics.sharpe_ratio or 0),
                "max_drawdown": float(metrics.max_drawdown or 0),
                "win_rate": float(metrics.win_rate or 0),
                "total_return": tot_ret,
                "profit_factor": 1.0 if float(metrics.win_rate or 0) > 0 else 0.0
            },
            "equity_curve": eq_curve
        }

    if store["status"] == "running":
        return {"run_id": run_id, "status": "running"}
    if store["status"] == "failed":
        return {"run_id": run_id, "status": "failed", "error": store.get("error")}

    result = store["result"]
    return {
        "run_id": run_id,
        "status": "completed",
        "bias_check_passed": result["bias_check_passed"],
        "metrics": result["metrics"],
        "in_sample_metrics": result.get("in_sample_metrics"),
        "out_of_sample_metrics": result.get("out_of_sample_metrics"),
        "split_date": result.get("split_date"),
        "equity_curve": result["equity_curve"],
        "trades": result.get("trades", [])
    }


@router.get("/history")
def get_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    runs = db.query(BacktestRun).order_by(BacktestRun.created_at.desc()).limit(30).all()
    result = []
    for run in runs:
        metrics = db.query(BacktestMetrics).filter(BacktestMetrics.run_id == run.id).first()
        strat = db.query(Strategy).filter(Strategy.id == run.strategy_id).first() if run.strategy_id else None
        result.append({
            "run_id": str(run.id),
            "ticker": run.ticker,
            "strategy_name": strat.name if strat else "Preset",
            "status": run.status,
            "bias_check_passed": run.bias_check_passed,
            "start_date": str(run.start_date) if run.start_date else None,
            "end_date": str(run.end_date) if run.end_date else None,
            "split_date": str(run.split_date) if run.split_date else None,
            "created_at": str(run.created_at),
            "cagr": float(metrics.cagr) if metrics and metrics.cagr is not None else None,
            "sharpe_ratio": float(metrics.sharpe_ratio) if metrics and metrics.sharpe_ratio is not None else None,
            "max_drawdown": float(metrics.max_drawdown) if metrics and metrics.max_drawdown is not None else None,
            "win_rate": float(metrics.win_rate) if metrics and metrics.win_rate is not None else None,
        })
    return result


@router.delete("/history/{run_id}")
def delete_history_run(run_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run_id UUID format.")

    db.query(BacktestMetrics).filter(BacktestMetrics.run_id == run_uuid).delete()
    deleted_count = db.query(BacktestRun).filter(BacktestRun.id == run_uuid).delete()
    db.commit()

    if run_id in _run_store:
        del _run_store[run_id]

    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="Run not found.")

    return {"message": "Run deleted successfully", "run_id": run_id}
