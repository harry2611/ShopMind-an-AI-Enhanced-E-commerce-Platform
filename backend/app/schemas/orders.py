import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

from app.models.order import OrderStatus


class CartLineIn(BaseModel):
    product_id: str
    product_name: str
    product_price: Decimal
    product_image: str | None = None
    quantity: int


class CheckoutRequest(BaseModel):
    session_id: str
    items: list[CartLineIn]
    customer_email: str | None = None


class CheckoutResponse(BaseModel):
    checkout_url: str
    order_id: uuid.UUID


class OrderLineOut(BaseModel):
    id: uuid.UUID
    product_id: str | None
    product_name: str
    product_price: Decimal
    product_image: str | None
    quantity: int

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: uuid.UUID
    status: OrderStatus
    total_amount: Decimal
    customer_email: str | None
    created_at: datetime
    lines: list[OrderLineOut] = []

    model_config = {"from_attributes": True}
