/**
 * SHEildAI — AuthPage
 *
 * Split-panel Login / Sign-up form. Uses Supabase email+password auth.
 * Matches the existing deep-purple dark theme from index.css.
 */

import { useState } from 'react';
import { Shield, ArrowRight, Eye, EyeOff, HeartHandshake } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

type Mode = 'login' | 'signup';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } },
        });
        if (err) throw err;
        setSuccess('Check your email to confirm your account.');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        // Redirect handled by App.tsx watching auth state
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    background: 'var(--color-bg-raised)',
    border: '1px solid var(--color-stroke-hi)',
    color: 'var(--color-text-hi)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-root)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient orbs */}
      <div className="orb orb-pink" style={{ top: '-200px', left: '-160px', opacity: 0.7 }} />
      <div className="orb orb-sos"  style={{ bottom: '-100px', right: '-80px', opacity: 0.5 }} />
      <div className="dot-grid" style={{ position: 'absolute', inset: 0, opacity: 0.25, pointerEvents: 'none' }} />

      <div className="rise" style={{
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--color-pink) 0%, var(--color-rose) 100%)',
            boxShadow: '0 0 32px var(--color-pink-glow)',
            marginBottom: '16px',
          }}>
            <Shield size={24} color="#08030a" strokeWidth={2.5} />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800,
            letterSpacing: '-0.035em', color: 'var(--color-text-hi)', marginBottom: '6px',
          }}>
            SHEild<span style={{ color: 'var(--color-pink)' }}>AI</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-lo)' }}>
            Women's safety platform · India
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-stroke-hi)',
          borderRadius: '20px',
          padding: '32px 28px',
          backdropFilter: 'blur(12px)',
        }}>
          {/* Mode switcher */}
          <div style={{
            display: 'flex', gap: '4px', marginBottom: '28px',
            background: 'var(--color-bg-surface)',
            borderRadius: '10px', padding: '4px',
          }}>
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  background: mode === m ? 'var(--color-bg-raised)' : 'transparent',
                  color: mode === m ? 'var(--color-text-hi)' : 'var(--color-text-lo)',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Name (signup only) */}
            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-lo)', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Priya Sharma"
                  required={mode === 'signup'}
                  className="focus-ring"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-pink)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-stroke-hi)')}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--color-text-lo)', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="focus-ring"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--color-pink)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-stroke-hi)')}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--color-text-lo)', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="focus-ring"
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-pink)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-stroke-hi)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-lo)', padding: '4px',
                  }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error / Success */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.2)',
                fontSize: '12px', color: 'var(--color-sos)',
              }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(57,224,155,0.08)', border: '1px solid rgba(57,224,155,0.2)',
                fontSize: '12px', color: 'var(--color-safe)',
              }}>
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="focus-ring"
              style={{
                marginTop: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '13px', borderRadius: '10px',
                background: loading ? 'var(--color-pink-dim)' : 'var(--color-pink)',
                color: loading ? 'var(--color-text-lo)' : '#08030a',
                fontSize: '14px', fontWeight: 700, border: 'none',
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: loading ? 'none' : '0 0 24px var(--color-pink-glow)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? (
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                  <ArrowRight size={15} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-lo)' }}>
          <HeartHandshake size={11} />
          Women's safety · 100% private · Zero data sold
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: var(--color-text-lo); }
      `}</style>
    </div>
  );
}
