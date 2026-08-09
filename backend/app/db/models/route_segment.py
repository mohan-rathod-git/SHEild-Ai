"""
SHEildAI Backend — RouteSegment SQLAlchemy Model

Mirrors the `route_segments` Supabase table.
Uses GeoAlchemy2 for the PostGIS LineString geometry column.

NOTE: Direct SQLAlchemy queries against Supabase require the
      postgres:// connection string (SUPABASE_DB_URL), not the REST API.
      In Phase 3 we query via supabase-py (REST/RPC) instead.
      This model is kept as a canonical schema reference and
      will be used directly in Phase 6 when we run spatial ML queries.
"""

from __future__ import annotations

from sqlalchemy import BigInteger, Boolean, Column, Float, String, Text, DateTime, func
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class RouteSegment(Base):
    """
    Represents a road segment scored for safety risk.

    Columns
    -------
    id              Auto-increment PK
    segment_name    Human-readable label (e.g. "80 Feet Road - Sec 1")
    geom            PostGIS LineString geometry, SRID 4326 (WGS-84)
    risk_score      Float 0.0–1.0  (0 = very safe, 1 = high risk)
                    Phase 3: populated from seed data / rule-based scorer
                    Phase 6: TODO — replace with ML model output from ml-service
    lit_status      Lighting quality: 'well_lit' | 'partially_lit' | 'unlit' | 'unknown'
    cctv_present    Whether CCTV cameras are present on segment
    notes           Free-text field for additional context
    created_at      Row creation timestamp (UTC)
    """

    __tablename__ = "route_segments"
    __table_args__ = {"schema": "public"}

    id: int = Column(BigInteger, primary_key=True, autoincrement=True)
    segment_name: str = Column(String(255), nullable=False)

    # GeoAlchemy2 geometry column — requires `pip install geoalchemy2`
    # Commented out to avoid requiring psycopg2/GDAL in Phase 3.
    # Uncomment in Phase 6 when direct DB connection is used.
    # geom = Column(Geometry("LINESTRING", srid=4326), nullable=False)

    risk_score: float = Column(Float, nullable=False)
    lit_status: str = Column(
        String(32),
        nullable=False,
        default="unknown",
    )
    cctv_present: bool = Column(Boolean, nullable=False, default=False)
    notes: str | None = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return (
            f"<RouteSegment id={self.id!r} name={self.segment_name!r} "
            f"risk={self.risk_score:.2f}>"
        )

    def to_geojson_properties(self) -> dict:
        """Return non-geometry fields as a GeoJSON properties dict."""
        return {
            "id": self.id,
            "segment_name": self.segment_name,
            "risk_score": self.risk_score,
            "risk_level": _risk_level(self.risk_score),
            "lit_status": self.lit_status,
            "cctv_present": self.cctv_present,
            "notes": self.notes,
        }


def _risk_level(score: float) -> str:
    """Convert numeric risk score to categorical label."""
    if score < 0.35:
        return "safe"
    if score < 0.65:
        return "moderate"
    return "danger"
