/**
 * SHEildAI — SOS Zustand Store
 *
 * Single source of truth for the active SOS state.
 * The SOSButton writes here; SOSActiveScreen reads from here.
 * Realtime subscription updates flow in via updateFromRealtime().
 */

import { create } from 'zustand';
import type { SOSStatusResponse } from '../services/api';

type SOSEvent     = SOSStatusResponse['event'];
type SOSRecipient = SOSStatusResponse['recipients'][number];

export type SOSPhase =
  | 'idle'          // no active SOS
  | 'arming'        // hold-to-trigger in progress
  | 'triggering'    // HTTP request in flight
  | 'active'        // SOS live — cascade running
  | 'offline_queued'// created offline, waiting to sync
  | 'resolving'     // resolve request in flight
  | 'resolved';     // SOS cancelled / resolved

interface SOSState {
  // ── Phase ─────────────────────────────────────────────────
  phase: SOSPhase;

  // ── Active event data (set once triggered) ─────────────────
  eventId:    string | null;
  event:      SOSEvent | null;
  recipients: SOSRecipient[];

  // ── Offline queue ─────────────────────────────────────────
  offlineQueueCount: number;

  // ── Siren ─────────────────────────────────────────────────
  sirenActive: boolean;
  stopSiren:   (() => void) | null;

  // ── Error ─────────────────────────────────────────────────
  error: string | null;

  // ── Actions ───────────────────────────────────────────────
  setPhase:              (phase: SOSPhase) => void;
  setActiveEvent:        (event: SOSEvent) => void;
  updateFromRealtime:    (event: SOSEvent) => void;
  addRecipient:          (rec: SOSRecipient) => void;
  acknowledgeRecipient:  (rec: SOSRecipient) => void;
  setSirenStop:          (fn: (() => void) | null) => void;
  setError:              (msg: string | null) => void;
  setOfflineQueueCount:  (n: number) => void;
  reset:                 () => void;
}

const INITIAL_STATE = {
  phase:             'idle' as SOSPhase,
  eventId:           null,
  event:             null,
  recipients:        [],
  offlineQueueCount: 0,
  sirenActive:       false,
  stopSiren:         null,
  error:             null,
};

export const useSOSStore = create<SOSState>((set, get) => ({
  ...INITIAL_STATE,

  setPhase: (phase) => set({ phase }),

  setActiveEvent: (event) =>
    set({ event, eventId: event.id, phase: 'active', recipients: [] }),

  updateFromRealtime: (event) =>
    set((s) => ({
      event,
      // Sync phase with event status so UI reflects resolved/acknowledged
      phase: event.status === 'resolved' ? 'resolved'
           : event.status === 'acknowledged' ? 'active'
           : s.phase,
    })),

  addRecipient: (rec) =>
    set((s) => ({
      recipients: s.recipients.some((r) => r.id === rec.id)
        ? s.recipients
        : [...s.recipients, rec],
    })),

  acknowledgeRecipient: (rec) =>
    set((s) => ({
      recipients: s.recipients.map((r) =>
        r.id === rec.id ? { ...r, acknowledged_at: rec.acknowledged_at } : r,
      ),
    })),

  setSirenStop: (fn) =>
    set({ stopSiren: fn, sirenActive: fn !== null }),

  setError: (error) => set({ error }),

  setOfflineQueueCount: (n) => set({ offlineQueueCount: n }),

  reset: () => {
    // Stop siren if running
    get().stopSiren?.();
    set({ ...INITIAL_STATE });
  },
}));
