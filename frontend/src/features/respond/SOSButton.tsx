/**
 * SHEildAI — SOSButton
 *
 * A persistent floating action button fixed to the bottom-right of every
 * page. Visible across the entire app — not just in Guardian Mode.
 *
 * Trigger mechanism: hold for 800 ms to prevent accidental taps.
 *
 * Online path:  POST /api/v1/respond/sos/trigger → SOSActiveScreen opens
 * Offline path: queues event in IndexedDB → auto-syncs when online
 *
 * On trigger also:
 *  1. navigator.vibrate() — haptic feedback if supported
 *  2. Web Audio siren via playSiren() from realtime.ts
 *
 * NOTE: True screen-strobe and system-level max-volume override require a
 * native/PWA wrapper (Capacitor, React Native, or Screen Wake Lock +
 * Notification APIs). The web platform cannot override the system volume
 * or produce a hardware-level strobe; these are marked as TODO for the
 * mobile app phase.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Siren, WifiOff } from 'lucide-react';
import { backendApi } from '../../services/api';
import { queueOfflineEvent, getQueuedCount } from '../../services/offlineQueue';
import { playSiren } from '../../services/realtime';
import { useSOSStore } from '../../store/sosStore';

const HOLD_DURATION_MS = 800;

export default function SOSButton() {
  const holdTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef   = useRef<number>(0);
  const rafRef        = useRef<number>(0);
  const startTimeRef  = useRef<number>(0);
  const [holding, setHolding]   = useState(false);
  const [progress, setProgress] = useState(0);   // 0-100 for ring fill

  const {
    phase,
    setPhase,
    setActiveEvent,
    setSirenStop,
    setError,
    setOfflineQueueCount,
  } = useSOSStore();

  // Keep offline badge count fresh
  useEffect(() => {
    getQueuedCount().then(setOfflineQueueCount);
    const id = setInterval(() => getQueuedCount().then(setOfflineQueueCount), 5000);
    return () => clearInterval(id);
  }, [setOfflineQueueCount]);

  const animateProgress = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const pct = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);
    setProgress(pct);
    progressRef.current = pct;
    if (pct < 100) {
      rafRef.current = requestAnimationFrame(animateProgress);
    }
  }, []);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setProgress(0);
  }, []);

  const executeSOS = useCallback(async () => {
    cancelHold();
    setPhase('triggering');

    // 1. Vibrate (does not require permission, no-op if unsupported)
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }

    // 2. Start siren
    const stopSiren = playSiren();
    setSirenStop(stopSiren);

    // 3. Get location
    let lat = 0, lng = 0;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 }),
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // Fall back to 0,0 — backend still creates the event
      console.warn('[SOSButton] Geolocation unavailable — using 0,0');
    }

    const isOnline = navigator.onLine;

    if (!isOnline) {
      // ── OFFLINE PATH ──────────────────────────────────────
      await queueOfflineEvent({
        lat,
        lng,
        trigger_source: 'manual',
        triggered_at: new Date().toISOString(),
      });
      const count = await getQueuedCount();
      setOfflineQueueCount(count);
      setPhase('offline_queued');
      console.info('[SOSButton] Offline — SOS queued in IndexedDB');
    } else {
      // ── ONLINE PATH ───────────────────────────────────────
      try {
        // Use a stub token — real auth will replace this in Phase 5
        const token = 'stub';
        const result = await backendApi.triggerSOS(
          { lat, lng, trigger_source: 'manual' },
          token,
        );

        // Synthetic event object so the UI works without Realtime yet
        setActiveEvent({
          id:             result.event_id,
          user_id:        'stub',
          lat,
          lng,
          triggered_at:   new Date().toISOString(),
          status:         'triggered',
          trigger_source: 'manual',
          synced_offline: false,
        });

        setPhase('active');
        console.info('[SOSButton] SOS triggered online — event:', result.event_id);
      } catch (err) {
        // If online trigger fails → still queue offline as fallback
        console.error('[SOSButton] Online trigger failed — falling back to offline queue', err);
        await queueOfflineEvent({
          lat,
          lng,
          trigger_source: 'manual',
          triggered_at:   new Date().toISOString(),
        });
        const count = await getQueuedCount();
        setOfflineQueueCount(count);
        setPhase('offline_queued');
        setError('Could not reach server — SOS queued and will sync automatically.');
      }
    }
  }, [cancelHold, setPhase, setActiveEvent, setSirenStop, setError, setOfflineQueueCount]);

  const startHold = useCallback(() => {
    if (phase !== 'idle') return;
    setHolding(true);
    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(animateProgress);
    holdTimerRef.current = setTimeout(executeSOS, HOLD_DURATION_MS);
  }, [phase, animateProgress, executeSOS]);

  if (phase === 'active' || phase === 'resolved') return null; // SOSActiveScreen takes over

  const isQueued = phase === 'offline_queued';
  const isBusy   = phase === 'triggering';

  // SVG ring
  const R    = 28;
  const CIRC = 2 * Math.PI * R;
  const dash = (progress / 100) * CIRC;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '28px',
        right:  '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        userSelect: 'none',
      }}
    >
      {/* Offline queue badge */}
      {isQueued && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 11px', borderRadius: '999px',
          background: 'rgba(8,3,10,0.9)',
          border: '1px solid var(--color-sos)',
          fontSize: '11px', color: 'var(--color-sos)', fontWeight: 600,
        }}>
          <WifiOff size={11} />
          SOS queued — will sync when online
        </div>
      )}

      {/* Hold hint */}
      {!holding && phase === 'idle' && (
        <span style={{ fontSize: '10px', color: 'var(--color-text-lo)', letterSpacing: '0.06em' }}>
          hold to trigger
        </span>
      )}

      {/* Main button */}
      <div style={{ position: 'relative', width: '64px', height: '64px' }}>
        {/* Progress ring */}
        <svg
          width="64" height="64"
          style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', pointerEvents: 'none' }}
        >
          <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,23,68,0.2)" strokeWidth="3" />
          {holding && (
            <circle
              cx="32" cy="32" r={R} fill="none"
              stroke="var(--color-sos)" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRC}`}
            />
          )}
        </svg>

        <button
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={(e) => { e.preventDefault(); startHold(); }}
          onTouchEnd={cancelHold}
          disabled={isBusy}
          aria-label="SOS Emergency Button — hold to trigger"
          style={{
            position: 'absolute',
            inset: '6px',
            borderRadius: '50%',
            border: 'none',
            cursor: isBusy ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: holding
              ? 'var(--color-sos)'
              : 'linear-gradient(135deg, #cc0033, var(--color-sos))',
            boxShadow: holding
              ? '0 0 0 0 transparent, 0 0 40px var(--color-sos)'
              : '0 0 24px rgba(255,23,68,0.45), 0 4px 12px rgba(0,0,0,0.6)',
            transition: 'box-shadow 0.2s, background 0.2s',
            animation: !holding && !isBusy ? 'sos-ring 2.5s ease-in-out infinite' : 'none',
          }}
        >
          {isBusy
            ? <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
            : <Siren size={22} color="#fff" strokeWidth={2} />
          }
        </button>
      </div>

      {/* Spin keyframe injected inline */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
