-- ShopMind: initialize PostgreSQL extensions
-- Tables are created by SQLAlchemy on application startup

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- for fuzzy text search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- for uuid_generate_v4()

-- Performance indexes added after app creates tables
-- (app startup handles this via SQLAlchemy metadata)
