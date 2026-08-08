/**
 * SHEildAI — Dashboard
 *
 * The authenticated app shell. Features:
 *   • Left sidebar with tab nav (Predict / Protect / Respond)
 *   • Main content area switches panels based on active tab
 *   • SOSButton always rendered (fixed bottom-right)
 *   • SOSActiveScreen overlays everything when active
 *   • User profile + sign-out in sidebar footer
 */

import { useState } from 'react';
import {
  Shield, MapPin, Mic2, Siren, LogOut, Menu, X,
  User, ChevronRight
} from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import SOSButton from '../features/respond/SOSButton';
import SOSActiveScreen from '../features/respond/SOSActiveScreen';
import PredictPanel from '../features/predict/PredictPanel';
import ProtectPanel from '../features/protect/ProtectPanel';
import RespondPanel from '../features/respond/RespondPanel';

type Tab = 'predict' | 'protect' | 'respond';

const TABS: { id: Tab; label: string; icon: React.ReactNode; accent: string }[] = [
  { id: 'predict', label: 'Predict',  icon: <MapPin  size={17} />, accent: 'var(--color-pink)' },
  { id: 'protect', label: 'Protect',  icon: <Mic2    size={17} />, accent: 'var(--color-rose)' },
  { id: 'respond', label: 'Respond',  icon: <Siren   size={17} />, accent: 'var(--color-sos)'  },
];

export default function Dashboard() {
  const [tab, setTab]     = useState<Tab>('predict');
  const [sideOpen, setSideOpen] = useState(false);
  const { user, signOut } = useAuth();

  const displayName = (user?.user_metadata?.display_name as string | undefined)
    ?? user?.email?.split('@')[0]
    ?? 'User';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-bg-root)', position: 'relative' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        background: 'var(--color-bg-base)',
        borderRight: '1px solid var(--color-stroke)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        // Mobile: slide in over content
        position: window.innerWidth < 768 ? 'fixed' : 'relative',
        inset: window.innerWidth < 768 ? (sideOpen ? '0 auto 0 0' : '0 auto 0 -220px') : 'auto',
        transition: 'inset 0.3s ease',
      }}>

        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--color-stroke)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--color-pink), var(--color-rose))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px var(--color-pink-glow)',
            }}>
              <Shield size={14} color="#08030a" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.03em' }}>
              SHEild<span style={{ color: 'var(--color-pink)' }}>AI</span>
            </span>
          </div>
        </div>

        {/* Nav tabs */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-lo)', padding: '6px 8px 10px' }}>
            Pillars
          </p>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSideOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 10px', borderRadius: '10px', border: 'none',
                  marginBottom: '2px', cursor: 'pointer',
                  background: active ? `${t.accent}14` : 'transparent',
                  color: active ? t.accent : 'var(--color-text-lo)',
                  fontWeight: active ? 600 : 400,
                  fontSize: '13px',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-bg-surface)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                {t.icon}
                {t.label}
                {active && <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{
          padding: '12px 10px',
          borderTop: '1px solid var(--color-stroke)',
          display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '6px 8px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-pink-dim), var(--color-bg-raised))',
              border: '1px solid var(--color-stroke-hi)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <User size={13} color="var(--color-pink)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-hi)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </p>
              <p style={{ fontSize: '10px', color: 'var(--color-text-lo)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 10px', borderRadius: '8px', border: 'none',
              background: 'transparent', color: 'var(--color-text-lo)',
              fontSize: '12px', cursor: 'pointer', width: '100%',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,23,68,0.08)'; e.currentTarget.style.color = 'var(--color-sos)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-lo)'; }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay backdrop */}
      {sideOpen && (
        <div
          onClick={() => setSideOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 15,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ── Main content ─────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        {/* Mobile top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-stroke)',
          background: 'var(--color-bg-base)',
          zIndex: 10,
        }}>
          <button
            onClick={() => setSideOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-hi)', padding: '2px' }}
          >
            {sideOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-hi)' }}>
            {TABS.find(t => t.id === tab)?.label}
          </span>
        </div>

        {/* Panel content */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {tab === 'predict' && <PredictPanel />}
          {tab === 'protect' && <ProtectPanel />}
          {tab === 'respond' && <RespondPanel />}
        </div>
      </main>

      {/* Always-visible SOS button */}
      <SOSButton />

      {/* Full-screen SOS overlay */}
      <SOSActiveScreen />
    </div>
  );
}
