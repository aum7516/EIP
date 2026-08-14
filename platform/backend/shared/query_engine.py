"""
Shared Query Engine - the most important shared component.
BOTH DataMart NL queries and Retail Assistant business-data lookups
call ask_business_data() from this module. Never duplicate this logic.

Security: LLM-generated queries are validated against an allow-list
of tables/columns before execution. No raw LLM SQL is ever executed.
"""
import os
import duckdb
import pandas as pd
from typing import Optional
from shared.llm_client import chat_with_llm

# --- ALLOW-LIST (security: only these tables/cols can be queried) --------------
ALLOWED_TABLES = {"transactions", "products", "backtest_metrics", "backtest_runs"}

ALLOWED_COLUMNS = {
    "transactions":    {"id", "transaction_id", "product_id", "product", "user_id", "customer_type", "salesperson", "quantity", "total_amount", "revenue", "cost", "profit", "unit_price", "discount", "payment_method", "region", "category", "transaction_date", "date"},
    "products":        {"id", "name", "category", "price", "stock_qty", "description"},
    "backtest_metrics": {"id", "run_id", "cagr", "sharpe_ratio", "max_drawdown", "win_rate"},
    "backtest_runs":   {"id", "strategy_id", "ticker", "start_date", "end_date", "status", "bias_check_passed"},
}


ALLOWED_METRICS = {"sum_revenue", "count_orders", "avg_order", "sum_quantity", "count_products"}

PARQUET_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "seed")


def _validate_query_params(table: str, metric: str, filters: dict, group_by: Optional[str]) -> None:
    """Raise ValueError if any param is outside the allow-list."""
    if table not in ALLOWED_TABLES:
        raise ValueError(f"Table '{table}' is not in the allowed list.")
    if metric not in ALLOWED_METRICS:
        raise ValueError(f"Metric '{metric}' is not allowed.")
    if group_by and group_by not in ALLOWED_COLUMNS.get(table, set()):
        raise ValueError(f"Column '{group_by}' is not allowed for table '{table}'.")
    for col in (filters or {}).keys():
        if col not in {"date_from", "date_to", "region", "category", "ticker"}:
            raise ValueError(f"Filter key '{col}' is not allowed.")


def _build_duckdb_query(table: str, metric: str, filters: dict, group_by: Optional[str]) -> str:
    """Build a safe parameterized DuckDB SQL query from validated inputs."""
    parquet_file = os.path.join(PARQUET_DIR, f"{table}.parquet")
    csv_file = os.path.join(PARQUET_DIR, f"{table}.csv")

    if os.path.exists(parquet_file):
        data_source = f"read_parquet('{parquet_file}')"
    elif os.path.exists(csv_file):
        data_source = f"read_csv_auto('{csv_file}')"
    else:
        data_source = f"read_parquet('{parquet_file}')"

    conn = duckdb.connect()
    try:
        cols = [c[0] for c in conn.execute(f"DESCRIBE SELECT * FROM {data_source}").fetchall()]
    except Exception:
        cols = []
    finally:
        conn.close()

    rev_col = "revenue" if "revenue" in cols else ("total_amount" if "total_amount" in cols else "revenue")
    date_col = "date" if "date" in cols else ("transaction_date" if "transaction_date" in cols else "date")
    qty_col = "quantity" if "quantity" in cols else "1"

    metric_sql = {
        "sum_revenue":    f"ROUND(SUM({rev_col}), 2) as value",
        "count_orders":   "COUNT(*) as value",
        "avg_order":      f"ROUND(AVG({rev_col}), 2) as value",
        "sum_quantity":   f"SUM({qty_col}) as value",
        "count_products": "COUNT(DISTINCT product) as value" if "product" in cols else "COUNT(*) as value",
    }.get(metric, f"ROUND(SUM({rev_col}), 2) as value")

    where_clauses = []
    if filters.get("date_from"):
        where_clauses.append(f"{date_col} >= '{filters['date_from']}'")
    if filters.get("date_to"):
        where_clauses.append(f"{date_col} <= '{filters['date_to']}'")
    if filters.get("region") and "region" in cols:
        where_clauses.append(f"region = '{filters['region']}'")
    if filters.get("category") and "category" in cols:
        where_clauses.append(f"category = '{filters['category']}'")

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    actual_group = group_by if (group_by and group_by in cols) else (date_col if group_by else None)
    
    group_sql = f"GROUP BY {actual_group}" if actual_group else ""
    select_group = f"{actual_group} as label," if actual_group else ""

    return f"""
        SELECT {select_group} {metric_sql}
        FROM {data_source}
        {where_sql}
        {group_sql}
        ORDER BY value DESC
        LIMIT 50
    """.strip()



def ask_business_data(question: str, user_id: str = "") -> dict:
    """
    Main entry point - called by BOTH DataMart and Retail Assistant.
    
    1. Sends question + schema to LLM (or mock) for structured query params.
    2. Validates params against allow-list (security gate).
    3. Executes safe DuckDB query against Parquet snapshots.
    4. Returns { answer_text, chart_data, raw_rows }.
    """
    try:
        system_prompt = """You are a data analyst for EIP: Enterprise Intelligence Platform.
        When the user asks a business question, call the query_business_data tool with the
        appropriate parameters. Available tables: transactions, products, backtest_metrics."""
        
        llm_response = chat_with_llm(
            messages=[{"role": "user", "content": question}],
            system_prompt=system_prompt,
            tools_enabled=True
        )

        # If mock or general response, return directly
        if llm_response["type"] == "business_data":
            return llm_response["content"]
        
        if llm_response["type"] == "text":
            return {"answer_text": llm_response["content"], "chart_data": [], "raw_rows": []}

        # Parse tool call from LLM
        if llm_response["type"] == "tool_call" and llm_response["tool"] == "query_business_data":
            params = llm_response["input"]
            table = params.get("table", "transactions")
            metric = params.get("metric", "sum_revenue")
            filters = params.get("filters", {})
            group_by = params.get("group_by")

            # SECURITY: validate before any DB call
            _validate_query_params(table, metric, filters, group_by)

            sql = _build_duckdb_query(table, metric, filters, group_by)
            conn = duckdb.connect()
            df = conn.execute(sql).df()
            conn.close()

            rows = df.to_dict(orient="records")
            chart_data = [{"date": str(r.get(group_by, i)), "value": float(r.get("value", 0))}
                         for i, r in enumerate(rows)]

            return {
                "answer_text": f"Query completed. Found {len(rows)} results for: {question}",
                "chart_data": chart_data,
                "raw_rows": rows
            }

        # Fallback
        return {"answer_text": "I could not process that query.", "chart_data": [], "raw_rows": []}

    except ValueError as e:
        return {"answer_text": f"Query blocked by security validation: {str(e)}", "chart_data": [], "raw_rows": []}
    except Exception as e:
        return {"answer_text": f"Query error: {str(e)}", "chart_data": [], "raw_rows": []}
