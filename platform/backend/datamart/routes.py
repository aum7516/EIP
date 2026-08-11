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
def _ensure_parquet():
    """Convert seed CSVs to Parquet if not already done."""
    tx_csv = os.path.join(DATA_DIR, "transactions.csv")
    pr_csv = os.path.join(DATA_DIR, "products.csv")
    if os.path.exists(tx_csv) and not os.path.exists(TRANSACTIONS_PARQUET):
        pd.read_csv(tx_csv).to_parquet(TRANSACTIONS_PARQUET, index=False)
    if os.path.exists(pr_csv) and not os.path.exists(PRODUCTS_PARQUET):
        pd.read_csv(pr_csv).to_parquet(PRODUCTS_PARQUET, index=False)


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
    """Accept CSV upload, auto-profile, and save as Parquet for DuckDB."""
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

    out_path = os.path.join(DATA_DIR, f"upload_{file.filename.replace('.csv','')}.parquet")
    df.to_parquet(out_path, index=False)

    return {"message": "Ingested successfully", "rows": len(df), "columns": profile, "parquet_path": out_path}


@router.get("/kpis")
def get_kpis(current_user: User = Depends(get_current_user)):
    """Auto-generated KPI dashboard cards from transactions + products."""
    _ensure_parquet()
    if not os.path.exists(TRANSACTIONS_PARQUET):
        return {"error": "No transaction data loaded. Upload a CSV or seed the database first."}

    conn = duckdb.connect()
    try:
        total_revenue = conn.execute(
            f"SELECT ROUND(SUM(total_amount), 2) as val FROM read_parquet('{TRANSACTIONS_PARQUET}')"
        ).fetchone()[0]

        order_count = conn.execute(
            f"SELECT COUNT(*) FROM read_parquet('{TRANSACTIONS_PARQUET}')"
        ).fetchone()[0]

        top_category = conn.execute(
            f"""SELECT p.category, ROUND(SUM(t.total_amount), 2) as rev
                FROM read_parquet('{TRANSACTIONS_PARQUET}') t
                JOIN read_parquet('{PRODUCTS_PARQUET}') p ON t.product_id = p.id
                GROUP BY p.category ORDER BY rev DESC LIMIT 1"""
        ).fetchone() if os.path.exists(PRODUCTS_PARQUET) else ("N/A", 0)

        monthly_trend = conn.execute(
            f"""SELECT strftime(transaction_date::DATE, '%Y-%m') as month,
                       ROUND(SUM(total_amount), 2) as revenue
                FROM read_parquet('{TRANSACTIONS_PARQUET}')
                GROUP BY month ORDER BY month"""
        ).df().to_dict(orient="records")

        region_breakdown = conn.execute(
            f"""SELECT region, ROUND(SUM(total_amount), 2) as revenue
                FROM read_parquet('{TRANSACTIONS_PARQUET}')
                GROUP BY region ORDER BY revenue DESC"""
        ).df().to_dict(orient="records")

    finally:
        conn.close()

    return {
        "total_revenue": total_revenue,
        "order_count": order_count,
        "top_category": {"name": top_category[0], "revenue": top_category[1]} if top_category else None,
        "monthly_trend": monthly_trend,
        "region_breakdown": region_breakdown
    }


@router.post("/filter")
def filter_data(req: FilterRequest, current_user: User = Depends(get_current_user)):
    """Dynamic filter + aggregation via DuckDB on Parquet."""
    _ensure_parquet()
    if not os.path.exists(TRANSACTIONS_PARQUET):
        raise HTTPException(status_code=404, detail="No transaction data available.")

    metric_sql = {
        "sum_revenue": "ROUND(SUM(total_amount), 2) as value",
        "count_orders": "COUNT(*) as value",
        "avg_order": "ROUND(AVG(total_amount), 2) as value",
        "sum_quantity": "SUM(quantity) as value",
    }.get(req.metric, "ROUND(SUM(total_amount), 2) as value")

    where = []
    if req.date_from: where.append(f"transaction_date >= '{req.date_from}'")
    if req.date_to:   where.append(f"transaction_date <= '{req.date_to}'")
    if req.region:    where.append(f"region = '{req.region}'")
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    group_col = req.group_by or "transaction_date"
    if group_col not in {"transaction_date", "region", "product_id"}:
        raise HTTPException(status_code=400, detail="Invalid group_by column")

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
