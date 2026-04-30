from collections import Counter
from decimal import Decimal
from app.schemas.shop import Product
from app.services.catalog import PRODUCTS


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
