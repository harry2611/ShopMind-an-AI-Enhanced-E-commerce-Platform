export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type UserOut = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
};

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export type OrderLineOut = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  product_image: string | null;
  quantity: number;
};

export type OrderOut = {
  id: string;
  status: OrderStatus;
  total_amount: number;
  customer_email: string | null;
  created_at: string;
  lines: OrderLineOut[];
};
