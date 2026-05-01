import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from sqlalchemy import select, text as sql_text

from app.core.deps import DBDep, RedisDep, OptionalUser
from app.models.order import Order
from app.schemas.shop import AssistantChatRequest, Product as ProductSchema
from app.services.openai_service import assistant_stream
from app.services import recommendations as rec_svc

router = APIRouter(tags=["assistant"])
logger = logging.getLogger(__name__)

_ORDER_KEYWORDS = {"order", "track", "tracking", "shipping", "delivery", "status", "purchase", "bought", "where is"}


async def _db_text_search(query: str, db, limit: int = 5) -> list[ProductSchema]:
    """Full-text ILIKE search against the products table."""
    try:
        result = await db.execute(
            sql_text("""
                SELECT id, name, description, price, category, brand, rating, stock,
                       images, colors, sizes, tags, created_at
                FROM products
                WHERE name ILIKE :q
                   OR description ILIKE :q
                   OR category ILIKE :q
                   OR brand ILIKE :q
                   OR EXISTS (
                       SELECT 1 FROM unnest(tags) t WHERE t ILIKE :q
                   )
                ORDER BY rating DESC
                LIMIT :lim
            """),
            {"q": f"%{query.strip()}%", "lim": limit},
        )
        rows = result.fetchall()
        return [
            ProductSchema(
                id=row.id,
                name=row.name,
                description=row.description,
                price=row.price,
                category=row.category,
                brand=row.brand,
                rating=row.rating,
                stock=row.stock,
                images=row.images or [],
                colors=row.colors or [],
                sizes=row.sizes or [],
                tags=row.tags or [],
                created_at=row.created_at,
            )
            for row in rows
        ]
    except Exception as exc:
        logger.warning("DB text search failed: %s", exc)
        return []


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

    # 2. Fall back to DB full-text search
    if not context_products and latest.strip():
        context_products = await _db_text_search(latest, db, limit=5)

    # 3. Fall back to filtered keyword search (in-memory catalog)
    if not context_products and latest.strip():
        context_products = rec_svc.search_products_smart(latest, limit=5)

    # 4. Fall back to personalised recs
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
