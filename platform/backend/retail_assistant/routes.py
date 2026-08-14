import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from shared.db import get_db
from shared.models import User, AssistantConversation, AssistantMessage
from shared.llm_client import chat_with_llm, MOCK_RESPONSES
from auth.routes import get_current_user
from retail_assistant.rag import search_products, get_all_products, get_categories, MOCK_CATALOG
from retail_assistant.router import classify_intent

router = APIRouter()

MEMORY_TURNS = 6  # last N messages kept in context


# --- Smart General Response Engine -------------------------------------------
# Covers 30+ common questions without needing a real LLM API key.
_PLATFORM_QA = [
    # Greetings
    (["hello", "hi", "hey", "good morning", "good afternoon", "namaste", "sup"],
     "Hello! 👋 I'm **Orbit**, EIP's AI assistant. I can help you:\n\n"
     "🛍️ **Find products** — just describe what you're looking for\n"
     "📈 **Backtesting** — explain strategies, date ranges, metrics\n"
     "🗄️ **DataMart** — guide you through CSV ingestion and NL queries\n"
     "📊 **Dashboard** — explain KPIs and charts\n\n"
     "What would you like to explore today?"),

    # Identity
    (["who are you", "what are you", "your name", "about you", "orbit"],
     "I'm **Orbit**, the AI assistant built into EIP (Enterprise Intelligence Platform). "
     "I can help with product recommendations, platform navigation, and answering questions about EIP's features. "
     "I'm powered by RAG-based product search and a keyword intent router.\n\n"
     "EIP was built for hackathon demonstration — ask me anything!"),

    # Backtesting — general
    (["backtest", "backtesting", "backtest platform", "strategy simulation"],
     "📈 **Backtesting Platform** is EIP's quantitative finance module. Here's how to use it:\n\n"
     "1. **Go to Backtesting** from the sidebar\n"
     "2. **Step 1 — Data**: Select a preloaded ticker (AAPL, MSFT, etc.) or upload your own OHLCV CSV\n"
     "3. **Step 2 — Strategy**: Choose a preset strategy (SMA Crossover, RSI, Bollinger Bands, etc.) and tune parameters with sliders\n"
     "4. **Step 3 — Run**: Set start/end dates, choose a train/test split date, then click **Launch Backtest Simulation**\n"
     "5. **Results**: See CAGR, Sharpe Ratio, Max Drawdown, Win Rate, equity curve chart, and trade log\n\n"
     "All runs are saved in history and the **Bias-Guard** system checks for look-ahead bias automatically."),

    # Backtesting — metrics
    (["cagr", "sharpe", "sharpe ratio", "max drawdown", "win rate", "profit factor", "backtest metric", "what does"],
     "📊 **Backtesting Metrics Explained:**\n\n"
     "- **CAGR** (Compound Annual Growth Rate): Annualized return of your strategy\n"
     "- **Sharpe Ratio**: Risk-adjusted return (>1.0 is good, >2.0 is excellent)\n"
     "- **Max Drawdown**: Largest peak-to-trough loss percentage (lower is better)\n"
     "- **Win Rate**: % of trades that were profitable\n"
     "- **Profit Factor**: Gross profit ÷ gross loss (>1.5 is solid)\n"
     "- **Total Return**: Overall % gain or loss over the simulation period\n\n"
     "In-Sample metrics are from the training period; Out-of-Sample metrics show generalization performance."),

    # Backtesting — strategies
    (["sma", "rsi", "bollinger", "mean reversion", "momentum", "strategy type", "which strategy", "trading strategy"],
     "EIP includes these built-in strategy presets:\n\n"
     "📈 **SMA Crossover** — Buy when short SMA crosses above long SMA, sell on cross-below. Trend-following.\n"
     "📉 **RSI Reversal** — Buy oversold (RSI < 30), sell overbought (RSI > 70). Mean-reversion.\n"
     "📊 **Bollinger Band** — Trade breakouts from ±2σ bands. Volatility-based.\n"
     "⚡ **Momentum** — Buy assets with recent strong performance. Trend-continuation.\n\n"
     "All parameters are tunable with sliders before running."),

    # Backtesting — bias guard
    (["bias", "look-ahead", "bias guard", "look ahead bias"],
     "🛡️ **Bias-Guard** is EIP's anti-cheating system for backtests.\n\n"
     "Look-ahead bias happens when a strategy accidentally uses future data to make past decisions — inflating performance artificially.\n\n"
     "EIP's Bias-Guard checks that every signal is computed only from data available **before** the decision date. "
     "If a run passes, you'll see a green **BIAS-GUARD VERIFIED** badge on the results page."),

    # DataMart — general
    (["datamart", "data mart", "data engine", "ingest", "ingest csv", "upload data"],
     "🗄️ **DataMart Engine** is EIP's data warehouse and analytics workspace.\n\n"
     "**How to use it:**\n"
     "1. Go to **DataMart** from the sidebar\n"
     "2. **Upload a CSV** — transactions, products, or any tabular data\n"
     "3. The engine validates columns, detects types, and stores data in the database\n"
     "4. Use **Natural Language Query** to ask questions like 'top 5 products by revenue'\n"
     "5. Results appear as a table and can be exported\n\n"
     "You can also use the **Filter Engine** for structured queries without SQL knowledge."),

    # DataMart — NL queries
    (["natural language", "nl query", "ask question", "query data", "ask data", "sql"],
     "📝 **Natural Language Queries** in DataMart let you ask questions in plain English:\n\n"
     "Try asking:\n"
     "- *'What is the total revenue by region?'*\n"
     "- *'Show top 5 products by sales volume'*\n"
     "- *'Revenue trend for the last 6 months'*\n"
     "- *'Which category has the highest profit margin?'*\n\n"
     "The engine converts your question to SQL automatically and returns results as a table."),

    # Dashboard
    (["dashboard", "kpi", "revenue", "overview", "home page", "main page"],
     "📊 **EIP Dashboard** shows a live overview of your business:\n\n"
     "- **Total Revenue**: Sum of all transactions in your DataMart\n"
     "- **Total Orders**: Order count\n"
     "- **Top Category**: Best-performing product category by revenue\n"
     "- **Backtest Runs**: Total simulations run\n"
     "- **Revenue Trend Chart**: Monthly area chart\n"
     "- **Revenue by Region**: Bar breakdown by geography\n"
     "- **Recent Backtests**: Last 5 simulation runs with status\n\n"
     "All data updates automatically when you ingest new CSV files in DataMart."),

    # Login / Auth
    (["login", "sign in", "sign up", "register", "password", "account", "logout", "credentials"],
     "🔐 **Authentication in EIP:**\n\n"
     "- Go to `/login` to sign in with your email and password\n"
     "- New users: Click **Sign Up** on the login page and register with email + password\n"
     "- All credentials are stored securely in Supabase PostgreSQL (passwords are hashed with pbkdf2_sha256)\n"
     "- Sessions expire after 60 minutes — you'll be redirected to login automatically\n"
     "- To log out, click **Sign Out Session** at the bottom of the sidebar"),

    # Product search help
    (["how to search", "find product", "search product", "how do i find", "product search"],
     "🛍️ **How to search for products:**\n\n"
     "**In this chat:**\n"
     "- Just describe what you need: *'I need a laptop for video editing under ₹80,000'*\n"
     "- Or be specific: *'wireless earbuds with noise cancellation'*\n"
     "- I'll show you matching products with prices, specs, and stock info\n\n"
     "**In the Catalog panel (right side):**\n"
     "- Type in the search box to filter products live\n"
     "- Use category buttons to browse by Electronics, Furniture, etc.\n"
     "- All 30 products in our catalog are browsable"),

    # Comparison
    (["compare", "difference between", "vs", "versus", "which is better", "better than"],
     "I can help compare products! Just tell me the two items you'd like to compare.\n\n"
     "For example:\n"
     "- *'Compare UltraBook Pro vs BudgetBook laptop'*\n"
     "- *'Which is better: gaming chair or office chair?'*\n"
     "- *'Difference between NoisePro headphones and CloudSync earbuds'*\n\n"
     "I'll show you both products side by side with key specs and pricing."),

    # Budget / price range
    (["under", "budget", "within", "affordable", "cheap", "price range", "less than", "below"],
     "Great! I can filter products by budget. Just tell me:\n"
     "1. **What category** you're interested in (laptop, chair, earbuds, etc.)\n"
     "2. **Your budget** (e.g., under ₹10,000 or within ₹50,000)\n\n"
     "Example: *'Show me laptops under ₹40,000'* or *'Affordable office chairs'*"),

    # Features / EIP overview
    (["features", "what can eip do", "what does eip", "capabilities", "modules", "what is eip", "platform"],
     "🚀 **EIP — Enterprise Intelligence Platform** has 4 core modules:\n\n"
     "📈 **Backtesting Engine** — Simulate trading strategies on historical price data with bias protection\n"
     "🗄️ **DataMart Engine** — Ingest CSV datasets, run NL queries, explore business KPIs\n"
     "🤖 **Retail AI Assistant** — Product recommendations, semantic search (you're here!)\n"
     "📊 **Unified Dashboard** — Real-time KPIs, revenue trends, regional breakdown\n\n"
     "EIP was designed as a full-stack hackathon project using FastAPI + Next.js + Supabase + ChromaDB."),

    # Help
    (["help", "what can you do", "how can you help", "guide", "tutorial"],
     "Here's everything I can help you with:\n\n"
     "🛍️ **Products**: Ask for recommendations, search by category, compare items\n"
     "📈 **Backtesting**: How to run simulations, what metrics mean, strategy explanations\n"
     "🗄️ **DataMart**: How to upload data, run queries, use the filter engine\n"
     "📊 **Dashboard**: What each KPI means, how to read charts\n"
     "🔐 **Auth**: Login, signup, session management\n\n"
     "Just type your question naturally — I'll do my best to help!"),

    # Thank you
    (["thank", "thanks", "thank you", "thx", "great", "awesome", "perfect", "helpful"],
     "You're welcome! 😊 Happy to help.\n\nFeel free to ask me anything else — "
     "products, platform questions, or anything else about EIP!"),
]


def smart_general_response(message: str, history: list) -> str:
    """Pattern-match the user message against known Q&A pairs. Falls back to a helpful default."""
    msg_lower = message.lower().strip()

    # Check each pattern group
    for keywords, response in _PLATFORM_QA:
        if any(kw in msg_lower for kw in keywords):
            return response

    # Check if it's a very short or unclear message
    if len(msg_lower.split()) <= 2:
        return (
            f"I'm not sure I understood *\"{message}\"* — could you give me a bit more context?\n\n"
            "I can help with:\n"
            "- 🛍️ Product recommendations (e.g., 'recommend a laptop under ₹60,000')\n"
            "- 📈 Backtesting (e.g., 'how do I run a backtest?')\n"
            "- 🗄️ DataMart (e.g., 'how do I upload data?')\n"
            "- 📊 Dashboard (e.g., 'what does CAGR mean?')"
        )

    # Generic fallback — contextual and helpful, not a greeting
    return (
        f"That's a great question! Here's what I know that might be relevant:\n\n"
        "EIP has four main modules: **Backtesting**, **DataMart Engine**, **AI Assistant**, and the **Dashboard**. "
        "Each module is accessible from the sidebar.\n\n"
        "Could you be more specific about what you'd like help with? For example:\n"
        "- *Product or shopping related* → describe what you're looking for\n"
        "- *Platform feature* → mention the module name (backtest, datamart, dashboard)\n"
        "- *Data or analytics* → use the DataMart Engine workspace\n\n"
        "I'm here to help! 🚀"
    )


# --- Schemas -----------------------------------------------------------------
class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str

class FeedbackRequest(BaseModel):
    message_id: str
    feedback: str  # "up" or "down"


# --- Product Catalog ---------------------------------------------------------
@router.get("/products")
def browse_products(
    q: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Browse or search the product catalog."""
    if q:
        products = search_products(q, top_k=limit, category=category)
    else:
        products = get_all_products(category=category, limit=limit)
    categories = get_categories()
    return {"products": products, "total": len(products), "categories": categories}


@router.get("/categories")
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all product categories."""
    return {"categories": get_categories()}


# --- Chat --------------------------------------------------------------------
@router.post("/chat")
def chat(req: ChatRequest, db: Session = Depends(get_db),
         current_user: User = Depends(get_current_user)):

    # Get or create conversation
    if req.conversation_id:
        try:
            conv_uuid = uuid.UUID(req.conversation_id)
            conversation = db.query(AssistantConversation).filter(
                AssistantConversation.id == conv_uuid
            ).first()
        except Exception:
            conversation = None
    else:
        conversation = None

    if not conversation:
        conversation = AssistantConversation(user_id=current_user.id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Log user message
    user_msg = AssistantMessage(
        conversation_id=conversation.id,
        role="user",
        content=req.message,
    )
    db.add(user_msg)
    db.commit()

    # -- Classify intent ---------------------------------------------------
    intent = classify_intent(req.message)

    # -- Build conversation history (last N turns for memory) --------------
    history = db.query(AssistantMessage).filter(
        AssistantMessage.conversation_id == conversation.id
    ).order_by(AssistantMessage.created_at.desc()).limit(MEMORY_TURNS * 2).all()
    history.reverse()
    messages = [{"role": m.role, "content": m.content} for m in history]

    # -- Route to appropriate handler --------------------------------------
    response_data = {}

    if intent == "product_query":
        products = search_products(req.message, top_k=5)
        # Build context-aware mock response using actual product names/prices
        if products:
            prod_lines = "\n".join(
                f"- {p['name']} ({p['category']}) — ₹{int(p['price']):,}: {p.get('description','')[:60]}"
                for p in products[:3]
            )
            answer_text = (
                f"Here are my top recommendations based on your query:\n\n{prod_lines}\n\n"
                f"I found {len(products)} matching products. The items above match your requirements well — "
                f"would you like to compare any two products, or do you need more details?"
            )
        else:
            answer_text = "I couldn't find exact matches for your query. Could you refine it? For example, try mentioning a category like 'laptop', 'chair', or 'headphones'."

        response_data = {"answer_text": answer_text, "products": products, "chart_data": []}

    elif intent == "business_data_query":
        response_data = {
            "answer_text": (
                "📊 Business data queries are disabled in the AI Assistant workspace. "
                "Please use the **DataMart Engine** workspace to run analytical queries and explore datasets."
            ),
            "chart_data": [],
            "products": []
        }

    else:  # general_support
        # Use smart keyword-based responder (works without a real LLM API key)
        answer_text = smart_general_response(req.message, messages)
        response_data = {"answer_text": answer_text, "chart_data": [], "products": []}

    # Log assistant message
    assistant_msg = AssistantMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=response_data.get("answer_text", ""),
        intent_type=intent
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return {
        "conversation_id": str(conversation.id),
        "message_id": str(assistant_msg.id),
        "intent": intent,
        **response_data
    }


# --- Feedback ----------------------------------------------------------------
@router.post("/feedback")
def submit_feedback(req: FeedbackRequest, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    if req.feedback not in ("up", "down"):
        raise HTTPException(status_code=400, detail="Feedback must be 'up' or 'down'")
    msg = db.query(AssistantMessage).filter(
        AssistantMessage.id == uuid.UUID(req.message_id)
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.feedback = req.feedback
    db.commit()
    return {"message_id": req.message_id, "feedback": req.feedback}


# --- Conversations -----------------------------------------------------------
@router.get("/conversations")
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convs = db.query(AssistantConversation).filter(
        AssistantConversation.user_id == current_user.id
    ).order_by(AssistantConversation.created_at.desc()).limit(20).all()
    result = []
    for c in convs:
        # Get first user message as title
        first_msg = db.query(AssistantMessage).filter(
            AssistantMessage.conversation_id == c.id,
            AssistantMessage.role == "user"
        ).order_by(AssistantMessage.created_at.asc()).first()
        msg_count = db.query(AssistantMessage).filter(
            AssistantMessage.conversation_id == c.id
        ).count()
        result.append({
            "id": str(c.id),
            "title": (first_msg.content[:50] + "...") if first_msg and len(first_msg.content) > 50 else (first_msg.content if first_msg else "New Conversation"),
            "created_at": str(c.created_at),
            "message_count": msg_count
        })
    return result


@router.get("/conversations/{conv_id}/messages")
def get_conversation_messages(
    conv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Load full message history of a specific conversation."""
    try:
        conv_uuid = uuid.UUID(conv_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    conversation = db.query(AssistantConversation).filter(
        AssistantConversation.id == conv_uuid,
        AssistantConversation.user_id == current_user.id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = db.query(AssistantMessage).filter(
        AssistantMessage.conversation_id == conv_uuid
    ).order_by(AssistantMessage.created_at.asc()).all()

    return {
        "conversation_id": conv_id,
        "messages": [
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "intent_type": m.intent_type,
                "feedback": m.feedback,
                "created_at": str(m.created_at)
            }
            for m in messages
        ]
    }


@router.delete("/conversations/{conv_id}")
def delete_conversation(
    conv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a conversation and all its messages."""
    try:
        conv_uuid = uuid.UUID(conv_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    conversation = db.query(AssistantConversation).filter(
        AssistantConversation.id == conv_uuid,
        AssistantConversation.user_id == current_user.id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.query(AssistantMessage).filter(AssistantMessage.conversation_id == conv_uuid).delete()
    db.delete(conversation)
    db.commit()
    return {"status": "deleted", "conversation_id": conv_id}


# --- Stats -------------------------------------------------------------------
@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Assistant usage statistics for the current user."""
    total_convs = db.query(AssistantConversation).filter(
        AssistantConversation.user_id == current_user.id
    ).count()
    total_msgs = db.query(AssistantMessage).join(
        AssistantConversation, AssistantMessage.conversation_id == AssistantConversation.id
    ).filter(AssistantConversation.user_id == current_user.id).count()
    helpful = db.query(AssistantMessage).join(
        AssistantConversation, AssistantMessage.conversation_id == AssistantConversation.id
    ).filter(
        AssistantConversation.user_id == current_user.id,
        AssistantMessage.feedback == "up"
    ).count()

    return {
        "total_conversations": total_convs,
        "total_messages": total_msgs,
        "helpful_responses": helpful,
        "catalog_size": len(MOCK_CATALOG),
    }
