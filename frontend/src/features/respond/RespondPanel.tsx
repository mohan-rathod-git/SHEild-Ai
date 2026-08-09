/**
 * SHEildAI — RespondPanel
 *
 * Dashboard tab showing the SOS cascade explainer + controls.
 * The actual SOS active screen is a full-screen overlay managed
 * by SOSActiveScreen (always mounted in Dashboard).
 */

import { Siren, Info } from 'lucide-react';
import { useSOSStore } from '../../store/sosStore';

const CASCADE_STEPS = [
  {
    t: '0s',
    label: 'SOS triggered',
    detail: 'Hold the SOS button for 0.8s — or auto-triggered by Guardian Mode',
    color: 'var(--color-pink)',
  },
  {
    t: '5s',
    label: 'Trusted circle alerted',
    detail: 'Your contacts receive an SMS + push with your live location',
    color: 'var(--color-rose)',
  },
  {
    t: '90s',
    label: 'Volunteer network pinged',
    detail: 'Nearest verified volunteer within 2 km gets an alert',
    color: '#f97316',
  },
  {
    t: '2min',
    label: 'Emergency services',
    detail: 'Local police receive your location + incident ID',
    color: 'var(--color-sos)',
  },
];

export default function RespondPanel() {
  const { phase, offlineQueueCount } = useSOSStore();

  return (
    <div style={{ padding: '28px 24px', maxWidth: '600px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'var(--color-sos-dim)',
          border: '1px solid rgba(255,23,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Siren size={17} color="var(--color-sos)" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.03em' }}>
          SOS Cascade
        </h2>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--color-text-lo)', lineHeight: '1.6', marginBottom: '32px' }}>
        One hold on the SOS button fires a full cascade — trusted contacts, nearby volunteers,
        and emergency services — even with no signal.
      </p>

      {/* Status pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '7px 14px', borderRadius: '999px', marginBottom: '28px',
        background: phase === 'idle'
          ? 'rgba(57,224,155,0.08)'
          : 'rgba(255,23,68,0.10)',
        border: `1px solid ${phase === 'idle' ? 'rgba(57,224,155,0.2)' : 'rgba(255,23,68,0.2)'}`,
        fontSize: '12px', fontWeight: 600,
        color: phase === 'idle' ? 'var(--color-safe)' : 'var(--color-sos)',
      }}>
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: phase === 'idle' ? 'var(--color-safe)' : 'var(--color-sos)',
          animation: 'breathe 2s ease-in-out infinite',
        }} />
        {phase === 'idle' ? 'Ready — no active SOS' : `SOS status: ${phase}`}
        {offlineQueueCount > 0 && ` · ${offlineQueueCount} queued offline`}
      </div>

      {/* Cascade timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {CASCADE_STEPS.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', paddingBottom: i < 3 ? '24px' : '0', position: 'relative' }}>
            {/* Connecting line */}
            {i < 3 && (
              <div style={{
                position: 'absolute', left: '16px', top: '34px',
                width: '1px', bottom: '0',
                background: `linear-gradient(${step.color}55, transparent)`,
              }} />
            )}
            {/* Dot */}
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: `${step.color}14`,
              border: `1.5px solid ${step.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, color: step.color }}>
                {step.t}
              </span>
            </div>
            {/* Text */}
            <div style={{ paddingTop: '5px' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-hi)', marginBottom: '2px' }}>
                {step.label}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-lo)', lineHeight: '1.55' }}>
                {step.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div style={{
        marginTop: '28px', padding: '16px 18px', borderRadius: '12px',
        background: 'rgba(240,25,125,0.05)',
        border: '1px solid rgba(240,25,125,0.12)',
        display: 'flex', gap: '12px', alignItems: 'flex-start',
      }}>
        <Info size={14} color="var(--color-pink)" style={{ flexShrink: 0, marginTop: '1px' }} />
        <p style={{ fontSize: '12px', color: 'var(--color-text-md)', lineHeight: '1.65' }}>
          The SOS button is always visible in the bottom-right corner.
          Hold it for <strong style={{ color: 'var(--color-pink)' }}>0.8 seconds</strong> to trigger.
          If you're offline, the event is saved locally and auto-synced when connectivity returns.
        </p>
      </div>
    </div>
  );
}
