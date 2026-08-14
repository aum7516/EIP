import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from shared.db import get_db
from shared.models import User, AssistantConversation, AssistantMessage
from shared.query_engine import ask_business_data
from shared.llm_client import chat_with_llm, MOCK_RESPONSES
from auth.routes import get_current_user
from retail_assistant.rag import search_products
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


# --- Routes ------------------------------------------------------------------
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
        except:
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
        llm_resp = chat_with_llm(
            messages=messages,
            system_prompt=f"""You are Orbit, EIP's retail assistant.
            The user is looking for products. Use these search results to answer:
            {products}
            Be helpful, concise, and recommend specific products with prices."""
        )
        answer = llm_resp.get("content", MOCK_RESPONSES["general"])
        if isinstance(answer, str):
            answer_text = answer
        else:
            answer_text = f"Here are some products matching your query. I found {len(products)} relevant items."
        response_data = {"answer_text": answer_text, "products": products, "chart_data": []}

    elif intent == "business_data_query":
        response_data = {
            "answer_text": "Business data queries and database operations are disabled in the AI Assistant workspace. Please use the DataMart Engine workspace to query and analyze datasets.",
            "chart_data": [],
            "products": []
        }

    else:  # general_support
        llm_resp = chat_with_llm(
            messages=messages,
            system_prompt="""You are Orbit, the intelligent assistant for EIP: Enterprise Intelligence Platform.
            Help users with general questions about the platform, navigation, and support.
            Be professional, concise, and friendly.""",
            tools_enabled=False
        )
        content = llm_resp.get("content", MOCK_RESPONSES["general"])
        response_data = {"answer_text": content if isinstance(content, str) else MOCK_RESPONSES["general"], "chart_data": [], "products": []}

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


@router.get("/conversations")
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convs = db.query(AssistantConversation).filter(
        AssistantConversation.user_id == current_user.id
    ).order_by(AssistantConversation.created_at.desc()).limit(10).all()
    return [{"id": str(c.id), "created_at": str(c.created_at)} for c in convs]
