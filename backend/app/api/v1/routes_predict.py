"""
SHEildAI Backend — Route Safety Predict API

POST /predict/route-safety  — score a list of lat/lng waypoints
GET  /predict/area-heatmap  — return a risk heatmap for a bounding box
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.security import verify_supabase_jwt
from app.services.routing_service import score_route, get_area_heatmap

logger = logging.getLogger("sheildai.predict")
router = APIRouter(prefix="/predict", tags=["predict"])


# ── Request / Response models ────────────────────────────────

class Waypoint(BaseModel):
    lat: float = Field(..., ge=-90,  le=90)
    lng: float = Field(..., ge=-180, le=180)


class RouteSafetyRequest(BaseModel):
    waypoints: list[Waypoint] = Field(..., min_length=2, max_length=50)
    time_of_day: int | None = Field(None, ge=0, le=23, description="Hour 0-23 (server time used if omitted)")
    day_of_week: int | None = Field(None, ge=0, le=6,  description="0=Mon … 6=Sun")


class ScoredWaypoint(BaseModel):
    lat: float
    lng: float
    risk_score: float
    risk_level: str
    confidence: float


class RouteSafetyResponse(BaseModel):
    waypoints: list[ScoredWaypoint]
    overall_risk: str
    safe_pct: float


# ── Routes ───────────────────────────────────────────────────

@router.post("/route-safety", response_model=RouteSafetyResponse)
async def route_safety(
    body: RouteSafetyRequest,
    user: dict = Depends(verify_supabase_jwt),
):
    """
    Score each waypoint in the route via the ML service.
    Returns a risk level per waypoint and an overall route risk summary.
    """
    try:
        waypoints_dicts = [w.model_dump() for w in body.waypoints]
        result = await score_route(
            waypoints=waypoints_dicts,
            time_of_day=body.time_of_day,
            day_of_week=body.day_of_week,
        )
        return result
    except Exception as e:
        logger.error("Route scoring failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Route scoring failed: {e}")


@router.get("/area-heatmap")
async def area_heatmap(
    lat_min: float,
    lat_max: float,
    lng_min: float,
    lng_max: float,
    user: dict = Depends(verify_supabase_jwt),
):
    """
    Return heatmap data points for the given bounding box.
    Each point: {lat, lng, risk_score}.
    """
    try:
        points = await get_area_heatmap(lat_min, lat_max, lng_min, lng_max)
        return {"points": points, "count": len(points)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Heatmap generation failed: {e}")
