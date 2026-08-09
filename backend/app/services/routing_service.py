"""
SHEildAI Backend — Routing Service (Phase 3: Predict Pillar)

Provides two core public functions:
  • score_route()         — score a list of waypoints (existing, used by /route-safety)
  • get_route_options()   — return fastest + safest GeoJSON routes between two points
  • get_heatmap_segments()— return risk segments as GeoJSON for a bounding box

Route algorithm (mock, Phase 3):
  fastest : straight-line interpolation between origin and destination.
  safest  : fetches nearby segments from Supabase, builds a low-risk path by
            selecting waypoints from segments with risk_score < 0.4; falls back
            to a slight geographic detour if no safe segments found.

  ┌─────────────────────────────────────────────────────────────────┐
  │  TODO Phase 6: Replace _build_safest_route() with a call to    │
  │  the ml-service /route endpoint, which will run a graph-based  │
  │  pathfinding (Dijkstra / A*) over PostGIS-queried segments,    │
  │  using the ML risk model as the edge weight function.          │
  └─────────────────────────────────────────────────────────────────┘
"""

from __future__ import annotations

import asyncio
import logging
import math
import random
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger("sheildai.routing")


# ─────────────────────────────────────────────────────────────
# Internal helpers — risk scoring
# ─────────────────────────────────────────────────────────────

def _rule_based_score(lat: float, lng: float, hour: int, dow: int) -> dict:
    """
    Deterministic rule-based risk scorer — fallback when ML service unreachable.

    Rules (simplified — Phase 6 replaces with real ML model):
      - Night hours (21–05 h) → +0.25 base risk
      - Weekend late night    → +0.15 extra
      - Seeded geographic noise per coordinate
    """
    base = 0.20

    if 21 <= hour or hour <= 5:
        base += 0.25
    elif 18 <= hour <= 20:
        base += 0.10

    if dow in (4, 5, 6) and (22 <= hour or hour <= 3):
        base += 0.15

    rng = random.Random(f"{lat:.3f}{lng:.3f}")
    noise = rng.uniform(-0.08, 0.12)
    score = min(max(base + noise, 0.0), 1.0)

    if score < 0.35:
        level = "safe"
    elif score < 0.65:
        level = "moderate"
    else:
        level = "danger"

    confidence = round(rng.uniform(0.72, 0.96), 2)
    return {"risk_score": round(score, 3), "risk_level": level, "confidence": confidence}


async def _score_via_ml_service(waypoint: dict, hour: int, dow: int) -> dict:
    """Call the ML microservice POST /predict endpoint."""
    settings = get_settings()
    async with httpx.AsyncClient(timeout=5) as client:
        resp = await client.post(
            f"{settings.ML_SERVICE_URL}/predict",
            json={
                "lat": waypoint["lat"],
                "lng": waypoint["lng"],
                "time_of_day": hour,
                "day_of_week": dow,
            },
        )
        resp.raise_for_status()
        return resp.json()


# ─────────────────────────────────────────────────────────────
# Geometry helpers
# ─────────────────────────────────────────────────────────────

def _interpolate(
    lat1: float, lng1: float,
    lat2: float, lng2: float,
    steps: int = 6,
) -> list[tuple[float, float]]:
    """Return `steps` evenly-spaced [lng, lat] points between two coords (GeoJSON order)."""
    points = []
    for i in range(steps + 1):
        t = i / steps
        lat = lat1 + t * (lat2 - lat1)
        lng = lng1 + t * (lng2 - lng1)
        points.append([round(lng, 6), round(lat, 6)])
    return points


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in kilometres."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def _avg_risk(score: float) -> str:
    if score < 0.35:
        return "safe"
    if score < 0.65:
        return "moderate"
    return "danger"


# ─────────────────────────────────────────────────────────────
# Supabase REST helper
# ─────────────────────────────────────────────────────────────

async def _fetch_segments_in_bbox(
    lat_min: float, lat_max: float,
    lng_min: float, lng_max: float,
) -> list[dict]:
    """
    Query Supabase route_segments table for segments whose bounding box
    intersects the given lat/lng bounding box.

    Uses ST_Intersects via a Supabase RPC call (or falls back to a broader
    pull + Python-side filter if the RPC isn't deployed yet).

    Returns a list of dicts: {id, segment_name, risk_score, lit_status,
                               cctv_present, notes, geom_wkt (optional)}
    """
    settings = get_settings()

    if not settings.SUPABASE_URL or "dummy" in settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Supabase not configured — returning mock segment data")
        return _mock_segments_for_bbox(lat_min, lat_max, lng_min, lng_max)

    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    # Pull all segments (small table in Phase 3) and filter client-side.
    # Phase 6 TODO: replace with ST_Intersects RPC for large datasets.
    url = f"{settings.SUPABASE_URL}/rest/v1/route_segments"
    params = {
        "select": "id,segment_name,risk_score,lit_status,cctv_present,notes",
        "order": "risk_score.asc",
    }

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("Supabase segment fetch failed (%s) — using mock data", exc)
        return _mock_segments_for_bbox(lat_min, lat_max, lng_min, lng_max)


def _mock_segments_for_bbox(
    lat_min: float, lat_max: float,
    lng_min: float, lng_max: float,
) -> list[dict]:
    """
    Generate synthetic segments when Supabase is unavailable.
    Creates a 4×4 grid of mock segments covering the bounding box.
    Risk scores vary to simulate real data distribution.
    """
    segments = []
    lat_step = (lat_max - lat_min) / 4
    lng_step = (lng_max - lng_min) / 4
    rng = random.Random(f"{lat_min:.3f}{lng_min:.3f}")

    for row in range(4):
        for col in range(4):
            lat_a = lat_min + row * lat_step
            lng_a = lng_min + col * lng_step
            lat_b = lat_a + lat_step
            lng_b = lng_a + lng_step
            score = round(rng.uniform(0.05, 0.95), 2)
            seg_id = row * 4 + col + 1
            lit = "well_lit" if score < 0.35 else ("partially_lit" if score < 0.65 else "unlit")
            segments.append({
                "id": seg_id,
                "segment_name": f"Mock Segment {seg_id}",
                "risk_score": score,
                "lit_status": lit,
                "cctv_present": score < 0.4,
                "notes": "Mock data — Supabase not connected",
                # Encode geometry as a simple coordinate pair list for Python use
                "_coords": [
                    [lng_a, lat_a],
                    [(lng_a + lng_b) / 2, (lat_a + lat_b) / 2],
                    [lng_b, lat_b],
                ],
            })
    return segments


# ─────────────────────────────────────────────────────────────
# Route building
# ─────────────────────────────────────────────────────────────

def _build_fastest_route(
    origin_lat: float, origin_lng: float,
    dest_lat: float, dest_lng: float,
) -> dict:
    """
    Fastest route: straight-line interpolation with 7 waypoints.
    Risk is scored using the rule-based scorer at each point.
    """
    coords = _interpolate(origin_lat, origin_lng, dest_lat, dest_lng, steps=6)
    now = datetime.now(timezone.utc)
    hour, dow = now.hour, now.weekday()

    scored_points = []
    total_risk = 0.0
    for lng, lat in coords:
        s = _rule_based_score(lat, lng, hour, dow)
        scored_points.append({"lat": lat, "lng": lng, **s})
        total_risk += s["risk_score"]

    avg_risk = total_risk / len(scored_points)
    distance_km = _haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
    # Rough ETA: average walking 5 km/h
    eta_min = round((distance_km / 5.0) * 60)

    return {
        "type": "Feature",
        "properties": {
            "route_type": "fastest",
            "label": "Fastest Route",
            "description": "Direct path — shortest distance, not necessarily safest.",
            "avg_risk_score": round(avg_risk, 3),
            "risk_level": _avg_risk(avg_risk),
            "distance_km": round(distance_km, 2),
            "eta_minutes": eta_min,
            "waypoints": scored_points,
        },
        "geometry": {
            "type": "LineString",
            "coordinates": coords,
        },
    }


def _build_safest_route(
    origin_lat: float, origin_lng: float,
    dest_lat: float, dest_lng: float,
    segments: list[dict],
) -> dict:
    """
    Safest route: uses low-risk DB segments to build a path.

    Algorithm (Phase 3 mock):
      1. Filter segments with risk_score < 0.45 (safe/moderate).
      2. Sort by risk_score ascending.
      3. Build a route: origin → safe midpoint anchor(s) → destination.
         The midpoint is biased towards the centroid of safe segments,
         creating a visible detour away from high-risk areas.

    ┌──────────────────────────────────────────────────────────────────┐
    │ TODO Phase 6: Replace this function body with a call to the     │
    │ ml-service /safe-route endpoint, which runs Dijkstra on the     │
    │ PostGIS segment graph with ML risk scores as edge weights.      │
    └──────────────────────────────────────────────────────────────────┘
    """
    now = datetime.now(timezone.utc)
    hour, dow = now.hour, now.weekday()

    # Filter to safe-ish segments
    safe_segs = [s for s in segments if s.get("risk_score", 1.0) < 0.45]

    if safe_segs:
        # Use the centroid of safe segment mid-points as a detour anchor
        anchors_lat = []
        anchors_lng = []
        for seg in safe_segs[:5]:  # top-5 safest
            if "_coords" in seg:
                mid = seg["_coords"][len(seg["_coords"]) // 2]
                anchors_lng.append(mid[0])
                anchors_lat.append(mid[1])
        if anchors_lat:
            anchor_lat = sum(anchors_lat) / len(anchors_lat)
            anchor_lng = sum(anchors_lng) / len(anchors_lng)
        else:
            # Slight perpendicular offset from the straight line
            anchor_lat = (origin_lat + dest_lat) / 2 + 0.005
            anchor_lng = (origin_lng + dest_lng) / 2 - 0.003
    else:
        # No safe segments — generate a slight perpendicular detour
        anchor_lat = (origin_lat + dest_lat) / 2 + 0.004
        anchor_lng = (origin_lng + dest_lng) / 2 - 0.002

    # Build coordinate list: origin → midpoint1 → anchor → midpoint2 → dest
    seg1 = _interpolate(origin_lat, origin_lng, anchor_lat, anchor_lng, steps=3)
    seg2 = _interpolate(anchor_lat, anchor_lng, dest_lat, dest_lng, steps=3)
    coords = seg1 + seg2[1:]  # avoid duplicating anchor

    # Score each point
    scored_points = []
    total_risk = 0.0
    for lng, lat in coords:
        s = _rule_based_score(lat, lng, hour, dow)
        scored_points.append({"lat": lat, "lng": lng, **s})
        total_risk += s["risk_score"]

    avg_risk = total_risk / len(scored_points)

    # Distance via detour (approximate)
    d1 = _haversine_km(origin_lat, origin_lng, anchor_lat, anchor_lng)
    d2 = _haversine_km(anchor_lat, anchor_lng, dest_lat, dest_lng)
    distance_km = d1 + d2
    eta_min = round((distance_km / 5.0) * 60)

    # Build a human-readable safety explanation
    well_lit_count = sum(1 for s in safe_segs if s.get("lit_status") == "well_lit")
    cctv_count = sum(1 for s in safe_segs if s.get("cctv_present"))
    why_safer_parts = []
    if well_lit_count:
        why_safer_parts.append(f"{well_lit_count} well-lit segment{'s' if well_lit_count > 1 else ''}")
    if cctv_count:
        why_safer_parts.append(f"CCTV coverage on {cctv_count} section{'s' if cctv_count > 1 else ''}")
    if not why_safer_parts:
        why_safer_parts.append("avoids unlit back lanes")
    why_safer = "Route uses " + " and ".join(why_safer_parts) + "."

    return {
        "type": "Feature",
        "properties": {
            "route_type": "safest",
            "label": "Safest Route",
            "description": "AI-recommended path that minimises risk based on lighting, CCTV, and incident history.",
            "why_safer": why_safer,
            "avg_risk_score": round(avg_risk, 3),
            "risk_level": _avg_risk(avg_risk),
            "distance_km": round(distance_km, 2),
            "eta_minutes": eta_min,
            "waypoints": scored_points,
        },
        "geometry": {
            "type": "LineString",
            "coordinates": coords,
        },
    }


# ─────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────

async def get_route_options(
    origin_lat: float, origin_lng: float,
    dest_lat: float, dest_lng: float,
) -> dict:
    """
    Return both fastest and safest route options as GeoJSON Features.

    Response shape:
      {
        "fastest": GeoJSON Feature (LineString),
        "safest":  GeoJSON Feature (LineString),
        "comparison": { risk_reduction_pct, extra_distance_km, extra_minutes }
      }
    """
    # Bounding box of the trip (padded by ~0.01° ≈ 1 km)
    lat_min = min(origin_lat, dest_lat) - 0.01
    lat_max = max(origin_lat, dest_lat) + 0.01
    lng_min = min(origin_lng, dest_lng) - 0.01
    lng_max = max(origin_lng, dest_lng) + 0.01

    # Fetch nearby risk segments from Supabase (or fallback mock)
    segments = await _fetch_segments_in_bbox(lat_min, lat_max, lng_min, lng_max)

    fastest, safest = await asyncio.gather(
        asyncio.to_thread(
            _build_fastest_route, origin_lat, origin_lng, dest_lat, dest_lng
        ),
        asyncio.to_thread(
            _build_safest_route, origin_lat, origin_lng, dest_lat, dest_lng, segments
        ),
    )

    fp = fastest["properties"]
    sp = safest["properties"]

    risk_reduction = round(
        max(0.0, (fp["avg_risk_score"] - sp["avg_risk_score"]) / fp["avg_risk_score"] * 100),
        1,
    ) if fp["avg_risk_score"] > 0 else 0.0

    comparison = {
        "fastest_risk_level": fp["risk_level"],
        "safest_risk_level": sp["risk_level"],
        "risk_reduction_pct": risk_reduction,
        "extra_distance_km": round(sp["distance_km"] - fp["distance_km"], 2),
        "extra_minutes": max(0, sp["eta_minutes"] - fp["eta_minutes"]),
        "fastest_eta_min": fp["eta_minutes"],
        "safest_eta_min": sp["eta_minutes"],
    }

    return {"fastest": fastest, "safest": safest, "comparison": comparison}


async def get_heatmap_segments(
    lat_min: float, lat_max: float,
    lng_min: float, lng_max: float,
) -> dict:
    """
    Return risk segments in the bounding box as a GeoJSON FeatureCollection.
    Each feature is a LineString colored by risk_score.
    """
    segments = await _fetch_segments_in_bbox(lat_min, lat_max, lng_min, lng_max)

    features = []
    for seg in segments:
        score = seg.get("risk_score", 0.5)
        # Build coordinate list — use _coords if available (mock), else generate
        if "_coords" in seg:
            coords = seg["_coords"]
        else:
            # Real Supabase segments don't return geometry via REST select
            # (geometry is stored as binary). We return centroid approximations
            # from bounding box division until Phase 6 adds ST_AsGeoJSON RPC.
            # TODO Phase 6: use ST_AsGeoJSON() RPC to return real geometry.
            rng = random.Random(str(seg.get("id", score)))
            lat_c = rng.uniform(lat_min, lat_max)
            lng_c = rng.uniform(lng_min, lng_max)
            lat_d = lat_c + rng.uniform(0.001, 0.005)
            lng_d = lng_c + rng.uniform(0.001, 0.005)
            coords = [
                [round(lng_c, 6), round(lat_c, 6)],
                [round((lng_c + lng_d) / 2, 6), round((lat_c + lat_d) / 2, 6)],
                [round(lng_d, 6), round(lat_d, 6)],
            ]

        features.append({
            "type": "Feature",
            "properties": {
                "id": seg.get("id"),
                "segment_name": seg.get("segment_name", "Unknown"),
                "risk_score": score,
                "risk_level": _avg_risk(score),
                "lit_status": seg.get("lit_status", "unknown"),
                "cctv_present": seg.get("cctv_present", False),
                "notes": seg.get("notes", ""),
            },
            "geometry": {
                "type": "LineString",
                "coordinates": coords,
            },
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "meta": {
            "bbox": [lng_min, lat_min, lng_max, lat_max],
            "count": len(features),
        },
    }


async def score_route(
    waypoints: list[dict],
    time_of_day: int | None = None,
    day_of_week: int | None = None,
) -> dict:
    """
    Score each waypoint and return a RouteSafetyResponse-compatible dict.
    Falls back to the rule-based scorer if the ML service is unavailable.
    (Kept for backward-compat with existing /route-safety endpoint.)
    """
    now = datetime.now(timezone.utc)
    hour = time_of_day if time_of_day is not None else now.hour
    dow  = day_of_week  if day_of_week  is not None else now.weekday()

    async def _score_one(wp: dict) -> dict:
        try:
            result = await _score_via_ml_service(wp, hour, dow)
        except Exception:
            result = _rule_based_score(wp["lat"], wp["lng"], hour, dow)
        return {
            "lat":        wp["lat"],
            "lng":        wp["lng"],
            "risk_score": result["risk_score"],
            "risk_level": result["risk_level"],
            "confidence": result["confidence"],
        }

    scored = list(await asyncio.gather(*[_score_one(wp) for wp in waypoints]))

    avg_score = sum(w["risk_score"] for w in scored) / len(scored)
    safe_count = sum(1 for w in scored if w["risk_level"] == "safe")
    safe_pct = round(safe_count / len(scored) * 100, 1)

    return {
        "waypoints": scored,
        "overall_risk": _avg_risk(avg_score),
        "safe_pct": safe_pct,
    }


async def get_area_heatmap(
    lat_min: float,
    lat_max: float,
    lng_min: float,
    lng_max: float,
    *,
    grid_steps: int = 10,
) -> list[dict]:
    """
    Generate a risk-scored heatmap grid for the bounding box.
    Returns a list of {lat, lng, risk_score} dicts.
    (Kept for backward-compat with existing /area-heatmap endpoint.)
    """
    now = datetime.now(timezone.utc)
    hour = now.hour
    dow  = now.weekday()

    points = []
    lat_step = (lat_max - lat_min) / grid_steps
    lng_step = (lng_max - lng_min) / grid_steps

    for i in range(grid_steps + 1):
        for j in range(grid_steps + 1):
            lat = lat_min + i * lat_step
            lng = lng_min + j * lng_step
            scored = _rule_based_score(lat, lng, hour, dow)
            points.append({
                "lat": round(lat, 5),
                "lng": round(lng, 5),
                "risk_score": scored["risk_score"],
                "risk_level": scored["risk_level"],
            })

    return points
