"""Seed the database from the in-memory catalog on first startup."""
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Base, Product as ProductModel  # imports __init__.py → registers ALL models with metadata
from app.services.catalog import PRODUCTS, REVIEWS

logger = logging.getLogger(__name__)


async def create_tables(engine) -> None:
    """Create all tables if they don't exist (via SQLAlchemy metadata).

    Note: vector/pg_trgm/uuid-ossp extensions are already created by
    db/init.sql which runs as the postgres superuser during container init.
    We cannot run CREATE EXTENSION here because the shopmind app user is
    not a superuser — doing so aborts the transaction before create_all runs.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured")


async def seed_products(db: AsyncSession) -> None:
    """Insert catalog products that are not already in DB."""
    result = await db.execute(select(ProductModel.id))
    existing_ids = {row[0] for row in result.fetchall()}

    to_insert = [p for p in PRODUCTS if p.id not in existing_ids]
    if not to_insert:
        logger.info("Products already seeded, skipping")
        return

    for p in to_insert:
        db.add(ProductModel(
            id=p.id,
            name=p.name,
            description=p.description,
            price=p.price,
            category=p.category,
            brand=p.brand,
            rating=p.rating,
            stock=p.stock,
            images=p.images,
            colors=p.colors,
            sizes=p.sizes,
            tags=p.tags,
            created_at=p.created_at,
        ))

    await db.commit()
    logger.info("Seeded %d products", len(to_insert))
