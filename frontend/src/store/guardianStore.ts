import { create } from 'zustand';
import { backendApi } from '../services/api';
import { useAuth } from '../features/auth/useAuth';

export type GuardianSensitivity = 'low' | 'medium' | 'high';
export type DistressTrigger = 'audio' | 'motion' | 'speech';

interface GuardianState {
  // ── States ──────────────────────────────────────────────────
  active: boolean;
  sessionId: string | null;
  sensitivity: GuardianSensitivity;
  audioLevel: number;
  isPromptOpen: boolean;
  triggerSource: DistressTrigger | null;
  error: string | null;
  distressCount: number;
  falseAlarmCount: number;
  startTime: number | null;

  // ── Actions ─────────────────────────────────────────────────
  setSensitivity: (s: GuardianSensitivity) => void;
  setAudioLevel: (l: number) => void;
  startGuardian: () => Promise<void>;
  stopGuardian: () => Promise<void>;
  triggerDistress: (source: DistressTrigger) => void;
  resolveSafe: () => Promise<void>;
  setError: (err: string | null) => void;
}

export const useGuardianStore = create<GuardianState>((set, get) => ({
  active: false,
  sessionId: null,
  sensitivity: 'medium',
  audioLevel: 0,
  isPromptOpen: false,
  triggerSource: null,
  error: null,
  distressCount: 0,
  falseAlarmCount: 0,
  startTime: null,

  setSensitivity: (sensitivity) => set({ sensitivity }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setError: (error) => set({ error }),

  startGuardian: async () => {
    const { sensitivity, active } = get();
    if (active) return;

    set({ error: null });
    const token = useAuth.getState().session?.access_token || 'stub';
    const now = Date.now();

    try {
      const payload = {
        sensitivity,
        mic_enabled: true,
        motion_enabled: true,
        speech_enabled: true,
      };

      const result = await backendApi.startGuardianSession(payload, token);
      set({
        active: true,
        sessionId: result.session_id,
        startTime: now,
        distressCount: 0,
        falseAlarmCount: 0,
        isPromptOpen: false,
        triggerSource: null,
      });
      console.info('[GuardianStore] Session started on backend:', result.session_id);
    } catch (err: any) {
      console.warn('[GuardianStore] Backend session log failed, running client-side anyway:', err);
      // Fallback: run locally even if backend logging fails
      set({
        active: true,
        sessionId: 'local-' + Math.random().toString(36).substring(2, 11),
        startTime: now,
        distressCount: 0,
        falseAlarmCount: 0,
        isPromptOpen: false,
        triggerSource: null,
      });
    }
  },

  stopGuardian: async () => {
    const { active, sessionId, startTime, distressCount, falseAlarmCount } = get();
    if (!active) return;

    const token = useAuth.getState().session?.access_token || 'stub';
    const duration = startTime ? (Date.now() - startTime) / 1000 : 0;

    // Reset local state immediately for responsive UX
    set({
      active: false,
      audioLevel: 0,
      isPromptOpen: false,
      triggerSource: null,
    });

    if (sessionId && !sessionId.startsWith('local-')) {
      try {
        const payload = {
          session_id: sessionId,
          distress_count: distressCount,
          false_alarm_count: falseAlarmCount,
          duration_seconds: duration,
        };
        await backendApi.stopGuardianSession(payload, token);
        console.info('[GuardianStore] Session stopped on backend:', sessionId);
      } catch (err) {
        console.warn('[GuardianStore] Failed to stop session on backend:', err);
      }
    }

    set({ sessionId: null, startTime: null });
  },

  triggerDistress: (source) => {
    const { isPromptOpen, active, distressCount } = get();
    if (!active || isPromptOpen) return;

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]); // Alert vibration
    }

    set({
      isPromptOpen: true,
      triggerSource: source,
      distressCount: distressCount + 1,
    });
    console.info(`[GuardianStore] Distress triggered by: ${source}`);
  },

  resolveSafe: async () => {
    const { isPromptOpen, falseAlarmCount } = get();
    if (!isPromptOpen) return;

    if (navigator.vibrate) {
      navigator.vibrate(200); // Safe confirmation vibration
    }

    set({
      isPromptOpen: false,
      triggerSource: null,
      falseAlarmCount: falseAlarmCount + 1,
    });
    console.info('[GuardianStore] User marked safe, false alarm logged.');
  },
}));
