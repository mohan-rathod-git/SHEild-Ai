/**
 * SHEildAI — PredictRing
 *
 * A circular status widget for the Predict pillar on the home dashboard.
 * Shows at-a-glance route/journey state and quick-navigates to #/journey.
 *
 * Status states:
 *   • idle        — "No active journey"
 *   • active      — "Safest route active" (green)
 */

import { Navigation2, MapPin, TrendingDown } from 'lucide-react';

export type PredictStatus = 'idle' | 'active';

interface PredictRingProps {
  status?: PredictStatus;
  routeLabel?: string;      // e.g. "Koramangala → Indiranagar"
  etaMinutes?: number;
  riskLevel?: string;       // "safe" | "moderate" | "danger"
  onClick: () => void;
}

export default function PredictRing({
  status = 'idle',
  routeLabel,
  etaMinutes,
  riskLevel = 'safe',
  onClick,
}: PredictRingProps) {
  const isActive = status === 'active';

  // Accent for this pillar — indigo/blue
  const accent    = '#818cf8';
  const accentDim = 'rgba(129,140,248,0.12)';
  const accentGlow= 'rgba(129,140,248,0.22)';

  // Ring progress: idle = 25%, active = 80%
  const progress = isActive ? 80 : 25;
  const circumference = 2 * Math.PI * 44; // r=44
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <button
      onClick={onClick}
      id="predict-ring"
      aria-label="Predict pillar — open journey planner"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '14px', padding: '28px 20px 22px',
        background: isActive ? accentDim : 'var(--color-bg-card)',
        border: `1.5px solid ${isActive ? accent + '44' : 'var(--color-stroke-hi)'}`,
        borderRadius: '20px', cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: isActive ? `0 0 32px ${accentGlow}` : 'none',
        width: '100%', textAlign: 'center',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 12px 40px ${accentGlow}`;
        e.currentTarget.style.borderColor = accent + '66';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isActive ? `0 0 32px ${accentGlow}` : 'none';
        e.currentTarget.style.borderColor = isActive ? accent + '44' : 'var(--color-stroke-hi)';
      }}
    >
      {/* ── Circular progress ring ── */}
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        {/* Background track */}
        <svg width="100" height="100" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="44"
            fill="none" stroke="var(--color-stroke-hi)" strokeWidth="4" />
          <circle cx="50" cy="50" r="44"
            fill="none" stroke={accent} strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>

        {/* Centre icon */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: `${accent}18`,
            border: `1.5px solid ${accent}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isActive ? `0 0 20px ${accentGlow}` : 'none',
          }}>
            <Navigation2 size={22} color={accent} />
          </div>
        </div>

        {/* Active pulse ring */}
        {isActive && (
          <div style={{
            position: 'absolute', inset: '-6px',
            borderRadius: '50%',
            border: `2px solid ${accent}22`,
            animation: 'pillar-pulse 2.5s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* ── Pillar label ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
        <p style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: accent,
        }}>
          Predict
        </p>

        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-hi)', lineHeight: 1.3 }}>
          {isActive
            ? (routeLabel ?? 'Route active')
            : 'No active journey'}
        </p>

        {isActive && etaMinutes && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <TrendingDown size={11} color="#39e09b" />
            <span style={{ fontSize: '11px', color: '#39e09b' }}>
              {etaMinutes} min · {riskLevel} risk
            </span>
          </div>
        )}

        {!isActive && (
          <p style={{ fontSize: '11px', color: 'var(--color-text-lo)', marginTop: '2px' }}>
            Tap to plan a safe route
          </p>
        )}
      </div>

      {/* ── Quick action chip ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '5px 12px', borderRadius: '999px',
        background: `${accent}14`, border: `1px solid ${accent}33`,
        fontSize: '11px', fontWeight: 600, color: accent,
      }}>
        <MapPin size={10} />
        {isActive ? 'View route' : 'Start journey'}
      </div>

      <style>{`
        @keyframes pillar-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.06); }
        }
      `}</style>
    </button>
  );
}
