import { useEffect, useState, useRef } from 'react';
import { Volume2, ShieldAlert } from 'lucide-react';
import { useGuardianStore } from '../../store/guardianStore';
import { useSOSStore } from '../../store/sosStore';
import { useAuth } from '../auth/useAuth';
import { backendApi } from '../../services/api';
import { queueOfflineEvent } from '../../services/offlineQueue';
import { playSiren } from '../../services/realtime';

export default function DistressPrompt() {
  const {
    isPromptOpen,
    triggerSource,
    resolveSafe,
    stopGuardian,
  } = useGuardianStore();

  const {
    setPhase,
    setActiveEvent,
    setSirenStop,
    setError,
  } = useSOSStore();

  const [timeLeft, setTimeLeft] = useState(15);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Play ticking alert sound when prompt opens
  useEffect(() => {
    if (!isPromptOpen) return;

    // Reset countdown timer
    setTimeLeft(15);

    // Audio context beep for warning the user
    let audioCtx: AudioContext | null = null;
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext not supported for warning tick.');
    }

    const playBeep = (freq: number, duration: number) => {
      if (!audioCtx || audioCtx.state === 'suspended') return;
      try {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (err) {
        console.warn('Failed to play warning tick:', err);
      }
    };

    countdownIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          executeSOS();
          return 0;
        }
        // Play alert warning tick
        playBeep(prev <= 5 ? 880 : 440, 0.15);
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (audioCtx) {
        audioCtx.close();
      }
    };
  }, [isPromptOpen]);

  // SOS trigger flow
  const executeSOS = async () => {
    // 1. Resolve guardian prompt and stop active listening sessions to prevent multiple alarms
    resolveSafe(); 
    stopGuardian();

    setPhase('triggering');

    // Vibrate haptically
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }

    // Start alarm siren
    const stopSiren = playSiren();
    setSirenStop(stopSiren);

    // Get location
    let lat = 0, lng = 0;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      console.warn('[DistressPrompt] Geolocation failed — using 0,0');
    }

    const source = triggerSource === 'audio' ? 'mic' : triggerSource === 'motion' ? 'motion' : 'voice';
    const isOnline = navigator.onLine;

    if (!isOnline) {
      await queueOfflineEvent({
        lat,
        lng,
        trigger_source: source,
        triggered_at: new Date().toISOString(),
      });
      setPhase('offline_queued');
      console.info('[DistressPrompt] Offline — SOS queued');
    } else {
      try {
        const token = useAuth.getState().session?.access_token ?? 'stub';
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
        console.info('[DistressPrompt] SOS active online:', result.event_id);
      } catch (err) {
        console.error('[DistressPrompt] Online trigger failed — queuing offline', err);
        await queueOfflineEvent({
          lat,
          lng,
          trigger_source: source,
          triggered_at: new Date().toISOString(),
        });
        setPhase('offline_queued');
        setError('Could not reach server — SOS queued.');
      }
    }
  };

  const handleCancelClick = () => {
    resolveSafe();
  };

  if (!isPromptOpen) return null;

  // Human friendly description of trigger source
  const triggerLabel = 
    triggerSource === 'motion' ? 'Sudden running or a fall detected' :
    triggerSource === 'audio' ? 'Sudden loud scream or crash sound detected' :
    'Emergency voice phrase detected';

  // SVG circular progress details
  const R = 60;
  const CIRC = 2 * Math.PI * R;
  const progressPercent = (timeLeft / 15) * 100;
  const strokeDashoffset = CIRC - (progressPercent / 100) * CIRC;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #18050e 0%, #2b000a 50%, #0d0510 100%)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--color-text-hi)',
      textAlign: 'center',
      padding: '24px',
      fontFamily: 'var(--font-body)',
      animation: 'alarm-pulse-bg 4s ease-in-out infinite',
    }}>
      {/* Alert Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '24px',
          background: 'rgba(255, 23, 68, 0.1)',
          border: '1px solid rgba(255, 23, 68, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          animation: 'alarm-pulse-icon 1.2s infinite',
        }}>
          <ShieldAlert size={36} color="var(--color-sos)" />
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '24px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--color-sos)',
          marginBottom: '8px',
        }}>
          Are you safe?
        </h2>
        <div style={{
          fontSize: '13px',
          color: 'var(--color-text-md)',
          background: 'rgba(255, 23, 68, 0.08)',
          border: '1px solid rgba(255, 23, 68, 0.15)',
          padding: '6px 16px',
          borderRadius: '20px',
          display: 'inline-block',
        }}>
          {triggerLabel}
        </div>
      </div>

      {/* Countdown Circle */}
      <div style={{ position: 'relative', width: '150px', height: '150px', marginBottom: '40px' }}>
        <svg width="150" height="150" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="75" cy="75" r={R}
            fill="none"
            stroke="var(--color-stroke)"
            strokeWidth="8"
          />
          <circle
            cx="75" cy="75" r={R}
            fill="none"
            stroke={timeLeft <= 5 ? 'var(--color-sos)' : 'var(--color-rose)'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '44px',
            fontWeight: 800,
            color: timeLeft <= 5 ? 'var(--color-sos)' : 'var(--color-text-hi)',
            lineHeight: 1,
          }}>
            {timeLeft}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-lo)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
            seconds
          </span>
        </div>
      </div>

      {/* Active Speech Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '40px',
        padding: '8px 16px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--color-stroke-hi)',
        fontSize: '12px',
        color: 'var(--color-text-md)',
      }}>
        <Volume2 size={14} color="var(--color-safe)" className="breathe-anim" />
        <span>Listening for verbal cancel: say <strong>"I'm safe"</strong></span>
      </div>

      {/* Big "I'm Safe" Button */}
      <button
        onClick={handleCancelClick}
        style={{
          width: '100%',
          maxWidth: '280px',
          padding: '20px',
          borderRadius: '24px',
          border: 'none',
          background: 'linear-gradient(135deg, var(--color-safe), #2cc384)',
          color: '#08030a',
          fontWeight: 800,
          fontSize: '18px',
          fontFamily: 'var(--font-display)',
          cursor: 'pointer',
          boxShadow: '0 12px 32px rgba(57, 224, 155, 0.3), inset 0 2px 4px rgba(255,255,255,0.3)',
          transition: 'transform 0.15s, box-shadow 0.15s',
          letterSpacing: '-0.02em',
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        I'm Safe — Cancel Alarm
      </button>

      <p style={{ fontSize: '11px', color: 'var(--color-text-lo)', marginTop: '24px', maxWidth: '320px', lineHeight: '1.5' }}>
        If you don't cancel this alert, SHEildAI will notify emergency services and contacts of your live location in {timeLeft} seconds.
      </p>

      {/* Embedded Animations */}
      <style>{`
        @keyframes alarm-pulse-bg {
          0%, 100% { background: linear-gradient(135deg, #18050e 0%, #2b000a 50%, #0d0510 100%); }
          50% { background: linear-gradient(135deg, #2b000a 0%, #44000f 50%, #18050e 100%); }
        }
        @keyframes alarm-pulse-icon {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 23, 68, 0.4); }
          50% { transform: scale(1.08); box-shadow: 0 0 20px 10px rgba(255, 23, 68, 0); }
        }
      `}</style>
    </div>
  );
}
