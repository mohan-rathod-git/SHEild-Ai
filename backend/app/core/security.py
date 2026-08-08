"""
SHEildAI Backend — Security Helpers

Verifies Supabase-issued JWTs using the JWT secret from settings.
The JWT_SECRET is the "JWT Secret" found in Supabase Dashboard →
Project Settings → API → JWT Settings.

For development without a real Supabase project, set
SUPABASE_JWT_SECRET="" and the verifier will accept all tokens
(stub mode) — it will log a warning so this is never forgotten.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("sheildai.security")

bearer_scheme = HTTPBearer(auto_error=False)


def _try_decode(token: str, secret: str) -> dict:
    """Decode and verify a Supabase JWT. Raises ValueError on failure."""
    try:
        import jwt as pyjwt  # PyJWT

        payload = pyjwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_exp": True},
            audience="authenticated",
        )
        return payload
    except ImportError:
        raise RuntimeError(
            "PyJWT is not installed. Add 'PyJWT' to backend/requirements.txt."
        )
    except Exception as exc:
        raise ValueError(str(exc)) from exc


async def verify_supabase_jwt(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """
    FastAPI dependency — verifies the Supabase Bearer token.

    Returns the decoded JWT payload dict (contains 'sub' = user UUID).

    Stub mode: if SUPABASE_JWT_SECRET is not set, accepts any token and
    returns a synthetic payload (for local dev without a Supabase project).
    """
    from app.core.config import get_settings

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    settings = get_settings()
    secret = getattr(settings, "SUPABASE_JWT_SECRET", "")

    # ── Stub mode (no secret configured) ──────────────────────
    if not secret:
        logger.warning(
            "SUPABASE_JWT_SECRET not set — running in JWT stub mode. "
            "All tokens accepted. Do NOT use this in production."
        )
        # Extract sub from token without verification so at least the
        # user_id is meaningful when a real Supabase token is passed.
        try:
            import jwt as pyjwt

            unverified = pyjwt.decode(
                token, options={"verify_signature": False}, algorithms=["HS256"]
            )
            return unverified
        except Exception:
            # Completely invalid token — return synthetic payload
            return {
                "sub": "stub-user",
                "role": "authenticated",
                "iat": int(datetime.now(timezone.utc).timestamp()),
            }

    # ── Real verification ──────────────────────────────────────
    try:
        payload = _try_decode(token, secret)
        return payload
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )
