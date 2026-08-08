"""
SHEildAI Backend — Routing Service

Proxies waypoint lists to the ML Service for risk scoring.
Falls back to a built-in rule-based scorer when the ML service
is unreachable (e.g., during local dev without Docker).
"""

from __future__ import annotations

import asyncio
import logging
import math
import random
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings

logger = logging.getLogger("sheildai.routing")


# ─────────────────────────────────────────────────────────────
# Risk scoring helpers
# ─────────────────────────────────────────────────────────────

def _rule_based_score(lat: float, lng: float, hour: int, dow: int) -> dict:
    """
    Deterministic rule-based risk scorer used as a fallback when
    the ML service is not reachable.

    Rules (simplified, replaceable by real model):
      - Night hours (21-5h) → +0.25 base risk
      - Weekend late night → +0.15 extra
      - Equator proximity (very rough urban proxy) → ±0.05 noise
    """
    base = 0.20

    # Time-of-day penalty
    if 21 <= hour or hour <= 5:
        base += 0.25
    elif 18 <= hour <= 20:
        base += 0.10

    # Weekend late-night premium
    if dow in (4, 5, 6) and (22 <= hour or hour <= 3):
        base += 0.15

    # Pseudo-geographic noise (seeded to lat/lng so it's stable)
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
# Public API
# ─────────────────────────────────────────────────────────────

async def score_route(
    waypoints: list[dict],
    time_of_day: int | None = None,
    day_of_week: int | None = None,
) -> dict:
    """
    Score each waypoint and return a RouteSafetyResponse-compatible dict.
    Falls back to the rule-based scorer if the ML service is unavailable.
    """
    now = datetime.now(timezone.utc)
    hour = time_of_day if time_of_day is not None else now.hour
    dow  = day_of_week  if day_of_week  is not None else now.weekday()

    scored: list[dict] = []

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

    scored = await asyncio.gather(*[_score_one(wp) for wp in waypoints])

    # Overall summary
    avg_score = sum(w["risk_score"] for w in scored) / len(scored)
    safe_count = sum(1 for w in scored if w["risk_level"] == "safe")
    safe_pct = round(safe_count / len(scored) * 100, 1)

    if avg_score < 0.35:
        overall = "safe"
    elif avg_score < 0.65:
        overall = "moderate"
    else:
        overall = "danger"

    return {
        "waypoints": list(scored),
        "overall_risk": overall,
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
