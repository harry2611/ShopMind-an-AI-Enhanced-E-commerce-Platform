# ShopMind

ShopMind is an AI-enhanced e-commerce platform scaffold built with React 18, TypeScript, TailwindCSS, FastAPI, PostgreSQL + pgvector, Redis, Docker, and Nginx.

## What is included

- Personalized homepage with recommendations, trending products, recently viewed items, countdown promotions, and category navigation.
- Product listing with responsive grid, advanced filters, sorting, infinite loading behavior, quick view, wishlist, and quantity add-to-cart controls.
- AI-style semantic search with autocomplete, recent searches, voice search via Web Speech API, spelling correction, match highlighting, and zero-result suggestions.
- Product detail pages with gallery zoom, variants, stock status, recommendation sections, bundles, review sentiment summary, Q&A, add-to-cart animation, and buy-now CTA.
- Floating ShopMind assistant with streaming responses, quick replies, embedded product cards, and session history.
- Smart cart drawer with save-for-later, promo validation, free-shipping upsells, price-drop alerts, live totals, and estimated delivery.
- Frontend personalization event tracking and real-time recommendation updates.
- FastAPI services for products, recommendations, semantic search, assistant chat, personalization events, and reviews.
- Docker Compose stack for frontend, backend, PostgreSQL + pgvector, Redis, and Nginx reverse proxy.

## Run locally

```bash
docker compose up --build
```

Then open:

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs
- Nginx proxy: http://localhost

The backend works without an `OPENAI_API_KEY` by using deterministic local ranking, correction, summarization, and assistant fallbacks. Add `OPENAI_API_KEY` to enable live model-backed behavior where implemented.
