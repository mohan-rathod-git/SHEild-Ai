/**
 * SHEildAI — JourneyPage
 *
 * Auth-guarded page at hash route #/journey.
 * Renders the full JourneyPlanner UI inside a page shell.
 */

import { useEffect } from 'react';
import { useAuth } from '../features/auth/useAuth';
import JourneyPlanner from '../features/predict/JourneyPlanner';
import { Shield } from 'lucide-react';

function navigate(to: string) {
  window.location.hash = to;
}

export default function JourneyPage() {
  const { user, loading } = useAuth();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg-root)', flexDirection: 'column', gap: '16px',
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '2.5px solid var(--color-stroke-hi)',
          borderTopColor: 'var(--color-pink)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: '12px', color: 'var(--color-text-lo)' }}>Loading…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null; // Redirect in progress

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-root)', display: 'flex', flexDirection: 'column' }}>
      {/* Mini top nav */}
      <nav style={{
        height: '48px', display: 'flex', alignItems: 'center', padding: '0 20px',
        borderBottom: '1px solid var(--color-stroke)',
        background: 'rgba(8,3,10,0.9)', backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 50, gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--color-pink) 0%, var(--color-rose) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px var(--color-pink-glow)',
          }}>
            <Shield size={14} color="#08030a" strokeWidth={2.5} />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
            letterSpacing: '-0.03em', color: 'var(--color-text-hi)',
          }}>
            SHEild<span style={{ color: 'var(--color-pink)' }}>AI</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
          {[
            { label: 'Dashboard', href: '/app' },
            { label: 'Journey', href: '/journey', active: true },
          ].map(({ label, href, active }) => (
            <button
              key={href}
              onClick={() => navigate(href)}
              style={{
                padding: '4px 12px', borderRadius: '6px', fontSize: '12px',
                background: active ? 'var(--color-pink-dim)' : 'none',
                color: active ? 'var(--color-pink)' : 'var(--color-text-lo)',
                border: active ? '1px solid rgba(240,25,125,0.2)' : '1px solid transparent',
                cursor: 'pointer', fontWeight: active ? 600 : 400,
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/app')}
          style={{
            marginLeft: 'auto', padding: '5px 14px', borderRadius: '7px',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-stroke-hi)',
            color: 'var(--color-text-lo)', fontSize: '12px', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-hi)'; e.currentTarget.style.borderColor = 'var(--color-pink)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-lo)'; e.currentTarget.style.borderColor = 'var(--color-stroke-hi)'; }}
        >
          ← Dashboard
        </button>
      </nav>

      {/* Page content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <JourneyPlanner />
      </div>
    </div>
  );
}
