"""OpenAI integration: embeddings and chat completions with streaming."""
import asyncio
import json
import logging
from typing import AsyncGenerator

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.product import Product as ProductModel
from app.schemas.shop import Product, AssistantMessage
from app.services.recommendations import search_products as keyword_search, personal_recommendations

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_client():
    if not settings.openai_api_key:
        return None
    try:
        from openai import AsyncOpenAI
        return AsyncOpenAI(api_key=settings.openai_api_key)
    except Exception:
        return None


def _product_embedding_text(p: ProductModel) -> str:
    tags = ", ".join(p.tags) if p.tags else ""
    return (
        f"{p.name}. {p.description} "
        f"Category: {p.category}. Brand: {p.brand}. Tags: {tags}. "
        f"Price: ${p.price}."
    )


async def embed_text(text: str) -> list[float] | None:
    client = _get_client()
    if not client:
        return None
    try:
        resp = await client.embeddings.create(
            model=settings.openai_embedding_model,
            input=text,
        )
        return resp.data[0].embedding
    except Exception as e:
        logger.warning("Embedding failed: %s", e)
        return None


async def generate_product_embeddings(db: AsyncSession) -> None:
    """Generate and store embeddings for products that don't have them yet."""
    client = _get_client()
    if not client:
        logger.info("No OpenAI key — skipping embedding generation")
        return

    result = await db.execute(
        select(ProductModel).where(ProductModel.embedding == None)  # noqa: E711
    )
    products = result.scalars().all()

    if not products:
        logger.info("All products already have embeddings")
        return

    logger.info("Generating embeddings for %d products...", len(products))

    # Batch in groups of 100 to respect API limits
    BATCH = 100
    for i in range(0, len(products), BATCH):
        batch = products[i : i + BATCH]
        texts = [_product_embedding_text(p) for p in batch]
        try:
            resp = await client.embeddings.create(
                model=settings.openai_embedding_model,
                input=texts,
            )
            for product, emb_data in zip(batch, resp.data):
                await db.execute(
                    update(ProductModel)
                    .where(ProductModel.id == product.id)
                    .values(embedding=emb_data.embedding)
                )
            await db.commit()
            logger.info("Embedded batch %d/%d", min(i + BATCH, len(products)), len(products))
            await asyncio.sleep(0.5)  # rate limit courtesy
        except Exception as e:
            logger.error("Embedding batch failed: %s", e)
            await db.rollback()


async def vector_search(query: str, db: AsyncSession, limit: int = 12) -> list[Product]:
    """Semantic search using cosine similarity against stored embeddings."""
    client = _get_client()
    if not client:
        return []

    query_vec = await embed_text(query)
    if not query_vec:
        return []

    try:
        # Use raw SQL for pgvector cosine similarity
        from sqlalchemy import text
        sql = text("""
            SELECT id, name, description, price, category, brand, rating, stock,
                   images, colors, sizes, tags, created_at,
                   (embedding::vector) <=> CAST(:vec AS vector) AS distance
            FROM products
            WHERE embedding IS NOT NULL
            ORDER BY (embedding::vector) <=> CAST(:vec AS vector)
            LIMIT :limit
        """)
        result = await db.execute(sql, {"vec": str(query_vec), "limit": limit})
        rows = result.fetchall()

        products = []
        for row in rows:
            products.append(Product(
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
            ))
        return products
    except Exception as e:
        logger.error("Vector search failed: %s", e)
        return []


async def assistant_stream(
    messages: list[AssistantMessage],
    context_products: list[Product],
    session_id: str,
    orders: list | None = None,
) -> AsyncGenerator[str, None]:
    """Stream assistant response as SSE data events."""
    client = _get_client()

    if not client:
        async for chunk in _rule_based_stream(messages, context_products, orders=orders or []):
            yield chunk
        return

    # Build system prompt with product context
    product_context = "\n".join(
        f"- {p.name} (${p.price}, {p.category}, rating: {p.rating}, stock: {p.stock}): {p.description}"
        for p in context_products[:5]
    )
    system_prompt = f"""You are ShopMind, a helpful e-commerce shopping assistant. 
You help customers find products, compare options, and make purchase decisions.
Be concise, friendly, and focus on helping users find what they need.

Current relevant products:
{product_context if product_context else "No specific products found yet."}

Guidelines:
- If asked about orders/tracking, explain they can view order history in their account.
- Keep responses under 3 sentences unless comparing products.
- Always suggest specific products when possible.
- If no products match, suggest broadening the search."""

    try:
        openai_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages[-8:]:  # last 8 messages for context window
            if msg.role in ("user", "assistant") and msg.content.strip():
                openai_messages.append({"role": msg.role, "content": msg.content})

        stream = await client.chat.completions.create(
            model=settings.openai_chat_model,
            messages=openai_messages,
            stream=True,
            max_tokens=300,
            temperature=0.7,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield f"data: {json.dumps({'token': delta.content})}\n\n"

        # Send products after text
        yield f"data: {json.dumps({'products': [p.model_dump(mode='json') for p in context_products[:3]]})}\n\n"

    except Exception as e:
        logger.error("OpenAI stream failed: %s", e)
        async for chunk in _rule_based_stream(messages, context_products, orders=orders or []):
            yield chunk


async def _rule_based_stream(
    messages: list[AssistantMessage],
    products: list[Product],
    orders: list | None = None,
) -> AsyncGenerator[str, None]:
    """Smart rule-based streaming — handles ordering, cart, filtering, comparison."""
    import asyncio
    orders = orders or []
    latest = next((m.content for m in reversed(messages) if m.role == "user"), "")
    lower = latest.lower()

    async def stream_text(text: str) -> None:
        for token in text.split(" "):
            await asyncio.sleep(0.025)
            yield f"data: {json.dumps({'token': token + ' '})}\n\n"

    # ── Intent: order tracking ───────────────────────────────────────────────
    if any(w in lower for w in ["order", "track", "shipping", "delivery", "purchase", "bought"]):
        if orders:
            count = len(orders)
            text = f"I found {count} recent order{'s' if count > 1 else ''} for you:"
            async for chunk in stream_text(text):
                yield chunk
            order_data = [
                {
                    "id": str(o.id)[:8],
                    "status": o.status.value,
                    "total": str(o.total_amount),
                    "created_at": o.created_at.strftime("%b %d, %Y"),
                }
                for o in orders
            ]
            yield f"data: {json.dumps({'order_status': order_data})}\n\n"
        else:
            text = "I don't see any orders yet. Once you place an order you can track it here or in the Orders page."
            async for chunk in stream_text(text):
                yield chunk
            yield f"data: {json.dumps({'products': []})}\n\n"
        return

    # ── Intent: add to cart ──────────────────────────────────────────────────
    add_words = {"add", "buy", "get me", "i want", "i'll take", "put", "purchase"}
    if any(w in lower for w in add_words) and products:
        best = products[0]
        text = f"Done! I've added {best.name} to your cart."
        async for chunk in stream_text(text):
            yield chunk
        yield f"data: {json.dumps({'action': 'add_to_cart', 'product': best.model_dump(mode='json')})}\n\n"
        yield f"data: {json.dumps({'products': [p.model_dump(mode='json') for p in products[:3]]})}\n\n"
        return

    # ── Intent: compare ─────────────────────────────────────────────────────
    if "compare" in lower and len(products) >= 2:
        p1, p2 = products[0], products[1]
        winner = p1 if p1.rating >= p2.rating else p2
        text = (
            f"Here's a quick comparison — {p1.name} (${p1.price}, ⭐ {p1.rating}) vs "
            f"{p2.name} (${p2.price}, ⭐ {p2.rating}). "
            f"The {winner.name} has the better rating overall."
        )
        async for chunk in stream_text(text):
            yield chunk
        yield f"data: {json.dumps({'products': [p.model_dump(mode='json') for p in products[:3]]})}\n\n"
        return

    # ── Intent: budget / price filter ───────────────────────────────────────
    from app.services.recommendations import parse_price_filter
    min_p, max_p = parse_price_filter(latest)
    if (min_p or max_p) and products:
        price_hint = f"under ${max_p}" if max_p else f"over ${min_p}"
        text = f"Found {len(products)} option{'s' if len(products) != 1 else ''} {price_hint}. Top pick: {products[0].name} at ${products[0].price}."
        async for chunk in stream_text(text):
            yield chunk
        yield f"data: {json.dumps({'products': [p.model_dump(mode='json') for p in products[:3]]})}\n\n"
        return

    # ── Generic with results ─────────────────────────────────────────────────
    if products:
        text = (
            f"Found {len(products)} great match{'es' if len(products) != 1 else ''} for you! "
            f"Top pick: {products[0].name} at ${products[0].price} — rated {products[0].rating:.1f} ⭐."
        )
        async for chunk in stream_text(text):
            yield chunk
        yield f"data: {json.dumps({'products': [p.model_dump(mode='json') for p in products[:3]]})}\n\n"
        return

    # ── No results ───────────────────────────────────────────────────────────
    text = "I didn't find an exact match. Try searching by category (Electronics, Style, Home, Wellness) or describe what you need."
    async for chunk in stream_text(text):
        yield chunk
    yield f"data: {json.dumps({'products': []})}\n\n"
