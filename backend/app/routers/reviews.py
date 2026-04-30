from fastapi import APIRouter

from app.schemas.shop import Review, ReviewSummary, ReviewSummaryRequest
from app.services.catalog import PRODUCTS, REVIEWS
from datetime import datetime, timezone

router = APIRouter(tags=["reviews"])


@router.get("/reviews/{product_id}", response_model=list[Review])
def get_reviews(product_id: str) -> list[Review]:
    product_reviews = [r for r in REVIEWS if r.product_id == product_id]
    if product_reviews:
        return product_reviews
    return [
        Review(
            id=900 + i,
            product_id=product_id,
            user_id=u,
            rating=rating,
            content=content,
            sentiment_score=score,
            created_at=datetime.now(timezone.utc),
        )
        for i, (u, rating, content, score) in enumerate([
            ("nora", 5, "Quality feels better than expected and setup was simple.", 0.88),
            ("eli", 4, "Good value overall, though I wish there were more color options.", 0.7),
            ("jules", 5, "The recommendation was spot on for my needs.", 0.9),
        ])
    ]


@router.post("/reviews/summarize", response_model=ReviewSummary)
def summarize_reviews(payload: ReviewSummaryRequest) -> ReviewSummary:
    reviews = get_reviews(payload.product_id)
    positives = ["quality", "easy setup", "strong value"]
    negatives = ["limited color options", "availability varies"]
    if any("battery" in r.content.lower() for r in reviews):
        positives.append("battery life")
    if any("bulky" in r.content.lower() or "small" in r.content.lower() for r in reviews):
        negatives.append("fit or size expectations")
    return ReviewSummary(
        positive_themes=positives[:4],
        negative_themes=negatives[:3],
        summary="Customers are broadly positive, especially around quality and usefulness.",
    )


@router.get("/reviews/qa/{product_id}")
def review_qa(product_id: str) -> list[dict]:
    product = next((p for p in PRODUCTS if p.id == product_id), None)
    name = product.name if product else "this product"
    return [
        {"question": "Is it giftable?", "answer": f"Yes. {name} has broad appeal and arrives in practical packaging."},
        {"question": "How fast does it ship?", "answer": "Most in-stock items estimate delivery in three to five business days."},
        {"question": "What should I compare it with?", "answer": "Compare rating, stock, use case tags, and the similar product carousel."},
    ]
