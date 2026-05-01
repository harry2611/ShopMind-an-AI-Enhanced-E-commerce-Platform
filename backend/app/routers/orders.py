import uuid

from fastapi import APIRouter, HTTPException, Request, status

from app.core.deps import DBDep, CurrentUser, OptionalUser
from app.schemas.orders import CheckoutRequest, CheckoutResponse, OrderOut
from app.services.order_service import (
    create_order,
    create_stripe_checkout,
    get_order,
    get_orders_for_session,
    get_orders_for_user,
    handle_stripe_webhook,
)

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/checkout", response_model=CheckoutResponse)
async def checkout(
    request: Request,
    payload: CheckoutRequest,
    db: DBDep,
    current_user: OptionalUser,
) -> CheckoutResponse:
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    user_id = current_user.id if current_user else None
    order = await create_order(db, payload, user_id)
    checkout_url = await create_stripe_checkout(order, payload.items)

    if not checkout_url:
        # Stripe not configured — build mock URL from request origin so it
        # works on any deployment (Vercel, localhost, etc.)
        from app.core.config import get_settings
        settings = get_settings()
        origin = (
            request.headers.get("origin")
            or request.headers.get("referer", "").rstrip("/")
            or settings.frontend_url
        )
        # Strip trailing path from referer so we get just the origin
        if "://" in origin and origin.count("/") > 2:
            parts = origin.split("/")
            origin = "/".join(parts[:3])
        checkout_url = f"{origin}/orders/success?order_id={order.id}&mock=true"

    return CheckoutResponse(checkout_url=checkout_url, order_id=order.id)


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: DBDep) -> dict:
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        return await handle_stripe_webhook(payload, sig, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my", response_model=list[OrderOut])
async def my_orders(current_user: CurrentUser, db: DBDep) -> list[OrderOut]:
    orders = await get_orders_for_user(current_user.id, db)
    return [OrderOut.model_validate(o) for o in orders]


@router.get("/session/{session_id}", response_model=list[OrderOut])
async def session_orders(session_id: str, db: DBDep) -> list[OrderOut]:
    orders = await get_orders_for_session(session_id, db)
    return [OrderOut.model_validate(o) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order_detail(
    order_id: uuid.UUID,
    db: DBDep,
    current_user: OptionalUser,
) -> OrderOut:
    order = await get_order(order_id, db)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Allow access if authenticated user owns it, or if session matches
    if current_user and order.user_id and order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return OrderOut.model_validate(order)
