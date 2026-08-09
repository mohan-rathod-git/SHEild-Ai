import { useState } from 'react';
import { Shield, ZapOff, Info, AlertTriangle } from 'lucide-react';
import { useGuardianStore } from '../../store/guardianStore';
import { requestMotionPermission } from '../../hooks/useMotionSensor';

export default function GuardianModeToggle() {
  const { active, startGuardian, stopGuardian, error, setError } = useGuardianStore();
  const [showModal, setShowModal] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const handleToggleClick = () => {
    if (active) {
      stopGuardian();
    } else {
      setShowModal(true);
    }
  };

  const handleRequestPermissions = async () => {
    setRequesting(true);
    setError(null);
    try {
      // 1. Request microphone permission
      let micGranted = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release the microphone track immediately since we just wanted to grant/verify permission
        stream.getTracks().forEach(t => t.stop());
        micGranted = true;
      } catch (err) {
        console.warn('[GuardianToggle] Mic permission denied:', err);
        setError('Microphone permission denied. Guardian Mode requires microphone access.');
      }

      // 2. Request motion permission
      let motionGranted = false;
      if (micGranted) {
        try {
          motionGranted = await requestMotionPermission();
          if (!motionGranted) {
            setError('Motion permission denied. Guardian Mode requires accelerometer access.');
          }
        } catch (err) {
          console.warn('[GuardianToggle] Motion permission denied:', err);
          setError('Motion permission denied. Guardian Mode requires accelerometer access.');
        }
      }

      if (micGranted && motionGranted) {
        setShowModal(false);
        await startGuardian();
      }
    } catch (err: any) {
      console.error('[GuardianToggle] Error during permission request:', err);
      setError('An unexpected error occurred during permission request.');
    } finally {
      setRequesting(false);
    }
  };

  const ringColor = active ? 'var(--color-safe)' : 'var(--color-stroke-hi)';

  return (
    <div>
      {/* Explanation Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(8, 3, 10, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          animation: 'fadeIn 0.25s ease-out',
        }}>
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-stroke-hi)',
            borderRadius: '24px',
            maxWidth: '480px',
            width: '100%',
            padding: '32px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'rgba(57, 224, 155, 0.1)',
                border: '1px solid rgba(57, 224, 155, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Shield size={20} color="var(--color-safe)" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--color-text-hi)' }}>
                Activate Guardian Mode
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-text-md)', lineHeight: '1.6', marginBottom: '20px' }}>
              Guardian Mode acts as an active digital shield. Before starting, SHEildAI requires authorization for the following:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ fontSize: '16px', marginTop: '2px' }}>🎤</div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-hi)', marginBottom: '2px' }}>Microphone Access</h4>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-lo)', lineHeight: '1.4' }}>
                    Used locally to check volume levels (screams/impacts) and detect emergency wake phrases like "help me" or "SOS". Audio is processed locally and never recorded or sent to servers.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ fontSize: '16px', marginTop: '2px' }}>📳</div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-hi)', marginBottom: '2px' }}>Motion Sensors</h4>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-lo)', lineHeight: '1.4' }}>
                    Used to monitor sudden movements (sudden running or falls) that indicate immediate physical threat.
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex', gap: '10px',
                padding: '12px 14px', borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}>
                <Info size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '11px', color: '#f59e0b', lineHeight: '1.4' }}>
                  <strong>Important Constraint:</strong> As a web app, Guardian Mode only works while this browser tab is open and active. It cannot run in the background if you lock your screen or close the tab.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowModal(false)}
                disabled={requesting}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--color-stroke-hi)',
                  background: 'transparent', color: 'var(--color-text-md)', cursor: 'pointer',
                  fontWeight: 600, fontSize: '13px', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Cancel
              </button>
              <button
                onClick={handleRequestPermissions}
                disabled={requesting}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                  background: requesting ? 'var(--color-stroke-hi)' : 'linear-gradient(135deg, var(--color-safe), #2cc384)',
                  color: requesting ? 'var(--color-text-lo)' : '#08030a', cursor: requesting ? 'wait' : 'pointer',
                  fontWeight: 700, fontSize: '13px', boxShadow: '0 4px 12px rgba(57, 224, 155, 0.2)',
                  transition: 'all 0.2s',
                }}
              >
                {requesting ? 'Granting...' : 'Grant & Start'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main toggle card */}
      <div style={{
        borderRadius: '20px', padding: '28px',
        background: active
          ? 'linear-gradient(135deg, rgba(57,224,155,0.06), rgba(57,224,155,0.02))'
          : 'var(--color-bg-card)',
        border: `1px solid ${active ? 'rgba(57,224,155,0.25)' : 'var(--color-stroke-hi)'}`,
        marginBottom: '20px',
        transition: 'all 0.4s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Animated status ring */}
            <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
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
                {active ? (
                  <Shield size={20} color="var(--color-safe)" />
                ) : (
                  <ZapOff size={18} color="var(--color-text-lo)" />
                )}
              </div>
            </div>
            <div>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 700,
                color: active ? 'var(--color-safe)' : 'var(--color-text-hi)',
                marginBottom: '3px',
              }}>
                {active ? 'Guardian Active' : 'Guardian Inactive'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-lo)' }}>
                {active ? 'Active and monitoring sensors...' : 'Tap to start Guardian protection'}
              </p>
            </div>
          </div>

          {/* Toggle button */}
          <button
            onClick={handleToggleClick}
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
              position: 'absolute', top: '3.5px',
              left: active ? '26px' : '4px',
              width: '17px', height: '17px', borderRadius: '50%',
              background: active ? '#08030a' : 'var(--color-text-lo)',
              transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: '20px', padding: '12px 14px', borderRadius: '12px',
          background: 'rgba(255,23,68,0.06)', border: '1px solid rgba(255,23,68,0.15)',
          fontSize: '12px', color: 'var(--color-sos)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes guardian-ring {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
