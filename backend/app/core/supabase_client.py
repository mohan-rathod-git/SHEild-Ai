"""
SHEildAI Backend — Server-side Supabase Client

Uses the **service role key** so the backend can bypass Row Level Security
when performing privileged operations (SOS cascade, admin writes, etc.).

⚠️  This key must never be sent to the browser.
"""

from supabase import create_client, Client
from app.core.config import get_settings

_client: Client | None = None


def get_supabase_client() -> Client:
    """Return a singleton Supabase client (service role)."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. "
                "See backend/.env.example for required variables."
            )
        _client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    return _client
