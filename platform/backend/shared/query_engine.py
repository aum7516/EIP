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
    "transactions":    {"id", "product_id", "user_id", "quantity", "total_amount", "region", "transaction_date"},
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
    
    metric_sql = {
        "sum_revenue":    "SUM(total_amount) as value",
        "count_orders":   "COUNT(*) as value",
        "avg_order":      "AVG(total_amount) as value",
        "sum_quantity":   "SUM(quantity) as value",
        "count_products": "COUNT(DISTINCT product_id) as value",
    }[metric]

    where_clauses = []
    if filters.get("date_from"):
        where_clauses.append(f"transaction_date >= '{filters['date_from']}'")
    if filters.get("date_to"):
        where_clauses.append(f"transaction_date <= '{filters['date_to']}'")
    if filters.get("region"):
        where_clauses.append(f"region = '{filters['region']}'")

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    group_sql = f"GROUP BY {group_by}, " if group_by else ""
    select_group = f"{group_by}," if group_by else ""

    return f"""
        SELECT {select_group} {metric_sql}
        FROM read_parquet('{parquet_file}')
        {where_sql}
        {group_sql if group_by else ''}
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
