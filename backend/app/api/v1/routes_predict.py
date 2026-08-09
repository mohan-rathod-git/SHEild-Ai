"""
SHEildAI Backend — Route Safety Predict API (Phase 3)

Endpoints:
  POST /predict/route          — return fastest + safest route options as GeoJSON
  GET  /predict/heatmap        — return risk segments as GeoJSON FeatureCollection
  POST /predict/route-safety   — score a list of lat/lng waypoints (legacy)
  GET  /predict/area-heatmap   — return a risk heatmap grid (legacy)
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.security import verify_supabase_jwt
from app.services.routing_service import (
    score_route,
    get_area_heatmap,
    get_route_options,
    get_heatmap_segments,
)

logger = logging.getLogger("sheildai.predict")
router = APIRouter(prefix="/predict", tags=["predict"])


# ── Shared models ─────────────────────────────────────────────

class LatLng(BaseModel):
    lat: float = Field(..., ge=-90,  le=90)
    lng: float = Field(..., ge=-180, le=180)


# ── POST /predict/route ───────────────────────────────────────

class RouteRequest(BaseModel):
    origin:      LatLng
    destination: LatLng


@router.post("/route", summary="Get fastest and safest route options")
async def predict_route(
    body: RouteRequest,
    user: dict = Depends(verify_supabase_jwt),
):
    """
    Given an origin and destination, return two route options:
      • **fastest** — straight-line interpolation
      • **safest**  — detour weighted by risk segments from the DB

    Both routes are GeoJSON Features (LineString geometry).
    The `comparison` object explains the trade-off.

    Phase 6 TODO: replace mock routing with ML-powered graph pathfinding.
    """
    try:
        result = await get_route_options(
            origin_lat=body.origin.lat,
            origin_lng=body.origin.lng,
            dest_lat=body.destination.lat,
            dest_lng=body.destination.lng,
        )
        return result
    except Exception as e:
        logger.exception("Route options failed")
        raise HTTPException(status_code=500, detail=f"Route planning failed: {e}")


# ── GET /predict/heatmap ──────────────────────────────────────

@router.get("/heatmap", summary="Get risk segments as GeoJSON for a bounding box")
async def predict_heatmap(
    lat_min: float = Query(..., ge=-90,  le=90),
    lat_max: float = Query(..., ge=-90,  le=90),
    lng_min: float = Query(..., ge=-180, le=180),
    lng_max: float = Query(..., ge=-180, le=180),
    user: dict = Depends(verify_supabase_jwt),
):
    """
    Return a GeoJSON FeatureCollection of road segments colored by `risk_score`.
    Each feature is a LineString. Properties include risk_score, risk_level,
    lit_status, and cctv_present.

    Use this to render the heatmap overlay on the journey map.
    """
    if lat_min >= lat_max or lng_min >= lng_max:
        raise HTTPException(status_code=422, detail="Invalid bounding box: min must be < max")
    try:
        fc = await get_heatmap_segments(lat_min, lat_max, lng_min, lng_max)
        return fc
    except Exception as e:
        logger.exception("Heatmap segments failed")
        raise HTTPException(status_code=500, detail=f"Heatmap generation failed: {e}")


# ── Legacy endpoints (kept for backward-compat) ───────────────

class Waypoint(BaseModel):
    lat: float = Field(..., ge=-90,  le=90)
    lng: float = Field(..., ge=-180, le=180)


class RouteSafetyRequest(BaseModel):
    waypoints: list[Waypoint] = Field(..., min_length=2, max_length=50)
    time_of_day: int | None = Field(None, ge=0, le=23, description="Hour 0-23 (server time if omitted)")
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


@router.post("/route-safety", response_model=RouteSafetyResponse,
             summary="Score individual waypoints (legacy)")
async def route_safety(
    body: RouteSafetyRequest,
    user: dict = Depends(verify_supabase_jwt),
):
    """Score each waypoint via the ML service. Returns risk per waypoint + overall."""
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


@router.get("/area-heatmap", summary="Heatmap grid (legacy)")
async def area_heatmap(
    lat_min: float,
    lat_max: float,
    lng_min: float,
    lng_max: float,
    user: dict = Depends(verify_supabase_jwt),
):
    """Return heatmap data points for the given bounding box (grid-based, legacy)."""
    try:
        points = await get_area_heatmap(lat_min, lat_max, lng_min, lng_max)
        return {"points": points, "count": len(points)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Heatmap generation failed: {e}")
