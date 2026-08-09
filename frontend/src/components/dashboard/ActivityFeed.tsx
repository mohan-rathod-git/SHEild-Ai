/**
 * SHEildAI — ActivityFeed
 *
 * Pulls recent activity from available backend endpoints and renders
 * a chronological list below the three pillar rings.
 *
 * Data sources (all requests are best-effort; failures show a graceful empty state):
 *   • GET /api/v1/respond/sos/history        → past SOS events
 *   • GET /api/v1/contacts/                  → trusted contact changes (count)
 *
 * Route events are session-only (stored locally in sessionStorage since
 * the Predict service is stateless in Phase 3).
 */

import { useEffect, useState } from 'react';
import {
  Navigation2, ShieldCheck, Siren, Users, CheckCircle2,
  AlertTriangle, Clock, Loader2,
} from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

// ── Types ────────────────────────────────────────────────────

type ActivityType = 'journey' | 'sos' | 'sos_resolved' | 'contact' | 'guardian';

interface ActivityItem {
  id: string;
  type: ActivityType;
  label: string;
  detail?: string;
  timestamp: Date;
  resolved?: boolean;
}

// ── Icon + colour per type ───────────────────────────────────

const TYPE_META: Record<ActivityType, { icon: React.ReactNode; color: string; bg: string }> = {
  journey:     { icon: <Navigation2 size={12} />,   color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  sos:         { icon: <Siren size={12} />,          color: '#ff1744', bg: 'rgba(255,23,68,0.12)' },
  sos_resolved:{ icon: <CheckCircle2 size={12} />,   color: '#39e09b', bg: 'rgba(57,224,155,0.10)' },
  contact:     { icon: <Users size={12} />,           color: '#f0197d', bg: 'rgba(240,25,125,0.10)' },
  guardian:    { icon: <ShieldCheck size={12} />,     color: '#39e09b', bg: 'rgba(57,224,155,0.10)' },
};

function formatRelative(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

// ── Component ────────────────────────────────────────────────

export default function ActivityFeed() {
  const { session } = useAuth();
  const [items, setItems]     = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) { setLoading(false); return; }

    const authHeader = { Authorization: `Bearer ${session.access_token}` };

    async function fetchActivity() {
      const collected: ActivityItem[] = [];

      // ── 1. SOS history ──────────────────────────────────────
      try {
        const resp = await fetch(`${BASE_URL}/api/v1/respond/sos/history`, {
          headers: { 'Content-Type': 'application/json', ...authHeader },
        });
        if (resp.ok) {
          const data = await resp.json() as { events?: Array<{
            id: string; status: string; triggered_at: string;
            trigger_source: string; lat: number; lng: number;
          }> };
          (data.events ?? []).slice(0, 5).forEach(ev => {
            const resolved = ev.status === 'resolved';
            collected.push({
              id: `sos-${ev.id}`,
              type: resolved ? 'sos_resolved' : 'sos',
              label: resolved ? 'SOS resolved' : 'SOS triggered',
              detail: `via ${ev.trigger_source}${ev.lat ? ` · ${ev.lat.toFixed(3)}, ${ev.lng.toFixed(3)}` : ''}`,
              timestamp: new Date(ev.triggered_at),
              resolved,
            });
          });
        }
      } catch { /* silent */ }

      // ── 2. Trusted contacts (count-based activity) ──────────
      try {
        const resp = await fetch(`${BASE_URL}/api/v1/contacts/`, {
          headers: { 'Content-Type': 'application/json', ...authHeader },
        });
        if (resp.ok) {
          const data = await resp.json() as { contacts?: Array<{ created_at?: string; name?: string }> };
          (data.contacts ?? []).slice(0, 3).forEach((c, i) => {
            collected.push({
              id: `contact-${i}`,
              type: 'contact',
              label: 'Trusted contact added',
              detail: c.name ?? 'Contact',
              timestamp: c.created_at ? new Date(c.created_at) : new Date(Date.now() - i * 3600000),
            });
          });
        }
      } catch { /* silent */ }

      // ── 3. Session journey history (localStorage) ───────────
      try {
        const journeys: { label: string; ts: number }[] = JSON.parse(
          localStorage.getItem('sheild_journey_history') ?? '[]',
        );
        journeys.slice(0, 3).forEach((j, i) => {
          collected.push({
            id: `journey-${i}`,
            type: 'journey',
            label: 'Safe route completed',
            detail: j.label,
            timestamp: new Date(j.ts),
          });
        });
      } catch { /* silent */ }

      // ── Sort by newest first ─────────────────────────────────
      collected.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // ── Fallback seed if completely empty ────────────────────
      if (collected.length === 0) {
        collected.push({
          id: 'seed-1',
          type: 'guardian',
          label: 'Guardian Mode available',
          detail: 'Enable audio + motion protection',
          timestamp: new Date(Date.now() - 300000),
        });
        collected.push({
          id: 'seed-2',
          type: 'journey',
          label: 'Journey planner ready',
          detail: 'Tap Predict to plan a safe route',
          timestamp: new Date(Date.now() - 600000),
        });
      }

      setItems(collected);
      setLoading(false);
    }

    fetchActivity();
  }, [session?.access_token]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '0',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-stroke-hi)',
      borderRadius: '16px', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px',
        borderBottom: '1px solid var(--color-stroke)',
      }}>
        <Clock size={14} style={{ color: 'var(--color-pink)' }} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-hi)', letterSpacing: '0.04em' }}>
          Recent activity
        </span>
        {!loading && (
          <span style={{
            marginLeft: 'auto', fontSize: '10px', color: 'var(--color-text-lo)',
            padding: '2px 8px', borderRadius: '999px',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-stroke-hi)',
          }}>
            {items.length} events
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{
            padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}>
            <Loader2 size={14} style={{ color: 'var(--color-pink)', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-lo)' }}>Loading activity…</span>
          </div>
        ) : (
          items.map((item, idx) => {
            const meta = TYPE_META[item.type];
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '12px 18px',
                  borderBottom: idx < items.length - 1 ? '1px solid var(--color-stroke)' : 'none',
                  transition: 'background 0.15s',
                  cursor: 'default',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Icon */}
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: meta.bg,
                  border: `1px solid ${meta.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: meta.color, marginTop: '1px',
                }}>
                  {meta.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-hi)', lineHeight: 1.3 }}>
                    {item.label}
                  </p>
                  {item.detail && (
                    <p style={{
                      fontSize: '11px', color: 'var(--color-text-lo)',
                      marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.detail}
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                <span style={{ fontSize: '10px', color: 'var(--color-text-lo)', flexShrink: 0, marginTop: '2px' }}>
                  {formatRelative(item.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
