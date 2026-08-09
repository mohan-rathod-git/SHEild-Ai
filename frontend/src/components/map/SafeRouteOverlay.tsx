/**
 * SHEildAI — SafeRouteOverlay
 *
 * Renders two route options on the Leaflet map:
 *   • Fastest route — dashed blue/indigo line (lower opacity when inactive)
 *   • Safest route  — solid green line with animated glow (lower opacity when inactive)
 *
 * Both routes are always rendered; the `activeRoute` prop controls which
 * is highlighted. Markers are shown at origin and destination.
 */

import { useEffect } from 'react';
import { Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

interface GeoJSONLineFeature {
  type: 'Feature';
  properties: {
    route_type: 'fastest' | 'safest';
    label: string;
    description: string;
    why_safer?: string;
    avg_risk_score: number;
    risk_level: string;
    distance_km: number;
    eta_minutes: number;
    waypoints: { lat: number; lng: number; risk_score: number; risk_level: string }[];
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
}

interface SafeRouteOverlayProps {
  fastest: GeoJSONLineFeature | null;
  safest: GeoJSONLineFeature | null;
  activeRoute: 'fastest' | 'safest';
  originLabel?: string;
  destLabel?: string;
}

// ── Custom Leaflet marker icons (avoids the missing-icon-in-Vite issue) ──

function makeIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
    html: `
      <div style="
        width:34px; height:34px;
        display:flex; align-items:center; justify-content:center;
        position:relative;
      ">
        <div style="
          width:28px; height:28px; border-radius:50% 50% 50% 0;
          transform: rotate(-45deg);
          background:${color};
          box-shadow:0 0 16px ${color}88;
          border:2px solid rgba(255,255,255,0.2);
        "></div>
        <div style="
          position:absolute; inset:0;
          display:flex; align-items:center; justify-content:center;
          font-size:12px; font-weight:800; color:#08030a;
          font-family:'DM Sans',sans-serif;
        ">${label}</div>
      </div>
    `,
  });
}

const ORIGIN_ICON = makeIcon('#f0197d', 'A');
const DEST_ICON   = makeIcon('#39e09b', 'B');

// ── Map auto-fit helper ──────────────────────────────────────

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length >= 2) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    }
  }, [map, coords]);
  return null;
}

export default function SafeRouteOverlay({
  fastest,
  safest,
  activeRoute,
  originLabel = 'Origin',
  destLabel = 'Destination',
}: SafeRouteOverlayProps) {
  if (!fastest && !safest) return null;

  // Convert GeoJSON [lng, lat] → Leaflet [lat, lng]
  const toLatLng = (coords: [number, number][]): [number, number][] =>
    coords.map(([lng, lat]) => [lat, lng]);

  const fastCoords = fastest ? toLatLng(fastest.geometry.coordinates) : [];
  const safeCoords = safest  ? toLatLng(safest.geometry.coordinates)  : [];

  // Origin = first point of fastest (or safest), Dest = last point
  const allCoords = [...fastCoords, ...safeCoords];
  const originPos = fastCoords[0] ?? safeCoords[0];
  const destPos   = fastCoords[fastCoords.length - 1] ?? safeCoords[safeCoords.length - 1];

  const fastActive = activeRoute === 'fastest';
  const safeActive = activeRoute === 'safest';

  return (
    <>
      {/* Auto-fit map bounds */}
      {allCoords.length > 0 && <FitBounds coords={allCoords} />}

      {/* Fastest route — dashed indigo/blue */}
      {fastest && fastCoords.length > 0 && (
        <Polyline
          positions={fastCoords}
          pathOptions={{
            color: fastActive ? '#818cf8' : '#818cf8',
            weight: fastActive ? 5 : 3,
            opacity: fastActive ? 0.95 : 0.35,
            dashArray: '10 6',
            lineCap: 'round',
          }}
        >
          <Popup>
            <RoutePopupContent feature={fastest} />
          </Popup>
        </Polyline>
      )}

      {/* Fastest route glow when active */}
      {fastest && fastCoords.length > 0 && fastActive && (
        <Polyline
          positions={fastCoords}
          pathOptions={{
            color: '#818cf8',
            weight: 14,
            opacity: 0.12,
            dashArray: '10 6',
          }}
          interactive={false}
        />
      )}

      {/* Safest route — solid emerald green */}
      {safest && safeCoords.length > 0 && (
        <Polyline
          positions={safeCoords}
          pathOptions={{
            color: safeActive ? '#39e09b' : '#39e09b',
            weight: safeActive ? 6 : 3,
            opacity: safeActive ? 1.0 : 0.35,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        >
          <Popup>
            <RoutePopupContent feature={safest} />
          </Popup>
        </Polyline>
      )}

      {/* Safest route glow when active */}
      {safest && safeCoords.length > 0 && safeActive && (
        <Polyline
          positions={safeCoords}
          pathOptions={{
            color: '#39e09b',
            weight: 18,
            opacity: 0.12,
          }}
          interactive={false}
        />
      )}

      {/* Origin marker */}
      {originPos && (
        <Marker position={originPos} icon={ORIGIN_ICON}>
          <Popup>
            <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#fff0f6', fontSize: '12px', fontWeight: 600 }}>
              📍 {originLabel}
            </div>
          </Popup>
        </Marker>
      )}

      {/* Destination marker */}
      {destPos && (
        <Marker position={destPos} icon={DEST_ICON}>
          <Popup>
            <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#fff0f6', fontSize: '12px', fontWeight: 600 }}>
              🏁 {destLabel}
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}

// ── Route popup ───────────────────────────────────────────────

function RoutePopupContent({ feature }: { feature: GeoJSONLineFeature }) {
  const p = feature.properties;
  const isSafe = p.route_type === 'safest';
  const color = isSafe ? '#39e09b' : '#818cf8';

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minWidth: '160px', padding: '4px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color, marginBottom: '6px' }}>
        {p.label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', color: '#c8a0b8' }}>
        <span>🕐 {p.eta_minutes} min · {p.distance_km} km</span>
        <span>⚠️ Risk: <b style={{ color }}>{p.risk_level}</b></span>
        {p.why_safer && (
          <span style={{ color: '#7a546c', fontStyle: 'italic', marginTop: '3px' }}>
            ✓ {p.why_safer}
          </span>
        )}
      </div>
    </div>
  );
}
