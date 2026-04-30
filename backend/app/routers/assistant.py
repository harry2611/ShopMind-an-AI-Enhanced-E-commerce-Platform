import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.core.deps import DBDep, RedisDep, OptionalUser
from app.models.order import Order
from app.schemas.shop import AssistantChatRequest
from app.services.openai_service import assistant_stream
from app.services import recommendations as rec_svc

router = APIRouter(tags=["assistant"])

_ORDER_KEYWORDS = {"order", "track", "tracking", "shipping", "delivery", "status", "purchase", "bought", "where is"}


@router.post("/assistant/chat")
async def assistant_chat(
    payload: AssistantChatRequest,
    db: DBDep,
    redis: RedisDep,
    current_user: OptionalUser,
) -> StreamingResponse:
    latest = next((m.content for m in reversed(payload.messages) if m.role == "user"), "")
    lower = latest.lower()

    # 1. Try vector search (requires OpenAI key + embeddings)
    from app.services.openai_service import vector_search
    context_products = await vector_search(latest, db, limit=5)

    # 2. Fall back to filtered keyword search
    if not context_products and latest.strip():
        context_products = rec_svc.search_products_smart(latest, limit=5)

    # 3. Fall back to personalised recs
    if not context_products:
        stored_raw = await redis.lrange(f"events:{payload.session_id}", 0, 49)
        stored = [json.loads(e) for e in stored_raw]
        context_products = rec_svc.personal_recommendations(stored, 5)

    # 4. Fetch orders if the user is asking about them
    orders: list[Order] = []
    if any(kw in lower for kw in _ORDER_KEYWORDS):
        if current_user:
            result = await db.execute(
                select(Order)
                .where(Order.user_id == current_user.id)
                .order_by(Order.created_at.desc())
                .limit(3)
            )
        else:
            result = await db.execute(
                select(Order)
                .where(Order.session_id == payload.session_id)
                .order_by(Order.created_at.desc())
                .limit(3)
            )
        orders = list(result.scalars().all())

    async def stream():
        async for chunk in assistant_stream(
            payload.messages, context_products, payload.session_id, orders=orders
        ):
            yield chunk

    return StreamingResponse(stream(), media_type="text/event-stream")
