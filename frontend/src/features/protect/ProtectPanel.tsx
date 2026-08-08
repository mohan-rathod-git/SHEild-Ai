/**
 * SHEildAI — ProtectPanel
 *
 * Guardian Mode UI:
 *   • On/Off toggle with animated status ring
 *   • Real-time audio waveform bar visualizer
 *   • Sensitivity selector (Low / Medium / High)
 *   • Motion detection indicator
 *   • Auto-triggers SOS via useSOSStore when distress detected
 */

import { useCallback, useState } from 'react';
import { Mic2, Activity, AlertTriangle, Shield, ZapOff } from 'lucide-react';
import { useGuardianMode, type GuardianSensitivity } from './useGuardianMode';
import { useSOSStore } from '../../store/sosStore';
import { backendApi } from '../../services/api';
import { queueOfflineEvent } from '../../services/offlineQueue';
import { playSiren } from '../../services/realtime';

const SENSITIVITY_LABELS: Record<GuardianSensitivity, string> = {
  low:    'Low — only screams / hard falls',
  medium: 'Medium — loud sounds / moderate motion',
  high:   'High — any unusual sound or movement',
};

export default function ProtectPanel() {
  const [sensitivity, setSensitivity] = useState<GuardianSensitivity>('medium');
  const { setPhase, setActiveEvent, setSirenStop, setError, setOfflineQueueCount } = useSOSStore();

  const handleDistress = useCallback(async (type: 'audio' | 'motion') => {
    setPhase('triggering');
    const stopSiren = playSiren();
    setSirenStop(stopSiren);
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);

    let lat = 0, lng = 0;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch { /* use 0,0 fallback */ }

    const source = type === 'audio' ? 'mic' : 'motion';

    if (!navigator.onLine) {
      await queueOfflineEvent({ lat, lng, trigger_source: source, triggered_at: new Date().toISOString() });
      setPhase('offline_queued');
      return;
    }

    try {
      const { session } = await import('../auth/useAuth').then(m => ({ session: m.useAuth.getState().session }));
      const token = session?.access_token ?? 'stub';
      const result = await backendApi.triggerSOS({ lat, lng, trigger_source: source }, token);
      setActiveEvent({
        id: result.event_id,
        user_id: 'guardian',
        lat, lng,
        triggered_at: new Date().toISOString(),
        status: 'triggered',
        trigger_source: source,
        synced_offline: false,
      });
      setPhase('active');
    } catch {
      await queueOfflineEvent({ lat, lng, trigger_source: source, triggered_at: new Date().toISOString() });
      setPhase('offline_queued');
      setError('Could not reach server — SOS queued.');
    }
  }, [setPhase, setActiveEvent, setSirenStop, setError]);

  const { active, audioLevel, error, lastTrigger, startGuardian, stopGuardian } = useGuardianMode({
    sensitivity,
    onDistressDetected: handleDistress,
  });

  const toggle = () => active ? stopGuardian() : startGuardian();

  // Build waveform bars from audio level (0-255 RMS → 5 bars)
  const bars = Array.from({ length: 20 }, (_, i) => {
    const threshold = (i / 20) * 255;
    const lit = audioLevel > threshold;
    return lit;
  });

  const ringColor = active
    ? lastTrigger ? 'var(--color-sos)' : 'var(--color-safe)'
    : 'var(--color-stroke-hi)';

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
        Runs silently in the background. Listens for sudden screams, sharp sound spikes,
        and motion jerks. Auto-triggers SOS if distress is detected — no tap needed.
      </p>

      {/* Main toggle card */}
      <div style={{
        borderRadius: '20px', padding: '28px',
        background: active
          ? 'linear-gradient(135deg, rgba(57,224,155,0.06), rgba(57,224,155,0.02))'
          : 'var(--color-bg-card)',
        border: `1px solid ${active ? 'rgba(57,224,155,0.2)' : 'var(--color-stroke-hi)'}`,
        marginBottom: '20px',
        transition: 'all 0.4s ease',
      }}>
        {/* Status ring + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Animated ring */}
            <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: `2px solid ${ringColor}`,
                animation: active ? 'guardian-ring 2s ease-in-out infinite' : 'none',
                opacity: 0.5,
              }} />
              <div style={{
                position: 'absolute', inset: '10px', borderRadius: '50%',
                background: active
                  ? 'linear-gradient(135deg, rgba(57,224,155,0.15), rgba(57,224,155,0.05))'
                  : 'var(--color-bg-surface)',
                border: `1.5px solid ${ringColor}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.4s',
              }}>
                {active
                  ? <Shield size={20} color="var(--color-safe)" />
                  : <ZapOff size={18} color="var(--color-text-lo)" />
                }
              </div>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.02em', color: active ? 'var(--color-safe)' : 'var(--color-text-hi)', marginBottom: '3px' }}>
                {active ? 'Guardian Active' : 'Guardian Inactive'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-lo)' }}>
                {active ? 'Listening for distress signals…' : 'Tap to enable protection'}
              </p>
            </div>
          </div>

          {/* Toggle switch */}
          <button
            onClick={toggle}
            aria-label={active ? 'Disable guardian mode' : 'Enable guardian mode'}
            style={{
              width: '52px', height: '28px', borderRadius: '999px',
              background: active ? 'var(--color-safe)' : 'var(--color-bg-raised)',
              border: `1.5px solid ${active ? 'var(--color-safe)' : 'var(--color-stroke-hi)'}`,
              cursor: 'pointer', position: 'relative',
              transition: 'background 0.3s, border-color 0.3s',
            }}
          >
            <div style={{
              position: 'absolute', top: '3px',
              left: active ? '26px' : '3px',
              width: '18px', height: '18px', borderRadius: '50%',
              background: active ? '#08030a' : 'var(--color-text-lo)',
              transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
          </button>
        </div>

        {/* Audio waveform */}
        {active && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-lo)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={11} /> Audio level (RMS: {audioLevel})
            </p>
            <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '36px' }}>
              {bars.map((lit, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: '2px',
                  height: `${20 + Math.sin((i / bars.length) * Math.PI) * 16}px`,
                  background: lit
                    ? audioLevel > 200 ? 'var(--color-sos)' : audioLevel > 140 ? '#f59e0b' : 'var(--color-safe)'
                    : 'var(--color-stroke-hi)',
                  transition: 'background 0.15s, height 0.1s',
                  opacity: lit ? 1 : 0.35,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Last trigger alert */}
        {lastTrigger && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.2)',
            fontSize: '12px', color: 'var(--color-sos)',
          }}>
            <AlertTriangle size={13} />
            Distress detected ({lastTrigger}) — SOS triggered!
          </div>
        )}
      </div>

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
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', borderRadius: '10px', border: 'none',
                background: sensitivity === s ? 'rgba(251,125,180,0.10)' : 'transparent',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                outline: sensitivity === s ? '1px solid rgba(251,125,180,0.25)' : '1px solid transparent',
                transition: 'all 0.15s',
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
      </div>

      {error && (
        <div style={{
          marginTop: '16px', padding: '10px 14px', borderRadius: '10px',
          background: 'rgba(255,23,68,0.06)', border: '1px solid rgba(255,23,68,0.15)',
          fontSize: '12px', color: 'var(--color-sos)',
        }}>
          ⚠ {error}
        </div>
      )}

      <style>{`
        @keyframes guardian-ring {
          0%,100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.1; }
        }
      `}</style>
    </div>
  );
}
