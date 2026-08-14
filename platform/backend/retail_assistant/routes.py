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
        platform_context = """You are Orbit, the intelligent assistant for EIP (Enterprise Intelligence Platform).
EIP includes:
- 📈 Backtesting Platform: Run historical strategy simulations with bias-guard protection
- 🗄️ DataMart Engine: Ingest CSV datasets, run natural language SQL queries
- 🤖 Retail AI Assistant: Product search, recommendations (this workspace)
- 📊 Unified Dashboard: Live KPIs, revenue trends, regional breakdown
Help users navigate, understand features, and get the most from EIP. Be concise and professional."""
        llm_resp = chat_with_llm(
            messages=messages,
            system_prompt=platform_context,
            tools_enabled=False
        )
        content = llm_resp.get("content", MOCK_RESPONSES["general"])
        response_data = {
            "answer_text": content if isinstance(content, str) else MOCK_RESPONSES["general"],
            "chart_data": [], "products": []
        }

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
