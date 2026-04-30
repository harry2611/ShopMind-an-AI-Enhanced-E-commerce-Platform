import json

from fastapi import APIRouter

from app.core.deps import RedisDep
from app.schemas.shop import TrackEventRequest

router = APIRouter(tags=["events"])


@router.post("/events/track")
async def track_event(payload: TrackEventRequest, redis: RedisDep) -> dict:
    event = payload.model_dump()
    key = f"events:{payload.session_id}"
    await redis.lpush(key, json.dumps(event, default=str))
    await redis.ltrim(key, 0, 199)
    await redis.expire(key, 86400 * 30)

    if payload.event_type == "search" and isinstance(payload.metadata.get("query"), str):
        query = payload.metadata["query"]
        search_key = f"recent_searches:{payload.session_id}"
        await redis.lrem(search_key, 0, query)
        await redis.lpush(search_key, query)
        await redis.ltrim(search_key, 0, 5)
        await redis.expire(search_key, 86400 * 30)

    return {"ok": True}
