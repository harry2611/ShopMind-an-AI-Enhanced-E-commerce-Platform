export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  rating: number;
  stock: number;
  images: string[];
  colors: string[];
  sizes: string[];
  tags: string[];
  created_at: string;
};

export type ProductFilters = {
  categories: string[];
  brands: string[];
  rating: number;
  inStock: boolean;
  minPrice: number;
  maxPrice: number;
};

export type ProductListResponse = {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
};

export type CartLine = {
  product: Product;
  quantity: number;
  savedForLater: boolean;
};

export type UserEvent = {
  event_type: 'view' | 'category' | 'search' | 'cart_add' | 'cart_remove' | 'wishlist';
  product_id?: string;
  metadata?: Record<string, string | number | boolean | string[]>;
};

export type Review = {
  id: number;
  product_id: string;
  user_id: string;
  rating: number;
  content: string;
  sentiment_score: number;
  created_at: string;
};

export type ReviewSummary = {
  positive_themes: string[];
  negative_themes: string[];
  summary: string;
};

export type AutocompleteResponse = {
  products: Product[];
  categories: string[];
  recent_searches: string[];
};

export type OrderSummary = {
  id: string;
  status: string;
  total: string;
  created_at: string;
};

export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
  orderStatus?: OrderSummary[];
  cartAdded?: Product;
};
