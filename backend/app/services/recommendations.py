import re
from collections import Counter
from decimal import Decimal
from app.schemas.shop import Product
from app.services.catalog import PRODUCTS

# ── Query parsing helpers ────────────────────────────────────────────────────

_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Electronics": ["electronics", "tech", "gadget", "laptop", "computer", "headphone", "speaker", "camera", "monitor"],
    "Style": ["fashion", "clothing", "clothes", "style", "wear", "shirt", "dress", "pants", "jacket", "shoe", "sneaker"],
    "Home": ["home", "furniture", "kitchen", "bedroom", "living", "house", "decor", "candle", "pillow"],
    "Wellness": ["wellness", "health", "fitness", "gym", "yoga", "sport", "exercise", "workout", "supplement"],
    "Beauty": ["beauty", "cosmetics", "makeup", "skincare", "lipstick", "foundation", "mascara", "perfume", "fragrance", "lotion", "cream", "serum", "moisturizer", "toner", "blush", "concealer", "eyeliner", "eyeshadow", "skincare", "glow", "face wash", "cleanser"],
    "Mobile": ["mobile", "phone", "smartphone", "iphone", "android", "tablet"],
    "Gifts": ["gift", "present", "birthday", "holiday", "christmas", "anniversary", "mom", "dad", "friend"],
    "Outdoors": ["outdoor", "hiking", "camping", "trail", "backpack", "bottle", "water bottle", "daypack"],
}


def parse_price_filter(query: str) -> tuple[Decimal | None, Decimal | None]:
    """Extract min/max price constraints from a natural language query."""
    q = query.lower()
    max_price: Decimal | None = None
    min_price: Decimal | None = None

    under = re.search(r"(?:under|below|less than|cheaper than|max|within|budget of)\s*\$?(\d+)", q)
    over  = re.search(r"(?:over|above|more than|at least|min(?:imum)?)\s*\$?(\d+)", q)
    around = re.search(r"(?:around|about|~)\s*\$?(\d+)", q)
    bare   = re.search(r"\$(\d+)", q)

    if under:
        max_price = Decimal(under.group(1))
    if over:
        min_price = Decimal(over.group(1))
    if around:
        amt = Decimal(around.group(1))
        min_price = amt * Decimal("0.7")
        max_price = amt * Decimal("1.3")
    if bare and not under and not around:
        max_price = Decimal(bare.group(1))

    return min_price, max_price


def parse_category_filter(query: str) -> str | None:
    """Detect a product category mentioned in the query."""
    q = query.lower()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            return category
    return None


def score_product(product: Product, terms: list[str], preferred_categories: list[str]) -> float:
    haystack = " ".join([product.name, product.description, product.category, product.brand, *product.tags]).lower()
    score = product.rating * 2
    score += sum(4 for term in terms if term and term in haystack)
    if product.category in preferred_categories:
        score += 6
    return score


def parse_query_terms(query: str) -> list[str]:
    return [term.strip("$,.!?").lower() for term in query.split() if len(term.strip("$,.!?")) > 1]


def max_budget(query: str) -> Decimal | None:
    terms = parse_query_terms(query)
    for index, term in enumerate(terms):
        if term.isdigit() and (index == 0 or terms[index - 1] in {"under", "below", "less"}):
            return Decimal(term)
    return None


def search_products(query: str, limit: int = 12) -> list[Product]:
    terms = parse_query_terms(query)
    budget = max_budget(query)
    candidates = [product for product in PRODUCTS if budget is None or product.price <= budget]
    ranked = sorted(candidates, key=lambda product: score_product(product, terms, []), reverse=True)
    return [product for product in ranked[:limit] if score_product(product, terms, []) > product.rating * 2 or not terms]


def search_products_smart(query: str, limit: int = 12) -> list[Product]:
    """Enhanced search with price range and category filters extracted from natural language."""
    terms = parse_query_terms(query)
    min_price, max_price = parse_price_filter(query)
    category = parse_category_filter(query)

    candidates = PRODUCTS
    if min_price is not None:
        candidates = [p for p in candidates if p.price >= min_price]
    if max_price is not None:
        candidates = [p for p in candidates if p.price <= max_price]
    if category:
        preferred = [p for p in candidates if p.category == category]
        if preferred:
            candidates = preferred

    if not candidates:
        candidates = PRODUCTS  # widen if filters leave nothing

    preferred_categories = [category] if category else []
    ranked = sorted(candidates, key=lambda p: score_product(p, terms, preferred_categories), reverse=True)

    # Return any result if there are terms; otherwise top-rated
    if terms:
        return ranked[:limit]
    return sorted(ranked, key=lambda p: p.rating, reverse=True)[:limit]


def personal_recommendations(history: list[dict], limit: int = 10) -> list[Product]:
    categories = [event.get("metadata", {}).get("category") for event in history if event.get("metadata", {}).get("category")]
    product_ids = [event.get("product_id") for event in history if event.get("product_id")]
    preferred = [category for category, _ in Counter(categories).most_common(3)]
    seen = {product_id for product_id in product_ids if product_id}
    ranked = sorted(PRODUCTS, key=lambda product: score_product(product, product.tags, preferred), reverse=True)
    unseen = [product for product in ranked if product.id not in seen]
    return (unseen or ranked)[:limit]


def similar_products(product_id: str, limit: int = 8) -> list[Product]:
    current = next((product for product in PRODUCTS if product.id == product_id), None)
    if not current:
        return sorted(PRODUCTS, key=lambda product: product.rating, reverse=True)[:limit]
    terms = [current.category, current.brand, *current.tags]
    ranked = sorted(
        [product for product in PRODUCTS if product.id != product_id],
        key=lambda product: score_product(product, terms, [current.category]),
        reverse=True,
    )
    return ranked[:limit]


def bundle_recommendations(product_ids: list[str], limit: int = 5) -> list[Product]:
    selected = [product for product in PRODUCTS if product.id in product_ids]
    categories = [product.category for product in selected]
    complementary = {
        "Electronics": ["Home", "Wellness"],
        "Style": ["Gifts", "Wellness"],
        "Home": ["Gifts", "Wellness"],
        "Wellness": ["Gifts", "Electronics"],
        "Mobile": ["Electronics", "Gifts"],
        "Gifts": ["Wellness", "Home"],
    }
    wanted = {item for category in categories for item in complementary.get(category, [])}
    ranked = sorted(
        [product for product in PRODUCTS if product.id not in product_ids],
        key=lambda product: (product.category in wanted, product.rating, product.stock),
        reverse=True,
    )
    return ranked[:limit]
