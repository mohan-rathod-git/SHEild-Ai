"""
SHEildAI Backend — Application Settings

Reads configuration from environment variables (or a .env file via python-dotenv).
The SUPABASE_SERVICE_ROLE_KEY is a server-side secret and must NEVER be
exposed to the frontend.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Central configuration loaded from environment variables."""

    # ── Supabase ─────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    # JWT secret from: Supabase Dashboard → Project Settings → API → JWT Settings
    SUPABASE_JWT_SECRET: str = ""

    # ── App ──────────────────────────────────────────────────
    APP_NAME: str = "SHEildAI"
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # ── ML Service ───────────────────────────────────────────
    ML_SERVICE_URL: str = "http://ml-service:8001"

    # ── SMS / Push (SOS cascade) ─────────────────────────────
    SMS_GATEWAY_URL: str = ""
    SMS_API_KEY: str = ""
    VOLUNTEER_SEARCH_RADIUS_KM: float = 2.0

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (loaded once per process)."""
    return Settings()
