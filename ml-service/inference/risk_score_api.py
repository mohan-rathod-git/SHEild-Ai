"""
SHEildAI ML Service — Risk Score API

Exposes a lightweight FastAPI app that scores individual lat/lng
waypoints and returns a risk level.

Phase 2+: Uses a rule-based heuristic model.
Phase 3+: Will load a trained XGBoost/LightGBM/RF ensemble from
          ml-service/models/ and use it for inference.
"""

from __future__ import annotations

import math
import random
from datetime import datetime, timezone

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="SHEildAI ML Service",
    description="Risk-score inference for route segments",
    version="0.2.0",
)


# ── Request / Response models ────────────────────────────────

class PredictRequest(BaseModel):
    lat: float = Field(..., ge=-90,  le=90)
    lng: float = Field(..., ge=-180, le=180)
    time_of_day: int = Field(default=12, ge=0, le=23)
    day_of_week: int = Field(default=0,  ge=0, le=6)


class PredictResponse(BaseModel):
    risk_score: float   # 0.0 (safe) → 1.0 (danger)
    risk_level: str     # "safe" | "moderate" | "danger"
    confidence: float   # model confidence 0–1
    model_version: str


# ── Rule-based scoring (Phase 2 mock; replaced by real model later) ──

def _score(lat: float, lng: float, hour: int, dow: int) -> PredictResponse:
    """
    Deterministic, stateless risk score based on time + day + location noise.

    This is intentionally simple so it can be swapped for a real model
    without touching the API contract.
    """
    base = 0.20

    # Night / late-night penalty
    if 21 <= hour or hour <= 5:
        base += 0.26
    elif 18 <= hour <= 20:
        base += 0.10

    # Weekend premium
    if dow in (4, 5, 6) and (22 <= hour or hour <= 4):
        base += 0.14

    # Pseudo-geographic noise (seeded by position for repeatability)
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

    return PredictResponse(
        risk_score=round(score, 3),
        risk_level=level,
        confidence=confidence,
        model_version="rule-based-v1",
    )


# ── Endpoints ────────────────────────────────────────────────

@app.get("/health", tags=["infra"])
async def health():
    """Liveness check."""
    return {"status": "ok", "service": "sheildai-ml-service"}


@app.post("/predict", response_model=PredictResponse, tags=["inference"])
async def predict(body: PredictRequest):
    """
    Score a single lat/lng waypoint.

    Returns a risk_score (0–1), risk_level, and model confidence.
    The backend routing_service calls this endpoint for each waypoint
    in a route.
    """
    return _score(body.lat, body.lng, body.time_of_day, body.day_of_week)
