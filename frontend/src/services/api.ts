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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init
  });
  if (!response.ok) {
    throw new Error(`ShopMind API ${response.status}: ${await response.text()}`);
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
      filters.categories.forEach((value) => query.append('category', value));
      filters.brands.forEach((value) => query.append('brand', value));
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
      body: JSON.stringify({ query, session_id: getSessionId() })
    });
  },

  autocomplete(query: string) {
    return request<AutocompleteResponse>('/search/autocomplete', {
      method: 'POST',
      body: JSON.stringify({ query, session_id: getSessionId() })
    });
  },

  personalRecommendations(history: UserEvent[]) {
    return request<Product[]>('/recommendations/personal', {
      method: 'POST',
      body: JSON.stringify({ session_id: getSessionId(), history })
    });
  },

  similar(productId: string) {
    return request<Product[]>('/recommendations/similar', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId })
    });
  },

  bundle(productIds: string[]) {
    return request<Product[]>('/recommendations/bundle', {
      method: 'POST',
      body: JSON.stringify({ product_ids: productIds })
    });
  },

  track(event: UserEvent) {
    return request<{ ok: true }>('/events/track', {
      method: 'POST',
      body: JSON.stringify({ session_id: getSessionId(), ...event })
    });
  },

  personalization() {
    return request<Product[]>(`/personalization/${getSessionId()}`);
  },

  reviews(productId: string) {
    return request<Review[]>(`/reviews/${productId}`);
  },

  reviewSummary(productId: string) {
    return request<ReviewSummary>('/reviews/summarize', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId })
    });
  },

  qa(productId: string) {
    return request<{ question: string; answer: string }[]>(`/reviews/qa/${productId}`);
  },

  async assistantChat(messages: AssistantMessage[], onToken: (token: string) => void) {
    const response = await fetch(`${API_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: getSessionId(), messages })
    });
    if (!response.body || !response.ok) throw new Error('Assistant stream failed');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let products: Product[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n').filter(Boolean)) {
        if (line.startsWith('data: ')) {
          const payload = JSON.parse(line.slice(6));
          if (payload.token) onToken(payload.token);
          if (payload.products) products = payload.products;
        }
      }
    }
    return products;
  }
};
