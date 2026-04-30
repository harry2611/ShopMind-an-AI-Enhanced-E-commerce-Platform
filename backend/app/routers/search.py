from collections import defaultdict

from fastapi import APIRouter
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import DBDep, RedisDep
from app.schemas.shop import (
    AutocompleteRequest,
    AutocompleteResponse,
    SemanticSearchRequest,
    SemanticSearchResponse,
)
from app.services import recommendations as rec_svc
from app.services.openai_service import vector_search
from app.services.catalog import PRODUCTS as CATALOG

router = APIRouter(tags=["search"])

CORRECTIONS = {
    "headfones": "headphones",
    "vedio": "video",
    "labtop": "laptop",
    "sneekers": "sneakers",
}


def _spell_correct(query: str) -> str | None:
    corrected = " ".join(CORRECTIONS.get(t.lower(), t) for t in query.split())
    return corrected if corrected != query else None


def _zero_result_suggestions(query: str) -> list[str]:
    terms = rec_svc.parse_query_terms(query)
    if "mom" in terms or "gift" in terms:
        return ["wellness gifts under $50", "travel gifts", "home comfort gifts"]
    if "laptop" in terms or "video" in terms:
        return ["creator laptop", "OLED laptop", "desk setup"]
    if "shoe" in terms or "shoes" in terms:
        return ["red running shoes under $50", "lightweight sneakers", "daily trainers"]
    return ["best rated products", "gifts under $50", "work from home essentials"]


async def _search(query: str, db: AsyncSession, limit: int = 12):
    """Try vector search first, fall back to keyword."""
    results = await vector_search(query, db, limit=limit)
    if results:
        return results
    return rec_svc.search_products(query, limit=limit)


async def _record_search(session_id: str | None, query: str, redis: Redis) -> None:
    if not session_id or not query:
        return
    key = f"recent_searches:{session_id}"
    await redis.lrem(key, 0, query)
    await redis.lpush(key, query)
    await redis.ltrim(key, 0, 5)
    await redis.expire(key, 86400 * 30)


async def _get_recent(session_id: str | None, redis: Redis) -> list[str]:
    if not session_id:
        return []
    return await redis.lrange(f"recent_searches:{session_id}", 0, 5)


@router.get("/products/search", response_model=SemanticSearchResponse)
async def product_search(query: str, db: DBDep, redis: RedisDep) -> SemanticSearchResponse:
    items = await _search(query, db)
    return SemanticSearchResponse(
        items=items,
        did_you_mean=_spell_correct(query),
        suggestions=_zero_result_suggestions(query),
    )


@router.post("/search/semantic", response_model=SemanticSearchResponse)
async def semantic_search(payload: SemanticSearchRequest, db: DBDep, redis: RedisDep) -> SemanticSearchResponse:
    await _record_search(payload.session_id, payload.query, redis)
    items = await _search(payload.query, db)
    return SemanticSearchResponse(
        items=items,
        did_you_mean=_spell_correct(payload.query),
        suggestions=_zero_result_suggestions(payload.query),
    )


@router.post("/search/autocomplete", response_model=AutocompleteResponse)
async def autocomplete(payload: AutocompleteRequest, db: DBDep, redis: RedisDep) -> AutocompleteResponse:
    terms = rec_svc.parse_query_terms(payload.query)
    recent = await _get_recent(payload.session_id, redis)

    products = await _search(payload.query, db, limit=5) if payload.query else []

    categories = sorted({
        p.category for p in CATALOG
        if any(t in p.category.lower() or t in p.name.lower() for t in terms)
    })[:5]

    return AutocompleteResponse(
        products=products,
        categories=categories or ["Electronics", "Style", "Gifts"],
        recent_searches=recent,
    )


@router.post("/search/correct")
async def correct_search(payload: SemanticSearchRequest) -> dict:
    return {"did_you_mean": _spell_correct(payload.query)}
