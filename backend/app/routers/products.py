from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from app.core.deps import DBDep
from app.models.product import Product as ProductModel
from app.schemas.shop import Product, ProductList

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductList)
async def list_products(
    db: DBDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    sort: str = "relevance",
    category: Annotated[list[str] | None, Query()] = None,
    brand: Annotated[list[str] | None, Query()] = None,
    rating: float = Query(1.0, ge=1, le=5),
    in_stock: bool = False,
    min_price: Decimal = Decimal("0"),
    max_price: Decimal = Decimal("10000"),
) -> ProductList:
    q = select(ProductModel)

    if category:
        q = q.where(ProductModel.category.in_(category))
    if brand:
        q = q.where(ProductModel.brand.in_(brand))
    q = q.where(ProductModel.rating >= rating)
    if in_stock:
        q = q.where(ProductModel.stock > 0)
    q = q.where(ProductModel.price >= min_price, ProductModel.price <= max_price)

    # Count total
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Sort
    sort_map = {
        "price_low": ProductModel.price.asc(),
        "price_high": ProductModel.price.desc(),
        "newest": ProductModel.created_at.desc(),
        "best_rated": ProductModel.rating.desc(),
    }
    order_col = sort_map.get(sort, ProductModel.rating.desc())
    q = q.order_by(order_col).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(q)
    items = [Product.model_validate(p) for p in result.scalars().all()]
    return ProductList(items=items, total=total, page=page, page_size=page_size)


@router.get("/trending", response_model=list[Product])
async def trending_products(db: DBDep) -> list[Product]:
    result = await db.execute(
        select(ProductModel)
        .order_by(ProductModel.rating.desc(), ProductModel.stock.desc())
        .limit(10)
    )
    return [Product.model_validate(p) for p in result.scalars().all()]


@router.get("/{product_id}", response_model=Product)
async def get_product(product_id: str, db: DBDep) -> Product:
    result = await db.execute(select(ProductModel).where(ProductModel.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product.model_validate(product)
