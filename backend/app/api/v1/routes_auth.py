"""
SHEildAI Backend — Auth Routes

GET  /auth/me       — return the current user's profile
PATCH /auth/me      — update display name, phone, city, avatar_url
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import verify_supabase_jwt
from app.core.supabase_client import get_supabase_client

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Request / Response models ────────────────────────────────

class ProfileUpdate(BaseModel):
    display_name: str | None = None
    phone: str | None = None
    city: str | None = None
    avatar_url: str | None = None


# ── Routes ───────────────────────────────────────────────────

@router.get("/me")
async def get_me(user: dict = Depends(verify_supabase_jwt)):
    """Return the current user's profile row."""
    user_id = user["sub"]
    sb = get_supabase_client()

    try:
        result = (
            sb.table("profiles")
            .select("*")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if not result.data:
            # Profile may not exist yet (e.g., trigger hasn't run)
            return {"id": user_id, "display_name": None, "phone": None, "city": None, "avatar_url": None}
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile fetch failed: {e}")


@router.patch("/me")
async def update_me(
    body: ProfileUpdate,
    user: dict = Depends(verify_supabase_jwt),
):
    """Update the current user's profile."""
    user_id = user["sub"]
    sb = get_supabase_client()

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")

    try:
        result = (
            sb.table("profiles")
            .upsert({"id": user_id, **updates})
            .execute()
        )
        return result.data[0] if result.data else {"id": user_id, **updates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile update failed: {e}")
