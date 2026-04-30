from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from pydantic import BaseModel, Field


class Product(BaseModel):
    id: str
    name: str
    description: str
    price: Decimal
    category: str
    brand: str
    rating: float
    stock: int
    images: list[str]
    colors: list[str] = []
    sizes: list[str] = []
    tags: list[str] = []
    created_at: datetime


class ProductList(BaseModel):
    items: list[Product]
    total: int
    page: int
    page_size: int


class SemanticSearchRequest(BaseModel):
    query: str
    session_id: str | None = None


class SemanticSearchResponse(BaseModel):
    items: list[Product]
    did_you_mean: str | None = None
    suggestions: list[str] = []


class AutocompleteRequest(BaseModel):
    query: str
    session_id: str | None = None


class AutocompleteResponse(BaseModel):
    products: list[Product]
    categories: list[str]
    recent_searches: list[str]


class PersonalRecommendationRequest(BaseModel):
    session_id: str
    history: list[dict[str, Any]] = []


class SimilarRecommendationRequest(BaseModel):
    product_id: str


class BundleRecommendationRequest(BaseModel):
    product_ids: list[str] = []


class TrackEventRequest(BaseModel):
    session_id: str
    event_type: Literal["view", "category", "search", "cart_add", "cart_remove", "wishlist"]
    product_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AssistantMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str


class AssistantChatRequest(BaseModel):
    session_id: str
    messages: list[AssistantMessage]


class Review(BaseModel):
    id: int
    product_id: str
    user_id: str
    rating: int
    content: str
    sentiment_score: float
    created_at: datetime


class ReviewSummaryRequest(BaseModel):
    product_id: str


class ReviewSummary(BaseModel):
    positive_themes: list[str]
    negative_themes: list[str]
    summary: str
