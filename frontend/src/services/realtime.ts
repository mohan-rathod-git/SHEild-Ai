/**
 * SHEildAI — Supabase Realtime Subscriptions
 *
 * Subscribe to live changes on sos_events and sos_event_recipients
 * so the SOSActiveScreen updates in real time without polling.
 *
 * Uses the anon-key client (RLS policies control what the client can see):
 *   • Event owner sees their own event + all recipients
 *   • A recipient sees the event and their own recipient row
 */

import { supabase } from './supabaseClient';
import type { SOSStatusResponse } from './api';

type SOSEvent = SOSStatusResponse['event'];
type SOSRecipient = SOSStatusResponse['recipients'][number];

export interface SOSRealtimeCallbacks {
  onEventUpdated:        (event: SOSEvent)     => void;
  onRecipientAdded:      (rec: SOSRecipient)   => void;
  onRecipientAcknowledged: (rec: SOSRecipient) => void;
}

/**
 * Subscribe to live changes for a specific SOS event.
 * Returns an `unsubscribe` function — call it when the active screen unmounts.
 */
export function subscribeToSOSEvent(
  eventId: string,
  callbacks: SOSRealtimeCallbacks,
): () => void {
  const channelName = `sos-event-${eventId}`;

  const channel = supabase
    .channel(channelName)

    // ── Watch sos_events for status changes ──────────────
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sos_events',
        filter: `id=eq.${eventId}`,
      },
      (payload) => {
        callbacks.onEventUpdated(payload.new as SOSEvent);
      },
    )

    // ── Watch sos_event_recipients for new notifications ──
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sos_event_recipients',
        filter: `sos_event_id=eq.${eventId}`,
      },
      (payload) => {
        callbacks.onRecipientAdded(payload.new as SOSRecipient);
      },
    )

    // ── Watch sos_event_recipients for acknowledgements ───
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sos_event_recipients',
        filter: `sos_event_id=eq.${eventId}`,
      },
      (payload) => {
        const rec = payload.new as SOSRecipient;
        if (rec.acknowledged_at) {
          callbacks.onRecipientAcknowledged(rec);
        }
      },
    )

    .subscribe((status) => {
      console.info(`[Realtime] SOS channel ${channelName}: ${status}`);
    });

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Play a programmatic siren tone using the Web Audio API.
 * Alternates between 800 Hz and 1200 Hz at 0.5s intervals.
 *
 * NOTE: True system-level max-volume override and screen strobe require
 * a native/PWA wrapper (e.g. Capacitor, React Native, or a registered
 * Service Worker with Push + Screen Wake Lock APIs). This is the closest
 * possible web equivalent.
 */
export function playSiren(): () => void {
  let ctx: AudioContext | null = null;
  let oscillator: OscillatorNode | null = null;
  let gainNode: GainNode | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let high = true;

  try {
    ctx = new AudioContext();
    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(1.0, ctx.currentTime); // max gain
    gainNode.connect(ctx.destination);

    oscillator = ctx.createOscillator();
    oscillator.type = 'sawtooth'; // harsher than sine — closer to a real siren
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.connect(gainNode);
    oscillator.start();

    intervalId = setInterval(() => {
      if (oscillator && ctx) {
        high = !high;
        oscillator.frequency.setTargetAtTime(
          high ? 1200 : 800,
          ctx.currentTime,
          0.05, // fast ramp
        );
      }
    }, 500);

  } catch (e) {
    console.warn('[Siren] Web Audio API not available:', e);
  }

  // Return stop function
  return () => {
    if (intervalId) clearInterval(intervalId);
    oscillator?.stop();
    oscillator?.disconnect();
    gainNode?.disconnect();
    ctx?.close();
  };
}
