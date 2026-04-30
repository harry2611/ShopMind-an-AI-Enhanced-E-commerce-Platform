from contextlib import contextmanager
from typing import Iterator

import psycopg
from redis import Redis

from app.core.config import get_settings


def psycopg_url() -> str:
    url = get_settings().database_url
    return url.replace("postgresql+psycopg://", "postgresql://", 1)


@contextmanager
def get_connection() -> Iterator[psycopg.Connection]:
    connection = psycopg.connect(psycopg_url())
    try:
        yield connection
    finally:
        connection.close()


def get_redis() -> Redis:
    return Redis.from_url(get_settings().redis_url, decode_responses=True)
