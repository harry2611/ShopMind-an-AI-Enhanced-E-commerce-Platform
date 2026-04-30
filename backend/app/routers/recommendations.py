from fastapi import APIRouter

from app.core.deps import DBDep, RedisDep
from app.schemas.shop import (
    BundleRecommendationRequest,
    PersonalRecommendationRequest,
    Product,
    SimilarRecommendationRequest,
)
from app.services import recommendations as rec_svc

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("/personal", response_model=list[Product])
async def personal(payload: PersonalRecommendationRequest, db: DBDep, redis: RedisDep) -> list[Product]:
    key = f"events:{payload.session_id}"
    import json
    stored_raw = await redis.lrange(key, 0, 199)
    stored = [json.loads(e) for e in stored_raw]
    combined = [*payload.history, *stored]
    return rec_svc.personal_recommendations(combined)


@router.post("/similar", response_model=list[Product])
async def similar(payload: SimilarRecommendationRequest) -> list[Product]:
    return rec_svc.similar_products(payload.product_id)


@router.post("/bundle", response_model=list[Product])
async def bundle(payload: BundleRecommendationRequest) -> list[Product]:
    return rec_svc.bundle_recommendations(payload.product_ids)


@router.get("/personalization/{session_id}", response_model=list[Product])
async def personalization(session_id: str, redis: RedisDep) -> list[Product]:
    import json
    stored_raw = await redis.lrange(f"events:{session_id}", 0, 199)
    stored = [json.loads(e) for e in stored_raw]
    return rec_svc.personal_recommendations(stored)
