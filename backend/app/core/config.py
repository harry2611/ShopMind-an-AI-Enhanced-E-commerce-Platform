from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ShopMind API"
    database_url: str = "postgresql+psycopg://shopmind:shopmind@localhost:5432/shopmind"
    redis_url: str = "redis://localhost:6379/0"
    openai_api_key: str = ""
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
