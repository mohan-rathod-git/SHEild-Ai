/**
 * SHEildAI — Home (360° Safety Dashboard)
 *
 * The primary authenticated view — "mission control" for all three pillars.
 *
 * Layout:
 *   ┌──────────────────────────────────────┐
 *   │  Greeting + safety score banner       │
 *   ├──────────────────────────────────────┤
 *   │  [PredictRing] [ProtectRing] [RespondRing]  │
 *   ├──────────────────────────────────────┤
 *   │  Quick actions row                   │
 *   ├──────────────────────────────────────┤
 *   │  ActivityFeed                        │
 *   └──────────────────────────────────────┘
 *
 * State wiring:
 *   • SOSPhase   → from useSOSStore (Zustand)
 *   • Guardian   → local (no hook — user navigates to Protect tab for full control)
 *   • Journey    → session state persisted in localStorage (Phase 3 stateless)
 *
 * Quick actions:
 *   • Start Journey         → navigate to #/journey
 *   • Enable Guardian Mode  → navigate to Dashboard Protect tab
 *   • SOS (hold)            → directly calls SOSButton logic via the always-visible FAB
 *   • Contacts              → navigate to Dashboard Respond tab
 */

import { useCallback } from 'react';
import {
  Navigation2, ShieldCheck, Siren, Users,
  ArrowRight, Zap, Star,
} from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { useSOSStore } from '../store/sosStore';
import PredictRing from '../components/dashboard/PredictRing';
import ProtectRing from '../components/dashboard/ProtectRing';
import RespondRing from '../components/dashboard/RespondRing';
import ActivityFeed from '../components/dashboard/ActivityFeed';

// ── Navigation helpers ───────────────────────────────────────

function navigate(to: string) {
  window.location.hash = to;
}

/** Navigate to the Dashboard and open a specific pillar tab. */
function goToTab(tab: 'predict' | 'protect' | 'respond') {
  // Use hash param so Dashboard can pick up the initial tab
  window.location.hash = `/app?tab=${tab}`;
}

// ── Quick action button ──────────────────────────────────────

interface QuickActionProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  accent: string;
  onClick: () => void;
  urgent?: boolean;
}

function QuickAction({ id, icon, label, sublabel, accent, onClick, urgent }: QuickActionProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      style={{
        flex: '1 1 0', minWidth: '140px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        padding: '16px 14px',
        background: 'var(--color-bg-card)',
        border: `1.5px solid ${urgent ? accent + '44' : 'var(--color-stroke-hi)'}`,
        borderRadius: '14px', cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: urgent ? `0 0 20px ${accent}22` : 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = accent + '66';
        e.currentTarget.style.boxShadow = `0 8px 28px ${accent}22`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = urgent ? accent + '44' : 'var(--color-stroke-hi)';
        e.currentTarget.style.boxShadow = urgent ? `0 0 20px ${accent}22` : 'none';
      }}
    >
      <div style={{
        width: '34px', height: '34px', borderRadius: '10px',
        background: `${accent}14`, border: `1px solid ${accent}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-hi)' }}>{label}</p>
        {sublabel && (
          <p style={{ fontSize: '10px', color: 'var(--color-text-lo)', marginTop: '2px', lineHeight: '1.4' }}>
            {sublabel}
          </p>
        )}
      </div>
      <ArrowRight size={11} style={{ color: accent, marginTop: 'auto', opacity: 0.7 }} />
    </button>
  );
}

// ── Safety score ring (decorative) ──────────────────────────

function SafetyScoreBadge({ score }: { score: number }) {
  const color = score > 70 ? '#39e09b' : score > 40 ? '#f59e0b' : '#ff1744';
  const circumference = 2 * Math.PI * 20;
  const offset = circumference * (1 - score / 100);

  return (
    <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
      <svg width="48" height="48" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="24" cy="24" r="20" fill="none" stroke="var(--color-stroke-hi)" strokeWidth="3" />
        <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="3"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 800, color,
      }}>
        {score}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  const sosPhase = useSOSStore(s => s.phase);

  const displayName = (user?.user_metadata?.display_name as string | undefined)
    ?? user?.email?.split('@')[0]
    ?? 'there';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  // Safety score: heuristic based on pillar states
  const safetyScore =
    (sosPhase === 'idle' ? 40 : 0) +
    30 + // guardian check would add here
    30;  // predict baseline

  const handlePredictClick = useCallback(() => navigate('/journey'), []);
  const handleProtectClick = useCallback(() => goToTab('protect'), []);
  const handleRespondClick = useCallback(() => goToTab('respond'), []);

  return (
    <div style={{
      minHeight: '100%',
      background: 'var(--color-bg-root)',
      overflowY: 'auto',
      position: 'relative',
    }}>
      {/* ── Ambient orbs ── */}
      <div className="orb orb-pink" style={{ position: 'fixed', top: '-120px', right: '-80px', opacity: 0.5, pointerEvents: 'none' }} />
      <div className="orb orb-rose" style={{ position: 'fixed', bottom: '-60px', left: '-60px', opacity: 0.4, pointerEvents: 'none' }} />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 24px 100px' }}>

        {/* ── Greeting banner ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '20px 22px', borderRadius: '16px',
          background: 'var(--color-bg-base)',
          border: '1px solid var(--color-stroke-hi)',
          marginBottom: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
          className="rise"
        >
          <SafetyScoreBadge score={safetyScore} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: '18px', fontWeight: 800, letterSpacing: '-0.03em',
              fontFamily: 'var(--font-display)', color: 'var(--color-text-hi)',
              lineHeight: 1.2,
            }}>
              {greeting}, {displayName} 👋
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-lo)', marginTop: '4px' }}>
              Your safety dashboard is ready. All three pillars standing by.
            </p>
          </div>

          {/* Safety score label */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={11} color="var(--color-pink)" fill="var(--color-pink)" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-hi)' }}>
                {safetyScore}/100
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--color-text-lo)' }}>Safety score</span>
          </div>
        </div>

        {/* ── Section: Three Rings ── */}
        <section aria-label="360° Safety pillars" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-lo)' }}>
              360° Safety pillars
            </p>
            <div style={{
              flex: 1, height: '1px', background: 'var(--color-stroke)',
            }} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '14px',
          }}>
            <PredictRing
              status="idle"
              onClick={handlePredictClick}
            />
            <ProtectRing
              status="off"
              onClick={handleProtectClick}
            />
            <RespondRing
              phase={sosPhase}
              onClick={handleRespondClick}
            />
          </div>
        </section>

        {/* ── Section: Quick actions ── */}
        <section aria-label="Quick actions" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-lo)' }}>
              Quick actions
            </p>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-stroke)' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <QuickAction
              id="qa-start-journey"
              icon={<Navigation2 size={15} />}
              label="Start journey"
              sublabel="AI-powered safe routing"
              accent="#818cf8"
              onClick={handlePredictClick}
            />
            <QuickAction
              id="qa-guardian"
              icon={<ShieldCheck size={15} />}
              label="Guardian Mode"
              sublabel="Audio + motion detection"
              accent="#39e09b"
              onClick={handleProtectClick}
            />
            <QuickAction
              id="qa-sos"
              icon={<Siren size={15} />}
              label="SOS settings"
              sublabel="Manage emergency contacts"
              accent="#ff1744"
              onClick={handleRespondClick}
              urgent={sosPhase === 'active'}
            />
            <QuickAction
              id="qa-contacts"
              icon={<Users size={15} />}
              label="Trusted contacts"
              sublabel="Add / manage contacts"
              accent="#f0197d"
              onClick={handleRespondClick}
            />
          </div>
        </section>

        {/* ── Section: Activity feed ── */}
        <section aria-label="Recent activity">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-lo)' }}>
              Activity
            </p>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-stroke)' }} />
            <button
              onClick={() => goToTab('respond')}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '11px', color: 'var(--color-pink)',
                padding: '2px 4px',
              }}
            >
              View all <Zap size={10} />
            </button>
          </div>

          <ActivityFeed />
        </section>
      </div>

      <style>{`
        @media (max-width: 640px) {
          /* Stack rings vertically on small screens */
          section[aria-label="360° Safety pillars"] > div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
