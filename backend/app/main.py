import asyncio
import json
from collections import defaultdict
from decimal import Decimal
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.core.config import get_settings
from app.schemas.shop import (
    AssistantChatRequest,
    AutocompleteRequest,
    AutocompleteResponse,
    BundleRecommendationRequest,
    PersonalRecommendationRequest,
    Product,
    ProductList,
    Review,
    ReviewSummary,
    ReviewSummaryRequest,
    SemanticSearchRequest,
    SemanticSearchResponse,
    SimilarRecommendationRequest,
    TrackEventRequest,
)
from app.services.catalog import PRODUCTS, REVIEWS
from app.services.recommendations import (
    bundle_recommendations,
    parse_query_terms,
    personal_recommendations,
    search_products,
    similar_products,
)

settings = get_settings()
app = FastAPI(title=settings.app_name, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EVENTS_BY_SESSION: dict[str, list[dict]] = defaultdict(list)
RECENT_SEARCHES: dict[str, list[str]] = defaultdict(list)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/products", response_model=ProductList)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    sort: str = "relevance",
    category: Annotated[list[str] | None, Query()] = None,
    brand: Annotated[list[str] | None, Query()] = None,
    rating: float = Query(1, ge=1, le=5),
    in_stock: bool = False,
    min_price: Decimal = Decimal("0"),
    max_price: Decimal = Decimal("10000"),
) -> ProductList:
    filtered = [
        product
        for product in PRODUCTS
        if (not category or product.category in category)
        and (not brand or product.brand in brand)
        and product.rating >= rating
        and (not in_stock or product.stock > 0)
        and min_price <= product.price <= max_price
    ]
    if sort == "price_low":
        filtered.sort(key=lambda product: product.price)
    elif sort == "price_high":
        filtered.sort(key=lambda product: product.price, reverse=True)
    elif sort == "newest":
        filtered.sort(key=lambda product: product.created_at, reverse=True)
    elif sort == "best_rated":
        filtered.sort(key=lambda product: product.rating, reverse=True)
    else:
        filtered.sort(key=lambda product: (product.rating, product.stock), reverse=True)

    start = (page - 1) * page_size
    return ProductList(items=filtered[start : start + page_size], total=len(filtered), page=page, page_size=page_size)


@app.get("/products/trending", response_model=list[Product])
def trending_products() -> list[Product]:
    return sorted(PRODUCTS, key=lambda product: (product.rating, product.stock), reverse=True)[:10]


@app.get("/products/search", response_model=SemanticSearchResponse)
def product_search(query: str) -> SemanticSearchResponse:
    items = search_products(query)
    return SemanticSearchResponse(items=items, did_you_mean=spelling_correction(query), suggestions=zero_result_suggestions(query))


@app.get("/products/{product_id}", response_model=Product)
def get_product(product_id: str) -> Product:
    product = next((item for item in PRODUCTS if item.id == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.post("/recommendations/personal", response_model=list[Product])
def recommendations_personal(payload: PersonalRecommendationRequest) -> list[Product]:
    stored_events = EVENTS_BY_SESSION.get(payload.session_id, [])
    return personal_recommendations([*payload.history, *stored_events])


@app.post("/recommendations/similar", response_model=list[Product])
def recommendations_similar(payload: SimilarRecommendationRequest) -> list[Product]:
    return similar_products(payload.product_id)


@app.post("/recommendations/bundle", response_model=list[Product])
def recommendations_bundle(payload: BundleRecommendationRequest) -> list[Product]:
    return bundle_recommendations(payload.product_ids)


@app.post("/search/semantic", response_model=SemanticSearchResponse)
def semantic_search(payload: SemanticSearchRequest) -> SemanticSearchResponse:
    if payload.session_id and payload.query:
        RECENT_SEARCHES[payload.session_id] = [
            payload.query,
            *[query for query in RECENT_SEARCHES[payload.session_id] if query != payload.query],
        ][:6]
    items = search_products(payload.query)
    return SemanticSearchResponse(
        items=items,
        did_you_mean=spelling_correction(payload.query),
        suggestions=zero_result_suggestions(payload.query),
    )


@app.post("/search/autocomplete", response_model=AutocompleteResponse)
def autocomplete(payload: AutocompleteRequest) -> AutocompleteResponse:
    terms = parse_query_terms(payload.query)
    products = search_products(payload.query, limit=5) if payload.query else []
    categories = sorted(
        {
            product.category
            for product in PRODUCTS
            if any(term in product.category.lower() or term in product.name.lower() for term in terms)
        }
    )[:5]
    return AutocompleteResponse(
        products=products,
        categories=categories or ["Electronics", "Style", "Gifts"][:3],
        recent_searches=RECENT_SEARCHES.get(payload.session_id or "", []),
    )


@app.post("/search/correct")
def correct_search(payload: SemanticSearchRequest) -> dict[str, str | None]:
    return {"did_you_mean": spelling_correction(payload.query)}


@app.post("/assistant/chat")
async def assistant_chat(payload: AssistantChatRequest) -> StreamingResponse:
    async def stream():
        latest = next((message.content for message in reversed(payload.messages) if message.role == "user"), "")
        products = search_products(latest, limit=3) or personal_recommendations(EVENTS_BY_SESSION.get(payload.session_id, []), 3)
        intro = assistant_response(latest, products)
        for token in intro.split(" "):
            await asyncio.sleep(0.035)
            yield f"data: {json.dumps({'token': token + ' '})}\n\n"
        yield f"data: {json.dumps({'products': [product.model_dump(mode='json') for product in products]})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/events/track")
def track_event(payload: TrackEventRequest) -> dict[str, bool]:
    event = payload.model_dump()
    EVENTS_BY_SESSION[payload.session_id].insert(0, event)
    EVENTS_BY_SESSION[payload.session_id] = EVENTS_BY_SESSION[payload.session_id][:200]
    if payload.event_type == "search" and isinstance(payload.metadata.get("query"), str):
        query = payload.metadata["query"]
        RECENT_SEARCHES[payload.session_id] = [
            query,
            *[item for item in RECENT_SEARCHES[payload.session_id] if item != query],
        ][:6]
    return {"ok": True}


@app.get("/personalization/{session_id}", response_model=list[Product])
def personalization(session_id: str) -> list[Product]:
    return personal_recommendations(EVENTS_BY_SESSION.get(session_id, []))


@app.get("/reviews/{product_id}", response_model=list[Review])
def get_reviews(product_id: str) -> list[Review]:
    product_reviews = [review for review in REVIEWS if review.product_id == product_id]
    if product_reviews:
        return product_reviews
    return [
        Review(
            id=900 + index,
            product_id=product_id,
            user_id=user,
            rating=rating,
            content=content,
            sentiment_score=score,
            created_at=REVIEWS[0].created_at,
        )
        for index, (user, rating, content, score) in enumerate(
            [
                ("nora", 5, "Quality feels better than expected and setup was simple.", 0.88),
                ("eli", 4, "Good value overall, though I wish there were more color options.", 0.7),
                ("jules", 5, "The recommendation was spot on for my needs.", 0.9),
            ]
        )
    ]


@app.post("/reviews/summarize", response_model=ReviewSummary)
def summarize_reviews(payload: ReviewSummaryRequest) -> ReviewSummary:
    reviews = get_reviews(payload.product_id)
    positives = ["quality", "easy setup", "strong value"]
    negatives = ["limited color options", "availability varies"]
    if any("battery" in review.content.lower() for review in reviews):
        positives.append("battery life")
    if any("bulky" in review.content.lower() or "small" in review.content.lower() for review in reviews):
        negatives.append("fit or size expectations")
    return ReviewSummary(
        positive_themes=positives[:4],
        negative_themes=negatives[:3],
        summary="Customers are broadly positive, especially around quality and usefulness. The main caveats are sizing, color choice, or accessory bulk depending on the product.",
    )


@app.get("/reviews/qa/{product_id}")
def review_qa(product_id: str) -> list[dict[str, str]]:
    product = next((item for item in PRODUCTS if item.id == product_id), None)
    name = product.name if product else "this product"
    return [
        {"question": "Is it giftable?", "answer": f"Yes. {name} has broad appeal and arrives in practical packaging."},
        {"question": "How fast does it ship?", "answer": "Most in-stock items estimate delivery in three to five business days."},
        {"question": "What should I compare it with?", "answer": "Compare rating, stock, use case tags, and the similar product carousel."},
    ]


def spelling_correction(query: str) -> str | None:
    corrections = {
        "headfones": "headphones",
        "vedio": "video",
        "labtop": "laptop",
        "sneekers": "sneakers",
    }
    corrected = " ".join(corrections.get(term.lower(), term) for term in query.split())
    return corrected if corrected != query else None


def zero_result_suggestions(query: str) -> list[str]:
    terms = parse_query_terms(query)
    if "mom" in terms or "gift" in terms:
        return ["wellness gifts under $50", "travel gifts", "home comfort gifts"]
    if "laptop" in terms or "video" in terms:
        return ["creator laptop", "OLED laptop", "desk setup"]
    if "shoe" in terms or "shoes" in terms:
        return ["red running shoes under $50", "lightweight sneakers", "daily trainers"]
    return ["best rated products", "gifts under $50", "work from home essentials"]


def assistant_response(query: str, products: list[Product]) -> str:
    if "track" in query.lower() and "order" in query.lower():
        return "I can help track an order. Use your order number at checkout status; meanwhile, here are useful add-ons based on recent shopping."
    if "compare" in query.lower() and len(products) >= 2:
        return f"I would compare {products[0].name} and {products[1].name} on price, rating, stock, and use case. The first is the stronger fit for most shoppers."
    if products:
        under_budget = f" under {products[0].price}" if "under" in query.lower() else ""
        return f"I found {len(products)} strong option{'s' if len(products) != 1 else ''}{under_budget}. Start with {products[0].name}: it matches the intent and has a {products[0].rating:.1f} rating."
    return "I did not find an exact match, so I would broaden the category, set a budget, or search by recipient and occasion."
