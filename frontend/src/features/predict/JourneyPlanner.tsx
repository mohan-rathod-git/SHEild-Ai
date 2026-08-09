/**
 * SHEildAI — JourneyPlanner (Phase 3: Predict Pillar)
 *
 * Full journey planning page:
 *   • Origin / destination inputs with lat,lng parsing OR address labels
 *   • "Use my location" via browser geolocation
 *   • Calls POST /predict/route → receives fastest + safest GeoJSON routes
 *   • Loads GET /predict/heatmap → renders risk segment overlay
 *   • Interactive toggle between Fastest / Safest view
 *   • Comparison card: ETA, risk level, why this route is safer
 *
 * Layout: split panel — left = controls + comparison, right = Leaflet map
 */

import { useState, useCallback } from 'react';
import {
  MapPin, Navigation, ArrowRight, Zap, ShieldCheck,
  Clock, AlertTriangle, CheckCircle2, LocateFixed, Loader2,
  ChevronRight, Info,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import MapWrapper from '../../components/map/MapWrapper';
import HeatmapLayer from '../../components/map/HeatmapLayer';
import SafeRouteOverlay from '../../components/map/SafeRouteOverlay';

// ── Types ────────────────────────────────────────────────────

interface LatLng { lat: number; lng: number; }

interface RouteFeature {
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
  geometry: { type: 'LineString'; coordinates: [number, number][] };
}

interface RouteResponse {
  fastest: RouteFeature;
  safest:  RouteFeature;
  comparison: {
    fastest_risk_level: string;
    safest_risk_level: string;
    risk_reduction_pct: number;
    extra_distance_km: number;
    extra_minutes: number;
    fastest_eta_min: number;
    safest_eta_min: number;
  };
}

interface HeatmapFeature {
  type: 'Feature';
  properties: {
    id: number | null;
    segment_name: string;
    risk_score: number;
    risk_level: 'safe' | 'moderate' | 'danger';
    lit_status: string;
    cctv_present: boolean;
    notes: string;
  };
  geometry: { type: 'LineString'; coordinates: [number, number][] };
}

// ── Constants ────────────────────────────────────────────────

// Bengaluru city centre defaults
const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];
const DEFAULT_ZOOM = 13;

const BENGALURU_BBOX = {
  lat_min: 12.85, lat_max: 13.05,
  lng_min: 77.50, lng_max: 77.70,
};

// Well-known Bengaluru locations for quick-pick demo
const DEMO_LOCATIONS = [
  { label: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { label: 'Indiranagar',  lat: 12.9784, lng: 77.6408 },
  { label: 'HSR Layout',   lat: 12.9116, lng: 77.6474 },
  { label: 'Jayanagar',    lat: 12.9250, lng: 77.5938 },
];

// ── Risk display helpers ─────────────────────────────────────

const RISK_COLOR: Record<string, string> = {
  safe:     '#39e09b',
  moderate: '#f59e0b',
  danger:   '#ff1744',
};

function RiskBadge({ level, score }: { level: string; score?: number }) {
  const color = RISK_COLOR[level] ?? '#c8a0b8';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '999px',
      background: `${color}18`, border: `1px solid ${color}44`,
      color, fontSize: '11px', fontWeight: 700, textTransform: 'capitalize',
    }}>
      {level}{score !== undefined ? ` · ${(score * 100).toFixed(0)}%` : ''}
    </span>
  );
}

// ── Location input component ─────────────────────────────────

interface LocationInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onGeolocate?: () => void;
  placeholder?: string;
  id: string;
}

function LocationInput({ label, value, onChange, onGeolocate, placeholder, id }: LocationInputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label
        htmlFor={id}
        style={{ fontSize: '10px', color: 'var(--color-text-lo)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <MapPin size={13} style={{ position: 'absolute', left: '12px', color: 'var(--color-pink)', flexShrink: 0 }} />
        <input
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="focus-ring"
          style={{
            flex: 1, padding: '10px 12px 10px 32px',
            paddingRight: onGeolocate ? '40px' : '12px',
            borderRadius: '10px',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-stroke-hi)',
            color: 'var(--color-text-hi)', fontSize: '13px', outline: 'none',
          }}
        />
        {onGeolocate && (
          <button
            type="button"
            onClick={onGeolocate}
            title="Use my current location"
            style={{
              position: 'absolute', right: '8px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-lo)', padding: '4px',
              borderRadius: '6px', transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-pink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-lo)')}
          >
            <LocateFixed size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export default function JourneyPlanner() {
  const { session } = useAuth();

  // Form state
  const [originInput, setOriginInput] = useState('');
  const [destInput,   setDestInput]   = useState('');
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [dest,   setDest]   = useState<LatLng | null>(null);
  const [originLabel, setOriginLabel] = useState('Origin');
  const [destLabel,   setDestLabel]   = useState('Destination');

  // Loading / error
  const [loadingRoute,   setLoadingRoute]   = useState(false);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [routeData,   setRouteData]   = useState<RouteResponse | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapFeature[]>([]);
  const [activeRoute, setActiveRoute] = useState<'fastest' | 'safest'>('safest');

  // Map centre
  const [mapCenter] = useState<[number, number]>(DEFAULT_CENTER);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';
  const authHeader = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  // ── Parse location input ────────────────────────────────────

  function parseLatLng(input: string): LatLng | null {
    // Accept "lat, lng" format
    const m = input.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    // Check demo locations by name
    const lower = input.toLowerCase().trim();
    const demo = DEMO_LOCATIONS.find(d => d.label.toLowerCase().includes(lower));
    if (demo) return { lat: demo.lat, lng: demo.lng };
    return null;
  }

  // ── Geolocation ─────────────────────────────────────────────

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setOrigin({ lat, lng });
        setOriginInput(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setOriginLabel('My location');
      },
      () => setError('Could not get your location — please enter it manually'),
    );
  }, []);

  // ── Quick-pick demo ──────────────────────────────────────────

  function quickPick() {
    const from = DEMO_LOCATIONS[0];
    const to   = DEMO_LOCATIONS[1];
    setOriginInput(from.label);
    setDestInput(to.label);
    setOrigin({ lat: from.lat, lng: from.lng });
    setDest({ lat: to.lat, lng: to.lng });
    setOriginLabel(from.label);
    setDestLabel(to.label);
  }

  // ── Fetch heatmap ────────────────────────────────────────────

  async function fetchHeatmap(bbox: typeof BENGALURU_BBOX) {
    setLoadingHeatmap(true);
    try {
      const params = new URLSearchParams({
        lat_min: String(bbox.lat_min), lat_max: String(bbox.lat_max),
        lng_min: String(bbox.lng_min), lng_max: String(bbox.lng_max),
      });
      const resp = await fetch(`${BASE_URL}/api/v1/predict/heatmap?${params}`, {
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      if (!resp.ok) throw new Error(`Heatmap API ${resp.status}`);
      const data = await resp.json();
      setHeatmapData(data.features ?? []);
    } catch (e: unknown) {
      console.warn('Heatmap fetch failed, using empty overlay:', e);
      setHeatmapData([]);
    } finally {
      setLoadingHeatmap(false);
    }
  }

  // ── Submit route request ─────────────────────────────────────

  async function handlePlanJourney(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRouteData(null);

    // Resolve locations
    const resolvedOrigin = origin ?? parseLatLng(originInput);
    const resolvedDest   = dest   ?? parseLatLng(destInput);

    if (!resolvedOrigin) {
      setError('Could not resolve origin — try "Koramangala" or "12.9352, 77.6245"');
      return;
    }
    if (!resolvedDest) {
      setError('Could not resolve destination — try "Indiranagar" or "12.9784, 77.6408"');
      return;
    }

    setOrigin(resolvedOrigin);
    setDest(resolvedDest);
    if (!origin) setOriginLabel(originInput || 'Origin');
    if (!dest)   setDestLabel(destInput || 'Destination');

    setLoadingRoute(true);

    // Fetch route + heatmap in parallel
    const bbox = {
      lat_min: Math.min(resolvedOrigin.lat, resolvedDest.lat) - 0.02,
      lat_max: Math.max(resolvedOrigin.lat, resolvedDest.lat) + 0.02,
      lng_min: Math.min(resolvedOrigin.lng, resolvedDest.lng) - 0.02,
      lng_max: Math.max(resolvedOrigin.lng, resolvedDest.lng) + 0.02,
    };

    try {
      const [routeResp] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/predict/route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify({
            origin:      { lat: resolvedOrigin.lat, lng: resolvedOrigin.lng },
            destination: { lat: resolvedDest.lat,   lng: resolvedDest.lng   },
          }),
        }),
        fetchHeatmap(bbox),
      ]);

      if (!routeResp.ok) {
        const detail = await routeResp.json().catch(() => ({}));
        throw new Error(detail.detail ?? `Route API ${routeResp.status}`);
      }
      const data = await routeResp.json() as RouteResponse;
      setRouteData(data);
      setActiveRoute('safest');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to plan journey');
    } finally {
      setLoadingRoute(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────

  const cmp = routeData?.comparison;
  const activeProp = routeData
    ? (activeRoute === 'safest' ? routeData.safest : routeData.fastest).properties
    : null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--color-bg-root)', minHeight: '100vh',
    }}>

      {/* ── Page header ── */}
      <div style={{
        padding: '20px 28px 16px',
        borderBottom: '1px solid var(--color-stroke)',
        background: 'var(--color-bg-base)',
        display: 'flex', alignItems: 'center', gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--color-pink), var(--color-rose))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px var(--color-pink-glow)',
        }}>
          <Navigation size={17} color="#08030a" strokeWidth={2.5} />
        </div>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800,
            letterSpacing: '-0.03em', color: 'var(--color-text-hi)', lineHeight: 1,
          }}>
            Journey Planner
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--color-text-lo)', marginTop: '2px' }}>
            AI-powered safe routing · Bengaluru
          </p>
        </div>

        {/* Quick demo button */}
        <button
          type="button"
          onClick={quickPick}
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '8px',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-stroke-hi)',
            color: 'var(--color-text-md)', fontSize: '12px', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-pink)'; e.currentTarget.style.color = 'var(--color-text-hi)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-stroke-hi)'; e.currentTarget.style.color = 'var(--color-text-md)'; }}
        >
          <Zap size={12} />
          Try demo route
        </button>
      </div>

      {/* ── Main body: controls left, map right ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'clamp(300px, 30%, 380px) 1fr',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0,
      }}>

        {/* ─── LEFT PANEL ─── */}
        <div style={{
          padding: '20px 20px',
          borderRight: '1px solid var(--color-stroke)',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '20px',
          background: 'var(--color-bg-base)',
        }}>

          {/* ── Form ── */}
          <form onSubmit={handlePlanJourney} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <LocationInput
              id="journey-origin"
              label="From"
              value={originInput}
              onChange={v => { setOriginInput(v); setOrigin(null); }}
              onGeolocate={handleGeolocate}
              placeholder="Koramangala or 12.93, 77.62"
            />
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-stroke-hi)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ArrowRight size={11} style={{ color: 'var(--color-text-lo)' }} />
              </div>
            </div>
            <LocationInput
              id="journey-destination"
              label="To"
              value={destInput}
              onChange={v => { setDestInput(v); setDest(null); }}
              placeholder="Indiranagar or 12.97, 77.64"
            />

            <button
              type="submit"
              id="journey-plan-btn"
              disabled={loadingRoute}
              className="focus-ring"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '11px 20px', borderRadius: '10px',
                background: loadingRoute ? 'var(--color-pink-dim)' : 'var(--color-pink)',
                color: loadingRoute ? 'var(--color-text-lo)' : '#08030a',
                fontSize: '13px', fontWeight: 700, border: 'none',
                cursor: loadingRoute ? 'wait' : 'pointer',
                boxShadow: loadingRoute ? 'none' : '0 0 24px var(--color-pink-glow)',
                transition: 'all 0.2s',
              }}
            >
              {loadingRoute
                ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Planning…</>
                : <><ShieldCheck size={14} /> Plan safe journey</>
              }
            </button>
          </form>

          {/* ── Error ── */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(255,23,68,0.08)',
              border: '1px solid rgba(255,23,68,0.25)',
              fontSize: '12px', color: 'var(--color-sos)',
              display: 'flex', gap: '8px', alignItems: 'flex-start',
            }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
              {error}
            </div>
          )}

          {/* ── Route toggle ── */}
          {routeData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '10px', color: 'var(--color-text-lo)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Select route
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['fastest', 'safest'] as const).map(type => {
                  const r = type === 'fastest' ? routeData.fastest : routeData.safest;
                  const isActive = activeRoute === type;
                  const accent = type === 'fastest' ? '#818cf8' : '#39e09b';
                  return (
                    <button
                      key={type}
                      id={`route-toggle-${type}`}
                      onClick={() => setActiveRoute(type)}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: '10px',
                        background: isActive ? `${accent}14` : 'var(--color-bg-surface)',
                        border: `1.5px solid ${isActive ? accent : 'var(--color-stroke-hi)'}`,
                        color: isActive ? accent : 'var(--color-text-md)',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.2s', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {type === 'fastest' ? <Zap size={12} /> : <ShieldCheck size={12} />}
                        {r.properties.label}
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.75, fontWeight: 400 }}>
                        {r.properties.eta_minutes} min · {r.properties.distance_km} km
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Comparison card ── */}
          {routeData && cmp && (
            <div style={{
              borderRadius: '12px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-stroke-hi)',
              overflow: 'hidden',
            }}>
              {/* Comparison header */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-stroke)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <Info size={13} style={{ color: 'var(--color-pink)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-hi)', letterSpacing: '0.04em' }}>
                  Route comparison
                </span>
              </div>

              {/* Comparison rows */}
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                <CompareRow
                  label="Risk level"
                  fastest={<RiskBadge level={cmp.fastest_risk_level} />}
                  safest={<RiskBadge level={cmp.safest_risk_level} />}
                />

                <CompareRow
                  label="ETA"
                  fastest={<span style={{ color: '#818cf8', fontWeight: 600, fontSize: '12px' }}>{cmp.fastest_eta_min} min</span>}
                  safest={
                    <span style={{ color: '#39e09b', fontWeight: 600, fontSize: '12px' }}>
                      {cmp.safest_eta_min} min
                      {cmp.extra_minutes > 0 && (
                        <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 400 }}> (+{cmp.extra_minutes}m)</span>
                      )}
                    </span>
                  }
                />

                {cmp.risk_reduction_pct > 0 && (
                  <div style={{
                    padding: '8px 12px', borderRadius: '8px',
                    background: 'rgba(57,224,155,0.06)',
                    border: '1px solid rgba(57,224,155,0.15)',
                    display: 'flex', gap: '8px', alignItems: 'flex-start',
                  }}>
                    <CheckCircle2 size={13} style={{ color: '#39e09b', flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ fontSize: '11px', color: 'var(--color-text-md)', lineHeight: '1.5' }}>
                      <b style={{ color: '#39e09b' }}>{cmp.risk_reduction_pct}% lower risk</b> on the safest route
                      {cmp.extra_minutes <= 2 && ' — barely any extra time.'}
                      {cmp.extra_minutes > 2 && ` — ${cmp.extra_minutes} extra minutes.`}
                    </div>
                  </div>
                )}

                {/* Why safer */}
                {routeData.safest.properties.why_safer && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-lo)', lineHeight: '1.6', paddingTop: '2px' }}>
                    <span style={{ color: '#39e09b', fontWeight: 600 }}>Why safer:</span>{' '}
                    {routeData.safest.properties.why_safer}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Heatmap legend ── */}
          <div style={{
            padding: '12px 16px', borderRadius: '10px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-stroke-hi)',
          }}>
            <p style={{ fontSize: '10px', color: 'var(--color-text-lo)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Heatmap legend
            </p>
            {[
              { color: '#39e09b', label: 'Safe (0–35%)' },
              { color: '#f59e0b', label: 'Moderate (35–65%)' },
              { color: '#ff1744', label: 'High risk (65–100%)' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div style={{ width: '24px', height: '4px', borderRadius: '2px', background: color }} />
                <span style={{ fontSize: '11px', color: 'var(--color-text-md)' }}>{label}</span>
              </div>
            ))}
            <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '3px', borderRadius: '2px', background: '#818cf8', opacity: 0.8, borderTop: '1px dashed #818cf8' }} />
                <span style={{ fontSize: '10px', color: 'var(--color-text-lo)' }}>Fastest</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '3px', borderRadius: '2px', background: '#39e09b' }} />
                <span style={{ fontSize: '10px', color: 'var(--color-text-lo)' }}>Safest</span>
              </div>
            </div>
          </div>

          {/* ── Active route summary pill ── */}
          {activeProp && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px',
              background: activeRoute === 'safest' ? 'rgba(57,224,155,0.07)' : 'rgba(129,140,248,0.07)',
              border: `1px solid ${activeRoute === 'safest' ? 'rgba(57,224,155,0.2)' : 'rgba(129,140,248,0.2)'}`,
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px',
            }}>
              <Clock size={13} style={{ color: activeRoute === 'safest' ? '#39e09b' : '#818cf8', flexShrink: 0 }} />
              <div>
                <span style={{ color: 'var(--color-text-hi)', fontWeight: 600 }}>
                  {activeProp.label}
                </span>
                {' '}
                <span style={{ color: 'var(--color-text-lo)' }}>
                  · {activeProp.eta_minutes} min · {activeProp.distance_km} km
                </span>
              </div>
              <ChevronRight size={12} style={{ marginLeft: 'auto', color: 'var(--color-text-lo)' }} />
            </div>
          )}

          {loadingHeatmap && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-lo)', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} />
              Loading heatmap…
            </div>
          )}
        </div>

        {/* ─── RIGHT PANEL — MAP ─── */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <MapWrapper
            center={mapCenter}
            zoom={DEFAULT_ZOOM}
            style={{ height: '100%', minHeight: '500px' }}
          >
            {/* Risk heatmap overlay */}
            <HeatmapLayer segments={heatmapData} />

            {/* Route lines + markers */}
            {routeData && (
              <SafeRouteOverlay
                fastest={routeData.fastest}
                safest={routeData.safest}
                activeRoute={activeRoute}
                originLabel={originLabel}
                destLabel={destLabel}
              />
            )}
          </MapWrapper>

          {/* Map overlay — empty state hint */}
          {!routeData && !loadingRoute && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '14px 20px', borderRadius: '14px',
              background: 'rgba(13,5,16,0.88)',
              border: '1px solid var(--color-stroke-hi)',
              backdropFilter: 'blur(16px)',
              textAlign: 'center', pointerEvents: 'none',
              maxWidth: '240px',
            }}>
              <Navigation size={22} style={{ color: 'var(--color-pink)', marginBottom: '8px' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-hi)', marginBottom: '4px' }}>
                Enter a route to begin
              </p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-lo)', lineHeight: '1.5' }}>
                Risk segments shown as coloured lines on the map
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .journey-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── Compare row helper ───────────────────────────────────────

function CompareRow({
  label,
  fastest,
  safest,
}: { label: string; fastest: React.ReactNode; safest: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '11px', color: 'var(--color-text-lo)', width: '60px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>{fastest}</div>
        <ArrowRight size={10} style={{ color: 'var(--color-text-lo)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>{safest}</div>
      </div>
    </div>
  );
}
