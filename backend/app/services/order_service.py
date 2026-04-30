"""Order creation and Stripe integration."""
import logging
import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.order import Order, OrderLine, OrderStatus
from app.schemas.orders import CartLineIn, CheckoutRequest

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_stripe():
    if not settings.stripe_secret_key:
        return None
    import stripe
    stripe.api_key = settings.stripe_secret_key
    return stripe


async def create_order(db: AsyncSession, payload: CheckoutRequest, user_id: uuid.UUID | None) -> Order:
    """Create a pending order in the DB."""
    total = sum(Decimal(str(item.product_price)) * item.quantity for item in payload.items)
    order = Order(
        user_id=user_id,
        session_id=payload.session_id,
        status=OrderStatus.pending,
        total_amount=total,
        customer_email=payload.customer_email,
    )
    db.add(order)
    await db.flush()  # get order.id

    for item in payload.items:
        db.add(OrderLine(
            order_id=order.id,
            product_id=item.product_id,
            product_name=item.product_name,
            product_price=item.product_price,
            product_image=item.product_image,
            quantity=item.quantity,
        ))

    await db.commit()
    await db.refresh(order)
    return order


async def create_stripe_checkout(order: Order, items: list[CartLineIn]) -> str | None:
    """Create a Stripe checkout session and return the URL."""
    stripe = _get_stripe()
    if not stripe:
        logger.warning("Stripe not configured — returning mock checkout URL")
        return None

    try:
        line_items = [
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": item.product_name,
                        **({"images": [item.product_image]} if item.product_image else {}),
                    },
                    "unit_amount": int(item.product_price * 100),  # cents
                },
                "quantity": item.quantity,
            }
            for item in items
        ]

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            success_url=settings.stripe_success_url,
            cancel_url=settings.stripe_cancel_url,
            metadata={"order_id": str(order.id)},
            **({"customer_email": order.customer_email} if order.customer_email else {}),
        )

        # Store Stripe session ID on order
        order.stripe_checkout_session_id = session.id
        return session.url

    except Exception as e:
        logger.error("Stripe checkout creation failed: %s", e)
        return None


async def handle_stripe_webhook(payload: bytes, sig: str, db: AsyncSession) -> dict:
    """Process Stripe webhook events."""
    stripe = _get_stripe()
    if not stripe:
        return {"status": "stripe_not_configured"}

    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except Exception as e:
        logger.error("Stripe webhook verification failed: %s", e)
        raise

    if event["type"] == "checkout.session.completed":
        session_data = event["data"]["object"]
        order_id = session_data.get("metadata", {}).get("order_id")
        if order_id:
            result = await db.execute(select(Order).where(Order.id == uuid.UUID(order_id)))
            order = result.scalar_one_or_none()
            if order:
                order.status = OrderStatus.paid
                order.stripe_payment_intent_id = session_data.get("payment_intent")
                order.customer_email = order.customer_email or session_data.get("customer_email")
                await db.commit()
                logger.info("Order %s marked as paid", order_id)

    elif event["type"] == "payment_intent.payment_failed":
        pi_id = event["data"]["object"]["id"]
        result = await db.execute(select(Order).where(Order.stripe_payment_intent_id == pi_id))
        order = result.scalar_one_or_none()
        if order:
            order.status = OrderStatus.cancelled
            await db.commit()

    return {"status": "ok"}


async def get_order(order_id: uuid.UUID, db: AsyncSession) -> Order | None:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.lines))
    )
    return result.scalar_one_or_none()


async def get_orders_for_user(user_id: uuid.UUID, db: AsyncSession) -> list[Order]:
    result = await db.execute(
        select(Order)
        .where(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .options(selectinload(Order.lines))
    )
    return list(result.scalars().all())


async def get_orders_for_session(session_id: str, db: AsyncSession) -> list[Order]:
    result = await db.execute(
        select(Order)
        .where(Order.session_id == session_id)
        .order_by(Order.created_at.desc())
        .options(selectinload(Order.lines))
    )
    return list(result.scalars().all())
