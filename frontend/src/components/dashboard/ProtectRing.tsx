/**
 * SHEildAI — ProtectRing
 *
 * Circular status widget for the Protect (Guardian Mode) pillar.
 * Reads from useGuardianMode state via props; navigates to #/app?tab=protect.
 *
 * Status states:
 *   • off         — "Guardian Mode off"
 *   • on          — "Guardian Mode active" (animated, green)
 *   • triggered   — "Distress detected!" (red pulse)
 */

import { Mic2, ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';

export type ProtectStatus = 'off' | 'on' | 'triggered';

interface ProtectRingProps {
  status?: ProtectStatus;
  audioLevel?: number;      // 0-255 from guardian hook
  sensitivity?: string;     // 'low' | 'medium' | 'high'
  lastTrigger?: 'audio' | 'motion' | null;
  onClick: () => void;
}

export default function ProtectRing({
  status = 'off',
  audioLevel = 0,
  sensitivity = 'medium',
  lastTrigger,
  onClick,
}: ProtectRingProps) {
  const isOn       = status === 'on';
  const isTriggered= status === 'triggered';

  const accent    = isTriggered ? '#ff1744' : isOn ? '#39e09b' : '#f0197d';
  const accentDim = isTriggered ? 'rgba(255,23,68,0.12)'
                  : isOn        ? 'rgba(57,224,155,0.10)'
                  : 'var(--color-bg-card)';
  const accentGlow= isTriggered ? 'rgba(255,23,68,0.25)'
                  : isOn        ? 'rgba(57,224,155,0.20)'
                  : 'rgba(240,25,125,0.18)';

  // Ring fill: off=20%, on=audio-reactive, triggered=100%
  const progress = isTriggered ? 100
                 : isOn        ? Math.min(95, 40 + (audioLevel / 255) * 55)
                 : 20;
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference * (1 - progress / 100);

  const Icon = isTriggered ? ShieldAlert : isOn ? ShieldCheck : ShieldOff;

  return (
    <button
      onClick={onClick}
      id="protect-ring"
      aria-label="Protect pillar — open guardian mode"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '14px', padding: '28px 20px 22px',
        background: isOn || isTriggered ? accentDim : 'var(--color-bg-card)',
        border: `1.5px solid ${isOn || isTriggered ? accent + '44' : 'var(--color-stroke-hi)'}`,
        borderRadius: '20px', cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: isOn || isTriggered ? `0 0 32px ${accentGlow}` : 'none',
        width: '100%', textAlign: 'center',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 12px 40px ${accentGlow}`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isOn || isTriggered ? `0 0 32px ${accentGlow}` : 'none';
      }}
    >
      {/* ── Circular progress ring ── */}
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <svg width="100" height="100" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="44"
            fill="none" stroke="var(--color-stroke-hi)" strokeWidth="4" />
          <circle cx="50" cy="50" r="44"
            fill="none" stroke={accent} strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>

        {/* Audio level arc (secondary, thin) */}
        {isOn && !isTriggered && (
          <svg width="100" height="100" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', opacity: 0.4 }}>
            <circle cx="50" cy="50" r="38"
              fill="none" stroke={accent} strokeWidth="2"
              strokeDasharray={2 * Math.PI * 38}
              strokeDashoffset={2 * Math.PI * 38 * (1 - Math.min(1, audioLevel / 200))}
              strokeLinecap="round"
            />
          </svg>
        )}

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
            boxShadow: isOn || isTriggered ? `0 0 20px ${accentGlow}` : 'none',
            animation: isTriggered ? 'protect-sos-ring 1.2s ease-in-out infinite' : 'none',
          }}>
            <Icon size={22} color={accent} />
          </div>
        </div>

        {/* Live indicator dot */}
        {isOn && (
          <div style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '10px', height: '10px', borderRadius: '50%',
            background: '#39e09b',
            boxShadow: '0 0 8px rgba(57,224,155,0.6)',
            animation: 'breathe 2s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* ── Label block ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
        <p style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: accent,
        }}>
          Protect
        </p>

        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-hi)', lineHeight: 1.3 }}>
          {isTriggered ? 'Distress detected!' :
           isOn        ? 'Guardian Mode active' :
                         'Guardian Mode off'}
        </p>

        {isOn && !isTriggered && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <Mic2 size={11} color={accent} />
            <span style={{ fontSize: '11px', color: accent }}>
              Listening · {sensitivity} sensitivity
            </span>
          </div>
        )}

        {isTriggered && lastTrigger && (
          <p style={{ fontSize: '11px', color: '#ff1744', marginTop: '2px' }}>
            Triggered by {lastTrigger}
          </p>
        )}

        {!isOn && !isTriggered && (
          <p style={{ fontSize: '11px', color: 'var(--color-text-lo)', marginTop: '2px' }}>
            Tap to enable protection
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
        <ShieldCheck size={10} />
        {isOn ? 'Manage guardian' : 'Enable guardian'}
      </div>

      <style>{`
        @keyframes protect-sos-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,23,68,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(255,23,68,0); }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </button>
  );
}
