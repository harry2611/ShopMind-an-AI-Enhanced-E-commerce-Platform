import logging

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal, close_redis, engine
from app.routers import assistant, auth, events, orders, products, recommendations, reviews, search
from app.services.openai_service import generate_product_embeddings
from app.services.seed import create_tables, seed_products

# Logging setup
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
logging.basicConfig(level=logging.INFO)
logger = structlog.get_logger()

settings = get_settings()

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.api_rate_limit])

app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    logger.info(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    logger.error("unhandled_error", path=request.url.path, error=str(exc), traceback=traceback.format_exc())
    # Show actual error in non-production so we can diagnose issues
    detail = str(exc) if not settings.is_production else "Internal server error"
    return JSONResponse(status_code=500, content={"detail": detail})


# Register all routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(search.router)
app.include_router(recommendations.router)
app.include_router(reviews.router)
app.include_router(events.router)
app.include_router(assistant.router)
app.include_router(orders.router)


@app.get("/health")
async def health() -> dict:
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    from app.core.database import get_redis_client
    try:
        redis = await get_redis_client()
        await redis.ping()
        redis_ok = True
    except Exception:
        redis_ok = False

    return {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "error",
        "redis": "ok" if redis_ok else "error",
        "version": "2.0.0",
    }


@app.on_event("startup")
async def startup() -> None:
    logger.info("startup", environment=settings.environment)
    try:
        await create_tables(engine)
        logger.info("tables_created_or_verified")
    except Exception as e:
        logger.error("table_creation_failed", error=str(e))
        raise

    try:
        async with AsyncSessionLocal() as db:
            await seed_products(db)
            await generate_product_embeddings(db)
        logger.info("seed_complete")
    except Exception as e:
        logger.error("seed_failed", error=str(e))
        raise

    logger.info("startup_complete")


@app.on_event("shutdown")
async def shutdown() -> None:
    await close_redis()
    await engine.dispose()
    logger.info("shutdown")
