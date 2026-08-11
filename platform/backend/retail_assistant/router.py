"""
Intent router for the Retail Assistant.
Classifies user messages into one of three intents using keyword
heuristics (fast, no LLM call needed for common cases) with LLM fallback.
"""
from shared.llm_client import chat_with_llm

PRODUCT_KEYWORDS = {
    "buy", "product", "recommend", "laptop", "phone", "price", "cheap", "best",
    "compare", "stock", "available", "show me", "looking for", "suggest", "option",
    "tablet", "headphone", "camera", "chair", "desk", "keyboard", "monitor"
}

BUSINESS_KEYWORDS = {
    "revenue", "sales", "kpi", "trend", "analytics", "report", "orders",
    "region", "category", "top", "this week", "this month", "quarter",
    "profit", "growth", "performance", "dashboard", "how much", "how many"
}

INTENTS = ["product_query", "business_data_query", "general_support"]


def classify_intent(message: str) -> str:
    """
    Fast keyword-based intent classification.
    Returns: 'product_query' | 'business_data_query' | 'general_support'
    """
    msg_lower = message.lower()
    words = set(msg_lower.split())

    product_score = len(words & PRODUCT_KEYWORDS) + sum(1 for kw in PRODUCT_KEYWORDS if kw in msg_lower)
    business_score = len(words & BUSINESS_KEYWORDS) + sum(1 for kw in BUSINESS_KEYWORDS if kw in msg_lower)

    if product_score == 0 and business_score == 0:
        return "general_support"
    if business_score >= product_score:
        return "business_data_query"
    return "product_query"
