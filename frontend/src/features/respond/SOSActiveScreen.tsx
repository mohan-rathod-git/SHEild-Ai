/**
 * SHEildAI — SOSActiveScreen
 *
 * Full-screen overlay shown while an SOS event is active.
 * Driven entirely by:
 *   1. Zustand sosStore (initial event data)
 *   2. Supabase Realtime subscription (live updates from DB)
 *
 * Shows:
 *   • Pulsing SOS header with elapsed timer
 *   • Live location on a simple coordinate display (real map in Phase 6)
 *   • Recipient notification timeline (who was notified + who acknowledged)
 *   • Cancel / Resolve button
 */

import { useEffect, useRef, useState } from 'react';
import {
  Siren, MapPin, CheckCircle2, Clock3,
  Users, PhoneCall, ShieldAlert, X, WifiOff
} from 'lucide-react';
import { useSOSStore } from '../../store/sosStore';
import { subscribeToSOSEvent } from '../../services/realtime';
import { backendApi } from '../../services/api';
import type { SOSStatusResponse } from '../../services/api';

type SOSRecipient = SOSStatusResponse['recipients'][number];

// ── Elapsed timer ─────────────────────────────────────────
function ElapsedTimer({ since }: { since: string }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const start = new Date(since).getTime();
    const id = setInterval(() => {
      setSecs(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [since]);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return <span>{m}:{String(s).padStart(2, '0')}</span>;
}

// ── Role icon ─────────────────────────────────────────────
function RoleIcon({ role }: { role: SOSRecipient['role'] }) {
  if (role === 'volunteer') return <Users size={14} />;
  if (role === 'police')    return <ShieldAlert size={14} />;
  return <PhoneCall size={14} />;
}

// ── Recipient row ─────────────────────────────────────────
function RecipientRow({ rec, index }: { rec: SOSRecipient; index: number }) {
  const acked = !!rec.acknowledged_at;
  const accentColor = rec.role === 'police' ? 'var(--color-sos)'
    : rec.role === 'volunteer' ? 'var(--color-rose)'
    : 'var(--color-pink)';

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', borderRadius: '12px',
        background: acked ? 'rgba(45,217,143,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${acked ? 'rgba(45,217,143,0.2)' : 'rgba(255,255,255,0.06)'}`,
        animation: `rise 0.4s cubic-bezier(0.22,1,0.36,1) ${index * 0.08}s both`,
        transition: 'background 0.4s, border-color 0.4s',
      }}
    >
      {/* Role icon */}
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
        background: `${accentColor}18`, border: `1.5px solid ${accentColor}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accentColor,
      }}>
        <RoleIcon role={rec.role} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-hi)', marginBottom: '2px' }}>
          {rec.role.charAt(0).toUpperCase() + rec.role.slice(1)} notified
        </p>
        <p style={{ fontSize: '11px', color: 'var(--color-text-lo)' }}>
          {new Date(rec.notified_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>

      {/* Ack status */}
      {acked ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-safe)', fontSize: '11px', fontWeight: 600 }}>
          <CheckCircle2 size={14} />
          Acknowledged
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-lo)', fontSize: '11px' }}>
          <Clock3 size={12} />
          Waiting
        </div>
      )}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────
export default function SOSActiveScreen() {
  const { phase, event, recipients, eventId, stopSiren, reset, addRecipient, acknowledgeRecipient, updateFromRealtime } = useSOSStore();
  const [resolving, setResolving] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  const isOfflineQueued = phase === 'offline_queued';
  const isActive = phase === 'active' || isOfflineQueued;
  const isResolved = phase === 'resolved';

  // ── Subscribe to Realtime when eventId is known ─────────
  useEffect(() => {
    if (!eventId || isOfflineQueued) return;

    unsubRef.current = subscribeToSOSEvent(eventId, {
      onEventUpdated:         updateFromRealtime,
      onRecipientAdded:       addRecipient,
      onRecipientAcknowledged: acknowledgeRecipient,
    });

    return () => {
      unsubRef.current?.();
    };
  }, [eventId, isOfflineQueued, updateFromRealtime, addRecipient, acknowledgeRecipient]);

  const handleResolve = async () => {
    setResolving(true);
    // Stop siren immediately
    stopSiren?.();

    try {
      if (eventId && !isOfflineQueued) {
        await backendApi.resolveSOSEvent(eventId, 'stub');
      }
    } catch (e) {
      console.error('[SOSActiveScreen] Resolve failed:', e);
    } finally {
      unsubRef.current?.();
      setTimeout(() => reset(), 1500); // brief "resolved" state before dismissing
      setResolving(false);
    }
  };

  if (!isActive && !isResolved) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(4,2,6,0.97)',
        backdropFilter: 'blur(16px)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Pulsing red top bar */}
      <div style={{
        height: '4px',
        background: isResolved
          ? 'var(--color-safe)'
          : 'linear-gradient(90deg, var(--color-sos), var(--color-pink), var(--color-sos))',
        backgroundSize: '200% 100%',
        animation: isResolved ? 'none' : 'shimmer-sweep 2s linear infinite',
      }} />

      <div style={{
        flex: 1, overflowY: 'auto',
        maxWidth: '520px', width: '100%', margin: '0 auto',
        padding: '32px 24px 100px',
        display: 'flex', flexDirection: 'column', gap: '24px',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          {isResolved ? (
            <>
              <CheckCircle2 size={48} color="var(--color-safe)" style={{ margin: '0 auto 12px' }} />
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-safe)' }}>
                SOS Resolved
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-md)', marginTop: '6px' }}>
                Your contacts have been notified that you are safe.
              </p>
            </>
          ) : (
            <>
              <div style={{ position: 'relative', width: '72px', height: '72px', margin: '0 auto 16px' }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'var(--color-sos)',
                  animation: 'sos-ring 1.8s ease-in-out infinite',
                }} />
                <div style={{
                  position: 'absolute', inset: '8px', borderRadius: '50%',
                  background: 'var(--color-sos)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Siren size={28} color="#fff" strokeWidth={2} />
                </div>
              </div>

              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--color-sos)' }}>
                SOS ACTIVE
              </h1>

              {event && (
                <div style={{ fontSize: '24px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text-hi)', marginTop: '6px' }}>
                  <ElapsedTimer since={event.triggered_at} />
                </div>
              )}

              {isOfflineQueued && (
                <div style={{
                  marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 14px', borderRadius: '999px',
                  background: 'rgba(255,23,68,0.1)',
                  border: '1px solid rgba(255,23,68,0.3)',
                  fontSize: '12px', color: 'var(--color-sos)',
                }}>
                  <WifiOff size={12} />
                  Offline — SOS queued, will sync automatically
                </div>
              )}
            </>
          )}
        </div>

        {/* Location card */}
        {event && (
          <div style={{
            borderRadius: '14px', padding: '16px 18px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--color-sos)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <MapPin size={13} />
              Your Location
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--color-text-hi)', letterSpacing: '-0.02em' }}>
              {event.lat !== 0
                ? `${event.lat.toFixed(5)}, ${event.lng.toFixed(5)}`
                : 'Location unavailable — GPS timeout'}
            </p>
            {event.lat !== 0 && (
              <a
                href={`https://maps.google.com/?q=${event.lat},${event.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '11px', color: 'var(--color-pink)', marginTop: '4px', display: 'inline-block' }}
              >
                View on Google Maps ↗
              </a>
            )}
          </div>
        )}

        {/* Recipients timeline */}
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-lo)', marginBottom: '12px' }}>
            Notification cascade
          </p>
          {recipients.length === 0 ? (
            <div style={{
              padding: '20px', borderRadius: '12px', textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              fontSize: '13px', color: 'var(--color-text-lo)',
            }}>
              {isOfflineQueued
                ? 'Will notify contacts once back online'
                : 'Notifying contacts and volunteers…'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recipients.map((r, i) => (
                <RecipientRow key={r.id} rec={r} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Safety tips */}
        {!isResolved && (
          <div style={{
            borderRadius: '12px', padding: '14px 16px',
            background: 'rgba(240,25,125,0.06)',
            border: '1px solid rgba(240,25,125,0.12)',
            fontSize: '12px', color: 'var(--color-text-md)',
            lineHeight: '1.65',
          }}>
            <strong style={{ color: 'var(--color-pink)', display: 'block', marginBottom: '4px' }}>Stay safe</strong>
            Move to a public area if possible. Keep this screen visible.
            Your contacts are being alerted with your live location.
          </div>
        )}
      </div>

      {/* Fixed bottom — Cancel / Resolve button */}
      {!isResolved && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '16px 24px 28px',
          background: 'linear-gradient(to top, rgba(4,2,6,1) 70%, transparent)',
          display: 'flex', justifyContent: 'center',
        }}>
          <button
            onClick={handleResolve}
            disabled={resolving}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '14px 32px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--color-text-hi)',
              fontSize: '14px', fontWeight: 600,
              cursor: resolving ? 'wait' : 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          >
            <X size={16} />
            {resolving ? 'Cancelling…' : "I'm safe — cancel SOS"}
          </button>
        </div>
      )}
    </div>
  );
}
