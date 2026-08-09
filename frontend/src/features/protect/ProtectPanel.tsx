/**
 * SHEildAI — ProtectPanel
 *
 * Guardian Mode UI:
 *   • On/Off toggle with animated status ring (rendered via GuardianModeToggle)
 *   • Real-time audio waveform bar visualizer
 *   • Sensitivity selector (Low / Medium / High)
 *   • Connected to global useGuardianStore
 */

import { Mic2, Activity } from 'lucide-react';
import { useGuardianStore, type GuardianSensitivity } from '../../store/guardianStore';
import GuardianModeToggle from './GuardianModeToggle';

const SENSITIVITY_LABELS: Record<GuardianSensitivity, string> = {
  low:    'Low — only screams / hard falls',
  medium: 'Medium — loud sounds / moderate motion',
  high:   'High — any unusual sound or movement',
};

export default function ProtectPanel() {
  const { active, audioLevel, sensitivity, setSensitivity } = useGuardianStore();

  // Build waveform bars from audio level (0-128 RMS → scale to 0-255 for visualizer)
  const scaledLevel = audioLevel * 2;
  const bars = Array.from({ length: 20 }, (_, i) => {
    const threshold = (i / 20) * 255;
    const lit = scaledLevel > threshold;
    return lit;
  });

  return (
    <div style={{ padding: '28px 24px', maxWidth: '600px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'var(--color-rose-dim)',
          border: '1px solid rgba(251,125,180,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Mic2 size={17} color="var(--color-rose)" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Guardian Mode
        </h2>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--color-text-lo)', lineHeight: '1.6', marginBottom: '32px' }}>
        Actively protects you on your journey. Listens for sudden screams, sharp sound spikes,
        motion jerks, or emergency verbal wake phrases. Auto-triggers Distress Alert if anything is detected.
      </p>

      {/* Toggle Card Wrapper */}
      <div style={{ marginBottom: '20px' }}>
        <GuardianModeToggle />
      </div>

      {/* Waveform Card */}
      {active && (
        <div style={{
          borderRadius: '20px', padding: '28px',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-stroke-hi)',
          marginBottom: '20px',
        }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-lo)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={11} /> Real-time sound amplitude (RMS: {audioLevel})
          </p>
          <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '36px' }}>
            {bars.map((lit, i) => (
              <div key={i} style={{
                flex: 1, borderRadius: '2px',
                height: `${20 + Math.sin((i / bars.length) * Math.PI) * 16}px`,
                background: lit
                  ? scaledLevel > 200 ? 'var(--color-sos)' : scaledLevel > 140 ? '#f59e0b' : 'var(--color-safe)'
                  : 'var(--color-stroke-hi)',
                transition: 'background 0.15s, height 0.1s',
                opacity: lit ? 1 : 0.35,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Sensitivity selector */}
      <div style={{ borderRadius: '14px', background: 'var(--color-bg-card)', border: '1px solid var(--color-stroke-hi)', padding: '20px' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-hi)', marginBottom: '14px' }}>
          Detection sensitivity
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(['low', 'medium', 'high'] as GuardianSensitivity[]).map(s => (
            <button
              key={s}
              onClick={() => setSensitivity(s)}
              disabled={active}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', borderRadius: '10px', border: 'none',
                background: sensitivity === s ? 'rgba(251,125,180,0.10)' : 'transparent',
                cursor: active ? 'not-allowed' : 'pointer', textAlign: 'left', width: '100%',
                outline: sensitivity === s ? '1px solid rgba(251,125,180,0.25)' : '1px solid transparent',
                transition: 'all 0.15s',
                opacity: active && sensitivity !== s ? 0.4 : 1,
              }}
            >
              <div style={{
                width: '14px', height: '14px', borderRadius: '50%',
                border: `2px solid ${sensitivity === s ? 'var(--color-rose)' : 'var(--color-stroke-hi)'}`,
                background: sensitivity === s ? 'var(--color-rose)' : 'transparent',
                flexShrink: 0, transition: 'all 0.15s',
              }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: sensitivity === s ? 'var(--color-rose)' : 'var(--color-text-md)', textTransform: 'capitalize', marginBottom: '1px' }}>
                  {s}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-lo)' }}>
                  {SENSITIVITY_LABELS[s]}
                </p>
              </div>
            </button>
          ))}
        </div>
        {active && (
          <p style={{ fontSize: '11px', color: 'var(--color-text-lo)', marginTop: '12px', fontStyle: 'italic' }}>
            * Sensitivity cannot be adjusted while Guardian Mode is active. Stop protection to change.
          </p>
        )}
      </div>
    </div>
  );
}

