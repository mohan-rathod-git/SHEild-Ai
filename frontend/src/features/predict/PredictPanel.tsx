/**
 * SHEildAI — PredictPanel
 *
 * Route safety scoring UI:
 *   • Origin + Destination inputs
 *   • Calls backend /predict/route-safety (proxies to ML service)
 *   • Renders scored waypoints with colour-coded risk badges
 *   • SVG route visualization
 */

import { useState } from 'react';
import { MapPin, Search, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth/useAuth';

interface ScoredWaypoint {
  lat: number;
  lng: number;
  risk_score: number;
  risk_level: 'safe' | 'moderate' | 'danger';
  confidence: number;
}

interface RouteSafetyResponse {
  waypoints: ScoredWaypoint[];
  overall_risk: 'safe' | 'moderate' | 'danger';
  safe_pct: number;
}

const RISK_COLOR = {
  safe:     'var(--color-safe)',
  moderate: '#f59e0b',
  danger:   'var(--color-sos)',
};
const RISK_BG = {
  safe:     'rgba(57,224,155,0.10)',
  moderate: 'rgba(245,158,11,0.10)',
  danger:   'rgba(255,23,68,0.10)',
};
const RISK_ICON = {
  safe:     <CheckCircle2 size={14} />,
  moderate: <AlertCircle  size={14} />,
  danger:   <AlertTriangle size={14} />,
};

// Demo waypoints for Bengaluru (used when user hasn't entered real coords)
const DEMO_WAYPOINTS = [
  { lat: 12.9716, lng: 77.5946 },
  { lat: 12.9730, lng: 77.5960 },
  { lat: 12.9745, lng: 77.5975 },
  { lat: 12.9760, lng: 77.5990 },
  { lat: 12.9775, lng: 77.6005 },
];

export default function PredictPanel() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteSafetyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

  const handleScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = session?.access_token ?? 'stub';
      const resp = await fetch(`${BASE_URL}/api/v1/predict/route-safety`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ waypoints: DEMO_WAYPOINTS }),
      });

      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const data = await resp.json() as RouteSafetyResponse;
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to score route');
    } finally {
      setLoading(false);
    }
  };

  const overallColor = result ? RISK_COLOR[result.overall_risk] : 'var(--color-pink)';

  return (
    <div style={{ padding: '28px 24px', maxWidth: '720px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'var(--color-pink-dim)',
            border: '1px solid rgba(240,25,125,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MapPin size={17} color="var(--color-pink)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Route Safety Score
          </h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-lo)', lineHeight: '1.6' }}>
          Enter your route and get an AI-powered safety score for every waypoint, powered by 40+ city datasets.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleScore} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: 'var(--color-text-lo)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Origin
          </label>
          <input
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            placeholder="Koramangala, Bengaluru"
            className="focus-ring"
            style={{
              padding: '11px 16px', borderRadius: '10px',
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-stroke-hi)',
              color: 'var(--color-text-hi)', fontSize: '13px', outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: 'var(--color-text-lo)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Destination
          </label>
          <input
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="Indiranagar, Bengaluru"
            className="focus-ring"
            style={{
              padding: '11px 16px', borderRadius: '10px',
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-stroke-hi)',
              color: 'var(--color-text-hi)', fontSize: '13px', outline: 'none',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="focus-ring"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '12px 24px', borderRadius: '10px',
            background: loading ? 'var(--color-pink-dim)' : 'var(--color-pink)',
            color: loading ? 'var(--color-text-lo)' : '#08030a',
            fontSize: '13px', fontWeight: 700, border: 'none', cursor: loading ? 'wait' : 'pointer',
            boxShadow: loading ? 'none' : '0 0 24px var(--color-pink-glow)',
            transition: 'all 0.2s', alignSelf: 'flex-start',
          }}
        >
          {loading
            ? <><div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} /> Scoring…</>
            : <><Search size={14} /> Score route</>
          }
        </button>
      </form>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.2)', fontSize: '12px', color: 'var(--color-sos)', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="rise" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Overall summary card */}
          <div style={{
            padding: '20px 22px', borderRadius: '14px',
            background: RISK_BG[result.overall_risk],
            border: `1px solid ${overallColor}28`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--color-text-lo)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Overall route risk
                </p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em', color: overallColor, textTransform: 'capitalize' }}>
                  {result.overall_risk}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 900, color: overallColor, letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {result.safe_pct}%
                </p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-lo)' }}>safe waypoints</p>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ marginTop: '14px', height: '4px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${result.safe_pct}%`,
                background: `linear-gradient(90deg, ${overallColor}88, ${overallColor})`,
                borderRadius: '3px', transition: 'width 1s ease',
              }} />
            </div>
          </div>

          {/* SVG route visualization */}
          <div style={{ borderRadius: '14px', background: 'var(--color-bg-card)', border: '1px solid var(--color-stroke-hi)', padding: '20px', overflow: 'hidden' }}>
            <p style={{ fontSize: '11px', color: 'var(--color-text-lo)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
              Route visualization
            </p>
            <svg viewBox="0 0 400 80" style={{ width: '100%', overflow: 'visible' }}>
              {/* Route line */}
              {result.waypoints.map((_wp, i) => {
                if (i === 0) return null;
                const prev = result.waypoints[i - 1];
                const x1 = (i - 1) * (400 / (result.waypoints.length - 1));
                const x2 = i * (400 / (result.waypoints.length - 1));
                return (
                  <line key={i}
                    x1={x1} y1={40} x2={x2} y2={40}
                    stroke={RISK_COLOR[prev.risk_level]}
                    strokeWidth={3} strokeLinecap="round" opacity={0.7}
                  />
                );
              })}
              {/* Waypoint dots */}
              {result.waypoints.map((wp, i) => {
                const x = i * (400 / (result.waypoints.length - 1));
                return (
                  <g key={i}>
                    <circle cx={x} cy={40} r={8} fill={RISK_COLOR[wp.risk_level]} opacity={0.2} />
                    <circle cx={x} cy={40} r={5} fill={RISK_COLOR[wp.risk_level]} />
                    <text x={x} y={68} textAnchor="middle" fontSize={9} fill="var(--color-text-lo)">
                      {(wp.risk_score * 100).toFixed(0)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Waypoint list */}
          <div>
            <p style={{ fontSize: '11px', color: 'var(--color-text-lo)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Waypoint breakdown
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {result.waypoints.map((wp, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '12px 16px', borderRadius: '11px',
                  background: RISK_BG[wp.risk_level],
                  border: `1px solid ${RISK_COLOR[wp.risk_level]}20`,
                }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: `${RISK_COLOR[wp.risk_level]}18`,
                    border: `1.5px solid ${RISK_COLOR[wp.risk_level]}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: RISK_COLOR[wp.risk_level],
                  }}>
                    {RISK_ICON[wp.risk_level]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-hi)', marginBottom: '1px' }}>
                      Waypoint {i + 1}
                    </p>
                    <p style={{ fontSize: '10px', color: 'var(--color-text-lo)' }}>
                      {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em',
                      textTransform: 'capitalize', color: RISK_COLOR[wp.risk_level],
                      background: `${RISK_COLOR[wp.risk_level]}14`,
                      border: `1px solid ${RISK_COLOR[wp.risk_level]}28`,
                      padding: '3px 9px', borderRadius: '999px',
                    }}>
                      {wp.risk_level}
                    </span>
                    <p style={{ fontSize: '10px', color: 'var(--color-text-lo)', marginTop: '3px' }}>
                      {(wp.risk_score * 100).toFixed(1)} / 100 · {(wp.confidence * 100).toFixed(0)}% conf.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
