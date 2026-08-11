"""
Shared LLM Client - wraps Claude API with mock mode.
Set LLM_MOCK=true in .env to use mock responses (no API key needed).
Set LLM_MOCK=false and provide ANTHROPIC_API_KEY to use real Claude.
"""
import os
import json
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

LLM_MOCK = os.getenv("LLM_MOCK", "true").lower() == "true"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Tool definitions for Claude function-calling
TOOLS = [
    {
        "name": "query_business_data",
        "description": "Query EIP transactional data for KPIs, revenue trends, top products, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "table": {"type": "string", "enum": ["transactions", "products", "backtest_metrics"]},
                "filters": {"type": "object", "description": "Key-value filters (date_from, date_to, region, category)"},
                "group_by": {"type": "string", "description": "Column to group by"},
                "metric": {"type": "string", "description": "Aggregation metric: sum_revenue, count_orders, avg_order"}
            },
            "required": ["table", "metric"]
        }
    },
    {
        "name": "search_product_catalog",
        "description": "Search EIP product catalog for recommendations using semantic similarity.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "top_k": {"type": "integer", "default": 5}
            },
            "required": ["query"]
        }
    }
]


MOCK_RESPONSES = {
    "business_data": {
        "answer_text": "Based on EIP's transaction data, total revenue for the selected period is ?24,58,320. Electronics is the top-performing category at 38% of revenue, followed by Apparel at 27%. Revenue has grown 12% month-over-month.",
        "chart_data": [
            {"date": "2024-01", "value": 180000},
            {"date": "2024-02", "value": 210000},
            {"date": "2024-03", "value": 195000},
            {"date": "2024-04", "value": 230000},
            {"date": "2024-05", "value": 255000},
            {"date": "2024-06", "value": 245000},
        ],
        "raw_rows": []
    },
    "product_search": [
        {"id": "p1", "name": "UltraBook Pro 15", "category": "Electronics", "price": 89999, "description": "High-performance laptop for professionals"},
        {"id": "p2", "name": "CloudSync Wireless Earbuds", "category": "Electronics", "price": 4999, "description": "Premium audio with 30hr battery life"},
        {"id": "p3", "name": "ErgoDesk Standing Desk", "category": "Furniture", "price": 24999, "description": "Height-adjustable smart desk with memory presets"},
    ],
    "general": "Hello! I'm Orbit, EIP's intelligent assistant. I can help you find products, check business analytics, or answer questions about EIP's platform. What would you like to know?"
}


def chat_with_llm(
    messages: list[dict],
    system_prompt: str = "",
    tools_enabled: bool = True
) -> dict:
    """
    Core LLM call. Returns structured response dict.
    In mock mode: returns realistic pre-defined responses.
    In live mode: calls Claude claude-3-5-sonnet-20241022 with function-calling.
    """
    if LLM_MOCK:
        # Detect intent from last user message
        last_msg = messages[-1].get("content", "").lower() if messages else ""
        if any(w in last_msg for w in ["revenue", "sales", "trend", "kpi", "order", "region"]):
            return {"type": "business_data", "content": MOCK_RESPONSES["business_data"]}
        elif any(w in last_msg for w in ["product", "recommend", "buy", "laptop", "phone", "cheap", "best"]):
            return {"type": "product_search", "content": MOCK_RESPONSES["product_search"]}
        else:
            return {"type": "general", "content": MOCK_RESPONSES["general"]}

    # Live Claude call
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        kwargs = {
            "model": "claude-sonnet-4-5",
            "max_tokens": 1024,
            "system": system_prompt,
            "messages": messages,
        }
        if tools_enabled:
            kwargs["tools"] = TOOLS

        response = client.messages.create(**kwargs)

        # Handle tool use response
        for block in response.content:
            if block.type == "tool_use":
                return {"type": "tool_call", "tool": block.name, "input": block.input}

        # Text response
        text = response.content[0].text if response.content else ""
        return {"type": "text", "content": text}

    except Exception as e:
        return {"type": "error", "content": str(e)}
