/**
 * SHEildAI — App Root
 *
 * Hash-router (no extra library needed):
 *   #/         → Landing page (public)
 *   #/login    → AuthPage
 *   #/app      → Dashboard (auth-guarded)
 *
 * Auth state is initialized once here via initAuthListener().
 */

import { useEffect, useState } from 'react';
import { useAuth, initAuthListener } from './features/auth/useAuth';
import AuthPage from './features/auth/AuthPage';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';

// ── Hash router ───────────────────────────────────────────────
function getRoute(): string {
  const hash = window.location.hash.replace('#', '') || '/';
  return hash;
}

function navigate(to: string) {
  window.location.hash = to;
}

function Router() {
  const [route, setRoute] = useState(getRoute);
  const { user, loading } = useAuth();

  useEffect(() => {
    const handler = () => setRoute(getRoute());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  // Redirect logged-in users away from /login
  useEffect(() => {
    if (!loading && user && route === '/login') {
      navigate('/app');
    }
  }, [user, loading, route]);

  // Redirect unauthenticated users away from /app
  useEffect(() => {
    if (!loading && !user && route === '/app') {
      navigate('/login');
    }
  }, [user, loading, route]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg-root)',
        flexDirection: 'column', gap: '16px',
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '2.5px solid var(--color-stroke-hi)',
          borderTopColor: 'var(--color-pink)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: '12px', color: 'var(--color-text-lo)' }}>Loading SHEildAI…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (route === '/app') return <Dashboard />;
  if (route === '/login') return <AuthPage />;
  return <LandingPage onGetStarted={() => navigate(user ? '/app' : '/login')} />;
}

export default function App() {
  // Init auth listener once on mount
  useEffect(() => { initAuthListener(); }, []);

  return <Router />;
}
