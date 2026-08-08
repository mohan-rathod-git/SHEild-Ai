"""
SHEildAI Backend — SOS Respond API Routes

POST /respond/sos/trigger    — trigger a new SOS cascade
POST /respond/sos/sync       — batch-sync offline-queued events
GET  /respond/sos/{id}/status — get live status of an SOS event
POST /respond/sos/{id}/resolve — cancel / resolve an SOS event
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.security import verify_supabase_jwt
from app.services.sos_service import (
    trigger_sos,
    sync_offline_events,
    get_sos_status,
    resolve_sos,
)

router = APIRouter(prefix="/respond", tags=["respond"])


# ── Request / Response models ────────────────────────────────

class SOSTriggerRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    trigger_source: str = Field(..., pattern=r"^(manual|voice|motion|mic)$")


class OfflineEvent(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    trigger_source: str = Field(..., pattern=r"^(manual|voice|motion|mic)$")
    triggered_at: str = Field(..., description="ISO timestamp from the client")


class SOSSyncRequest(BaseModel):
    events: list[OfflineEvent] = Field(..., min_length=1, max_length=50)


class SOSTriggerResponse(BaseModel):
    event_id: str
    status: str
    message: str


# ── Routes ───────────────────────────────────────────────────

@router.post("/sos/trigger", response_model=SOSTriggerResponse)
async def sos_trigger(body: SOSTriggerRequest, user: dict = Depends(verify_supabase_jwt)):
    """
    Trigger a new SOS cascade.
    The backend handles all notifications (volunteers, contacts, police, SMS)
    using the service role key — the frontend must never do this directly.
    """
    user_id = user["sub"]

    try:
        event = await trigger_sos(
            user_id=user_id,
            lat=body.lat,
            lng=body.lng,
            source=body.trigger_source,
        )
        return SOSTriggerResponse(
            event_id=event.get("id", ""),
            status="triggered",
            message="SOS cascade initiated. Volunteers and contacts are being notified.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SOS trigger failed: {str(e)}")


@router.post("/sos/sync")
async def sos_sync(body: SOSSyncRequest, user: dict = Depends(verify_supabase_jwt)):
    """
    Batch-sync SOS events that were created offline.
    The frontend queues events in IndexedDB when navigator.onLine is false
    and flushes them here when connectivity returns.
    """
    user_id = user["sub"]

    try:
        events = await sync_offline_events(
            user_id=user_id,
            events=[ev.model_dump() for ev in body.events],
        )
        return {
            "synced_count": len(events),
            "events": [{"id": e.get("id"), "status": e.get("status")} for e in events],
            "message": f"Synced {len(events)} offline SOS event(s).",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Offline sync failed: {str(e)}")


@router.get("/sos/{event_id}/status")
async def sos_status(event_id: str, user: dict = Depends(verify_supabase_jwt)):
    """
    Get live status of an SOS event — the event itself plus all recipients
    with their notification and acknowledgement timestamps.
    """
    try:
        data = await get_sos_status(event_id)
        if not data.get("event"):
            raise HTTPException(status_code=404, detail="SOS event not found")
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status lookup failed: {str(e)}")


@router.post("/sos/{event_id}/resolve")
async def sos_resolve(event_id: str, user: dict = Depends(verify_supabase_jwt)):
    """Cancel / resolve an active SOS event."""
    user_id = user["sub"]

    try:
        event = await resolve_sos(event_id, user_id)
        if not event:
            raise HTTPException(status_code=404, detail="SOS event not found or already resolved")
        return {"status": "resolved", "event_id": event_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resolve failed: {str(e)}")
