"""
SHEildAI Backend — Trusted Contacts Routes

GET    /contacts          — list all trusted contacts for the current user
POST   /contacts          — add a new trusted contact
DELETE /contacts/{id}     — remove a trusted contact
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.core.security import verify_supabase_jwt
from app.core.supabase_client import get_supabase_client

router = APIRouter(prefix="/contacts", tags=["contacts"])


# ── Request / Response models ────────────────────────────────

class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str | None = None
    email: str | None = None
    notify_sms: bool = True
    notify_email: bool = True


# ── Routes ───────────────────────────────────────────────────

@router.get("/")
async def list_contacts(user: dict = Depends(verify_supabase_jwt)):
    """Return all trusted contacts for the authenticated user."""
    user_id = user["sub"]
    sb = get_supabase_client()

    try:
        result = (
            sb.table("trusted_contacts")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at")
            .execute()
        )
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Contacts fetch failed: {e}")


@router.post("/", status_code=201)
async def add_contact(
    body: ContactCreate,
    user: dict = Depends(verify_supabase_jwt),
):
    """Add a new trusted contact."""
    user_id = user["sub"]
    sb = get_supabase_client()

    if not body.phone and not body.email:
        raise HTTPException(
            status_code=400,
            detail="At least one of phone or email is required.",
        )

    # Limit to 5 contacts per user
    existing = (
        sb.table("trusted_contacts")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    if (existing.count or 0) >= 5:
        raise HTTPException(
            status_code=400,
            detail="Maximum of 5 trusted contacts allowed.",
        )

    try:
        result = (
            sb.table("trusted_contacts")
            .insert({
                "user_id": user_id,
                **body.model_dump(),
            })
            .execute()
        )
        return result.data[0] if result.data else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Contact creation failed: {e}")


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: str,
    user: dict = Depends(verify_supabase_jwt),
):
    """Remove a trusted contact (must belong to the current user)."""
    user_id = user["sub"]
    sb = get_supabase_client()

    try:
        result = (
            sb.table("trusted_contacts")
            .delete()
            .eq("id", contact_id)
            .eq("user_id", user_id)  # ownership check
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Contact not found.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Contact deletion failed: {e}")
