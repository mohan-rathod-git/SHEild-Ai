"""
SHEildAI — Protect API routes

POST /protect/session/start   — log when Guardian Mode becomes active
POST /protect/session/stop    — log when Guardian Mode is stopped

These are analytics/audit endpoints.  Detection is entirely client-side;
these calls are fire-and-forget from the frontend and never block UX.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.supabase import get_supabase_client
from app.api.v1.routes_auth import get_current_user_id

router = APIRouter(prefix="/protect", tags=["protect"])


# ── Request / response models ──────────────────────────────────────────

class SessionStartRequest(BaseModel):
    """Metadata sent when Guardian Mode starts."""
    sensitivity: str = "medium"          # low | medium | high
    mic_enabled: bool = True
    motion_enabled: bool = True
    speech_enabled: bool = False         # Web Speech API support varies


class SessionStopRequest(BaseModel):
    """Metadata sent when Guardian Mode stops."""
    session_id: str
    distress_count: int = 0              # how many times distress was detected
    false_alarm_count: int = 0           # times the user tapped "I'm safe"
    duration_seconds: Optional[float] = None


class SessionResponse(BaseModel):
    session_id: str
    status: str
    started_at: str


# ── Endpoints ──────────────────────────────────────────────────────────

@router.post("/session/start", response_model=SessionResponse)
async def start_guardian_session(
    body: SessionStartRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Log the start of a Guardian Mode session.

    Inserts a row into `guardian_sessions` (created lazily via Supabase
    if the migration hasn't landed yet — tolerates the table not existing).
    """
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    sb = get_supabase_client()

    try:
        sb.table("guardian_sessions").insert({
            "id": session_id,
            "user_id": user_id,
            "started_at": now,
            "sensitivity": body.sensitivity,
            "mic_enabled": body.mic_enabled,
            "motion_enabled": body.motion_enabled,
            "speech_enabled": body.speech_enabled,
            "status": "active",
        }).execute()
    except Exception:
        # Table may not exist yet — that's fine, the session still works
        pass

    return SessionResponse(
        session_id=session_id,
        status="active",
        started_at=now,
    )


@router.post("/session/stop")
async def stop_guardian_session(
    body: SessionStopRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Log the end of a Guardian Mode session.

    Updates the `guardian_sessions` row with duration + distress counts.
    """
    now = datetime.now(timezone.utc).isoformat()
    sb = get_supabase_client()

    try:
        sb.table("guardian_sessions").update({
            "status": "stopped",
            "stopped_at": now,
            "duration_seconds": body.duration_seconds,
            "distress_count": body.distress_count,
            "false_alarm_count": body.false_alarm_count,
        }).eq("id", body.session_id).eq("user_id", user_id).execute()
    except Exception:
        pass

    return {
        "session_id": body.session_id,
        "status": "stopped",
        "stopped_at": now,
    }
