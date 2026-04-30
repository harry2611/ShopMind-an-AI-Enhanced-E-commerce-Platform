import type {
  AssistantMessage,
  AutocompleteResponse,
  Product,
  ProductFilters,
  ProductListResponse,
  Review,
  ReviewSummary,
  UserEvent
} from '../types/shop';
import { getSessionId } from './session';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(body.detail ?? `ShopMind API ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  products(params: {
    page?: number;
    pageSize?: number;
    sort?: string;
    filters?: ProductFilters;
  }) {
    const query = new URLSearchParams({
      page: String(params.page ?? 1),
      page_size: String(params.pageSize ?? 12),
      sort: params.sort ?? 'relevance'
    });
    const filters = params.filters;
    if (filters) {
      filters.categories.forEach((v) => query.append('category', v));
      filters.brands.forEach((v) => query.append('brand', v));
      query.set('rating', String(filters.rating));
      query.set('in_stock', String(filters.inStock));
      query.set('min_price', String(filters.minPrice));
      query.set('max_price', String(filters.maxPrice));
    }
    return request<ProductListResponse>(`/products?${query.toString()}`);
  },

  product(id: string) {
    return request<Product>(`/products/${id}`);
  },

  trending() {
    return request<Product[]>('/products/trending');
  },

  semanticSearch(query: string) {
    return request<{ items: Product[]; did_you_mean?: string; suggestions: string[] }>('/search/semantic', {
      method: 'POST',
      body: JSON.stringify({ query, session_id: getSessionId() }),
    });
  },

  autocomplete(query: string) {
    return request<AutocompleteResponse>('/search/autocomplete', {
      method: 'POST',
      body: JSON.stringify({ query, session_id: getSessionId() }),
    });
  },

  personalRecommendations(history: UserEvent[]) {
    return request<Product[]>('/recommendations/personal', {
      method: 'POST',
      body: JSON.stringify({ session_id: getSessionId(), history }),
    });
  },

  similar(productId: string) {
    return request<Product[]>('/recommendations/similar', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    });
  },

  bundle(productIds: string[]) {
    return request<Product[]>('/recommendations/bundle', {
      method: 'POST',
      body: JSON.stringify({ product_ids: productIds }),
    });
  },

  track(event: UserEvent) {
    return request<{ ok: true }>('/events/track', {
      method: 'POST',
      body: JSON.stringify({ session_id: getSessionId(), ...event }),
    });
  },

  personalization() {
    return request<Product[]>(`/recommendations/personalization/${getSessionId()}`);
  },

  reviews(productId: string) {
    return request<Review[]>(`/reviews/${productId}`);
  },

  reviewSummary(productId: string) {
    return request<ReviewSummary>('/reviews/summarize', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    });
  },

  qa(productId: string) {
    return request<{ question: string; answer: string }[]>(`/reviews/qa/${productId}`);
  },

  async assistantChat(
    messages: AssistantMessage[],
    onToken: (token: string) => void,
    onAction?: (action: string, product: Product) => void,
    onOrderStatus?: (orders: import('../types/shop').OrderSummary[]) => void,
  ) {
    const response = await fetch(`${API_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ session_id: getSessionId(), messages }),
    });
    if (!response.body || !response.ok) throw new Error('Assistant stream failed');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let products: Product[] = [];
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.token) onToken(payload.token);
          if (payload.products) products = payload.products;
          if (payload.action === 'add_to_cart' && payload.product && onAction)
            onAction('add_to_cart', payload.product);
          if (payload.order_status && onOrderStatus)
            onOrderStatus(payload.order_status);
        } catch { /* partial chunk */ }
      }
    }
    return products;
  },
};
