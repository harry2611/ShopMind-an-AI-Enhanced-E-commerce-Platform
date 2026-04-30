# ShopMind — Getting Started

## Quick start (development, no API keys needed)

```bash
# 1. Copy env file
cp .env.example .env
# (The defaults work out of the box for local Docker)

# 2. Start all services
docker compose up --build

# 3. Open the app
open http://localhost        # via nginx
open http://localhost:3000   # frontend direct
open http://localhost:8000/docs  # API docs (dev only)
```

The backend seeds 35+ products automatically on first start.
Vector embeddings are generated if `OPENAI_API_KEY` is set.

---

## Enabling AI features

Add your keys to `.env`:

```
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Restart: `docker compose up --build`

---

## Stripe webhook (local testing)

Install Stripe CLI and forward webhooks:

```bash
stripe listen --forward-to localhost:8000/orders/webhook/stripe
```

Copy the printed webhook secret into `.env` as `STRIPE_WEBHOOK_SECRET`.

---

## Deployment (VPS / DigitalOcean / AWS EC2)

```bash
# On your server:
git clone <your-repo>
cd ShopMind-an-AI-Enhanced-E-commerce-Platform

# Fill in production values
cp .env.example .env
nano .env   # set SECRET_KEY, OPENAI_API_KEY, STRIPE keys, CORS_ORIGINS, etc.

# Run in detached mode
docker compose up -d --build

# Set up nginx for HTTPS (recommended: certbot + Let's Encrypt)
```

Key things to set for production:
- `ENVIRONMENT=production` — disables /docs, enables stricter logging
- `SECRET_KEY=<long random string>` — use `openssl rand -hex 32`
- `POSTGRES_PASSWORD=<strong password>`
- `CORS_ORIGINS=https://yourdomain.com`

---

## Architecture summary

```
Browser → Nginx :80
              ├── /api/* → FastAPI :8000
              └── /* → React SPA :3000

FastAPI
  ├── Auth (JWT, bcrypt)
  ├── Products (Postgres)
  ├── Search (pgvector cosine similarity, keyword fallback)
  ├── Recommendations (personal, similar, bundle)
  ├── AI Assistant (GPT-4o-mini streaming, rule-based fallback)
  ├── Orders + Stripe checkout
  └── Events (Redis session tracking)

Postgres (pgvector) — products, users, orders
Redis — session events, recent searches, caching
```
