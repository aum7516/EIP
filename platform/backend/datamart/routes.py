import os
import io
import duckdb
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from shared.db import get_db
from shared.models import User
from auth.routes import get_current_user
from shared.query_engine import ask_business_data

router = APIRouter()

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "seed"))
TRANSACTIONS_PARQUET = os.path.join(DATA_DIR, "transactions.parquet")
PRODUCTS_PARQUET = os.path.join(DATA_DIR, "products.parquet")


# --- Schemas -----------------------------------------------------------------
class FilterRequest(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    region: Optional[str] = None
    category: Optional[str] = None
    group_by: Optional[str] = "transaction_date"
    metric: Optional[str] = "sum_revenue"

class NLQueryRequest(BaseModel):
    question: str


# --- Helpers -----------------------------------------------------------------
def _save_parquet_safe(df: pd.DataFrame, path: str):
    try:
        df.to_parquet(path, index=False)
    except Exception as e:
        print(f"Notice: Parquet export warning for {path}: {e}")

def _ensure_parquet():
    """Convert seed CSVs to Parquet if not already done or if CSV is newer."""
    tx_csv = os.path.join(DATA_DIR, "transactions.csv")
    pr_csv = os.path.join(DATA_DIR, "products.csv")
    if os.path.exists(tx_csv):
        # Force refresh parquet if CSV exists
        _save_parquet_safe(pd.read_csv(tx_csv), TRANSACTIONS_PARQUET)
    if os.path.exists(pr_csv) and not os.path.exists(PRODUCTS_PARQUET):
        _save_parquet_safe(pd.read_csv(pr_csv), PRODUCTS_PARQUET)


def _run_duckdb(sql: str) -> list:
    conn = duckdb.connect()
    try:
        df = conn.execute(sql).df()
        return df.to_dict(orient="records")
    finally:
        conn.close()


# --- Routes ------------------------------------------------------------------
@router.post("/ingest")
async def ingest_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Accept CSV upload, auto-profile, and save as active transactions dataset for DuckDB and AI Assistant."""
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))

    # Auto-profile
    profile = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            profile[col] = "numeric"
        elif "date" in col.lower():
            profile[col] = "date"
        else:
            profile[col] = "categorical"

    os.makedirs(DATA_DIR, exist_ok=True)
    # Save CSV version for persistence backup
    tx_csv = os.path.join(DATA_DIR, "transactions.csv")
    df.to_csv(tx_csv, index=False)

    # Save as primary transactions.parquet for DuckDB & AI Assistant query engine
    _save_parquet_safe(df, TRANSACTIONS_PARQUET)

    out_path = os.path.join(DATA_DIR, f"upload_{file.filename.replace('.csv','')}.parquet")
    _save_parquet_safe(df, out_path)

    return {"message": "Ingested successfully into platform DuckDB engine", "rows": len(df), "columns": profile, "parquet_path": TRANSACTIONS_PARQUET}



@router.get("/kpis")
def get_kpis(current_user: User = Depends(get_current_user)):
    """Auto-generated KPI dashboard cards from transactions."""
    _ensure_parquet()
    if not os.path.exists(TRANSACTIONS_PARQUET):
        return {"error": "No transaction data loaded. Upload a CSV or seed the database first."}

    conn = duckdb.connect()
    try:
        cols = [c[0] for c in conn.execute(f"DESCRIBE SELECT * FROM read_parquet('{TRANSACTIONS_PARQUET}')").fetchall()]
        rev_col = "revenue" if "revenue" in cols else "total_amount"
        date_col = "date" if "date" in cols else ("transaction_date" if "transaction_date" in cols else "date")
        cat_col = "category" if "category" in cols else "category"

        total_revenue = conn.execute(
            f"SELECT ROUND(SUM({rev_col}), 2) as val FROM read_parquet('{TRANSACTIONS_PARQUET}')"
        ).fetchone()[0] or 0

        total_profit = conn.execute(
            f"SELECT ROUND(SUM(profit), 2) as val FROM read_parquet('{TRANSACTIONS_PARQUET}')"
        ).fetchone()[0] if "profit" in cols else 0

        order_count = conn.execute(
            f"SELECT COUNT(*) FROM read_parquet('{TRANSACTIONS_PARQUET}')"
        ).fetchone()[0] or 0

        top_category_row = conn.execute(
            f"""SELECT {cat_col}, ROUND(SUM({rev_col}), 2) as rev
                FROM read_parquet('{TRANSACTIONS_PARQUET}')
                GROUP BY {cat_col} ORDER BY rev DESC LIMIT 1"""
        ).fetchone() if cat_col in cols else ("N/A", 0)

        monthly_trend = conn.execute(
            f"""SELECT strftime({date_col}::DATE, '%Y-%m') as month,
                       ROUND(SUM({rev_col}), 2) as revenue
                FROM read_parquet('{TRANSACTIONS_PARQUET}')
                GROUP BY month ORDER BY month"""
        ).df().to_dict(orient="records")

        region_breakdown = conn.execute(
            f"""SELECT region, ROUND(SUM({rev_col}), 2) as revenue
                FROM read_parquet('{TRANSACTIONS_PARQUET}')
                GROUP BY region ORDER BY revenue DESC"""
        ).df().to_dict(orient="records") if "region" in cols else []

    finally:
        conn.close()

    return {
        "total_revenue": total_revenue,
        "total_profit": total_profit,
        "order_count": order_count,
        "top_category": {"name": top_category_row[0], "revenue": top_category_row[1]} if top_category_row else None,
        "monthly_trend": monthly_trend,
        "region_breakdown": region_breakdown
    }


@router.post("/filter")
def filter_data(req: FilterRequest, current_user: User = Depends(get_current_user)):
    """Dynamic filter + aggregation via DuckDB on Parquet."""
    _ensure_parquet()
    if not os.path.exists(TRANSACTIONS_PARQUET):
        raise HTTPException(status_code=404, detail="No transaction data available.")

    conn = duckdb.connect()
    try:
        cols = [c[0] for c in conn.execute(f"DESCRIBE SELECT * FROM read_parquet('{TRANSACTIONS_PARQUET}')").fetchall()]
    finally:
        conn.close()

    rev_col = "revenue" if "revenue" in cols else "total_amount"
    date_col = "date" if "date" in cols else ("transaction_date" if "transaction_date" in cols else "date")

    metric_sql = {
        "sum_revenue": f"ROUND(SUM({rev_col}), 2) as value",
        "sum_profit": "ROUND(SUM(profit), 2) as value" if "profit" in cols else f"ROUND(SUM({rev_col}), 2) as value",
        "count_orders": "COUNT(*) as value",
        "avg_order": f"ROUND(AVG({rev_col}), 2) as value",
        "sum_quantity": "SUM(quantity) as value" if "quantity" in cols else "COUNT(*) as value",
    }.get(req.metric, f"ROUND(SUM({rev_col}), 2) as value")

    where = []
    if req.date_from: where.append(f"{date_col} >= '{req.date_from}'")
    if req.date_to:   where.append(f"{date_col} <= '{req.date_to}'")
    if req.region and "region" in cols: where.append(f"region = '{req.region}'")
    if req.category and "category" in cols: where.append(f"category = '{req.category}'")
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    group_col = req.group_by if req.group_by in cols else date_col

    sql = f"""
        SELECT {group_col} as label, {metric_sql}
        FROM read_parquet('{TRANSACTIONS_PARQUET}')
        {where_sql}
        GROUP BY {group_col}
        ORDER BY value DESC
        LIMIT 100
    """
    rows = _run_duckdb(sql)
    return {"data": rows, "metric": req.metric, "group_by": group_col}


@router.post("/ask")
def ask_nl_query(req: NLQueryRequest, current_user: User = Depends(get_current_user)):
    """
    Natural-language query via the SHARED query engine.
    This is the SAME function the Retail Assistant calls for business-data questions.
    """
    _ensure_parquet()
    result = ask_business_data(question=req.question, user_id=str(current_user.id))
    return result

