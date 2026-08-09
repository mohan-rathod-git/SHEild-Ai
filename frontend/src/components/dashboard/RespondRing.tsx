/**
 * SHEildAI — RespondRing
 *
 * Circular status widget for the Respond (SOS) pillar.
 * Reads SOS phase from useSOSStore; navigates to Respond tab.
 *
 * Status states:
 *   • idle     — "No active SOS" (dim pink)
 *   • active   — "SOS LIVE" (red pulsing)
 *   • resolved — "SOS resolved" (green briefly)
 */

import { Siren, CheckCircle2, AlertOctagon } from 'lucide-react';
import type { SOSPhase } from '../../store/sosStore';

interface RespondRingProps {
  phase?: SOSPhase;
  resolvedCount?: number;   // number of past resolved SOS events
  onClick: () => void;
}

export default function RespondRing({
  phase = 'idle',
  resolvedCount = 0,
  onClick,
}: RespondRingProps) {
  const isActive   = phase === 'active' || phase === 'triggering' || phase === 'arming';
  const isResolved = phase === 'resolved';

  const accent    = isActive   ? '#ff1744'
                  : isResolved ? '#39e09b'
                  : 'var(--color-pink)';
  const accentDim = isActive   ? 'rgba(255,23,68,0.12)'
                  : isResolved ? 'rgba(57,224,155,0.10)'
                  : 'var(--color-bg-card)';
  const accentGlow= isActive   ? 'rgba(255,23,68,0.30)'
                  : isResolved ? 'rgba(57,224,155,0.20)'
                  : 'rgba(240,25,125,0.18)';

  const progress   = isActive ? 100 : isResolved ? 75 : 15;
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference * (1 - progress / 100);

  const Icon = isActive ? AlertOctagon : isResolved ? CheckCircle2 : Siren;

  const statusLabel =
    phase === 'arming'       ? 'Arming…' :
    phase === 'triggering'   ? 'Sending SOS…' :
    phase === 'active'       ? 'SOS LIVE' :
    phase === 'offline_queued' ? 'SOS queued (offline)' :
    phase === 'resolving'    ? 'Resolving…' :
    phase === 'resolved'     ? 'SOS resolved' :
                               'No active SOS';

  return (
    <button
      onClick={onClick}
      id="respond-ring"
      aria-label="Respond pillar — open SOS panel"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '14px', padding: '28px 20px 22px',
        background: isActive || isResolved ? accentDim : 'var(--color-bg-card)',
        border: `1.5px solid ${isActive || isResolved ? accent + '44' : 'var(--color-stroke-hi)'}`,
        borderRadius: '20px', cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: isActive ? `0 0 40px ${accentGlow}` : isResolved ? `0 0 28px ${accentGlow}` : 'none',
        width: '100%', textAlign: 'center',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 12px 40px ${accentGlow}`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isActive ? `0 0 40px ${accentGlow}` : isResolved ? `0 0 28px ${accentGlow}` : 'none';
      }}
    >
      {/* ── Circular ring ── */}
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <svg width="100" height="100" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="44"
            fill="none" stroke="var(--color-stroke-hi)" strokeWidth="4" />
          <circle cx="50" cy="50" r="44"
            fill="none" stroke={accent} strokeWidth={isActive ? 5 : 4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
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
            animation: isActive ? 'respond-sos-pulse 1.4s ease-in-out infinite' : 'none',
            boxShadow: isActive ? `0 0 24px ${accentGlow}` : 'none',
          }}>
            <Icon size={22} color={accent} />
          </div>
        </div>

        {/* Active outer ring pulse */}
        {isActive && (
          <>
            <div style={{
              position: 'absolute', inset: '-8px', borderRadius: '50%',
              border: `2px solid rgba(255,23,68,0.25)`,
              animation: 'respond-ring1 1.4s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', inset: '-16px', borderRadius: '50%',
              border: `1.5px solid rgba(255,23,68,0.12)`,
              animation: 'respond-ring1 1.4s ease-in-out infinite 0.4s',
            }} />
          </>
        )}
      </div>

      {/* ── Label block ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
        <p style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: accent,
        }}>
          Respond
        </p>

        <p style={{
          fontSize: '13px', fontWeight: 600, lineHeight: 1.3,
          color: isActive ? '#ff1744' : 'var(--color-text-hi)',
          animation: isActive ? 'flash-text 1s ease-in-out infinite' : 'none',
        }}>
          {statusLabel}
        </p>

        {resolvedCount > 0 && !isActive && (
          <p style={{ fontSize: '11px', color: 'var(--color-text-lo)', marginTop: '2px' }}>
            {resolvedCount} past event{resolvedCount !== 1 ? 's' : ''} resolved
          </p>
        )}

        {!isActive && resolvedCount === 0 && (
          <p style={{ fontSize: '11px', color: 'var(--color-text-lo)', marginTop: '2px' }}>
            Hold SOS button to trigger
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
        <Siren size={10} />
        {isActive ? 'View SOS status' : 'SOS settings'}
      </div>

      <style>{`
        @keyframes respond-sos-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes respond-ring1 {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.3); }
        }
        @keyframes flash-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </button>
  );
}
