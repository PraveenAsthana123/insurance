from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="BEV_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # PostgreSQL
    postgres_host: str = Field(default="localhost", description="PostgreSQL host")
    postgres_port: int = Field(default=5432, description="PostgreSQL port")
    postgres_db: str = Field(default="insur_analytics", description="PostgreSQL database name")
    postgres_user: str = Field(default="insur_user", description="PostgreSQL username")
    postgres_password: str = Field(default="insur_secret_password", description="PostgreSQL password")

    # Redis
    redis_host: str = Field(default="localhost", description="Redis host")
    redis_port: int = Field(default=6379, description="Redis port")

    # MLflow
    mlflow_tracking_uri: str = Field(
        default="http://localhost:5001", description="MLflow tracking server URI"
    )

    # Ollama (RAG / AI)
    ollama_host: str = Field(
        default="http://localhost:11434", description="Ollama API host"
    )

    # Backend server
    backend_host: str = Field(default="0.0.0.0", description="Backend bind host")
    backend_port: int = Field(default=8000, description="Backend bind port")

    # Security
    project_api_key: str = Field(
        default="", description="API key for admin endpoints (empty = auth disabled in dev)"
    )

    # CORS
    cors_origins: str = Field(
        default="http://localhost:3000",
        description="Comma-separated list of allowed CORS origins",
    )

    # Rate limiting
    rate_limit_api: int = Field(default=100, description="Max requests/minute for API endpoints")
    rate_limit_upload: int = Field(
        default=10, description="Max requests/minute for file upload endpoints"
    )

    # Data directories
    data_dir: str = Field(default="/data", description="Root data directory")
    kaggle_dir: str = Field(default="/data/kaggle", description="Kaggle datasets directory")

    # Computed properties
    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/0"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
