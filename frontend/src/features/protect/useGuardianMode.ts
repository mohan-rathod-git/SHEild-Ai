/**
 * SHEildAI — useGuardianMode
 *
 * On-device distress detection using:
 *   1. Web Audio API (AnalyserNode) — detects sudden sound spikes
 *   2. DeviceMotionEvent — detects jerk/acceleration spikes
 *
 * When distress is detected, onDistressDetected is called with the
 * trigger type ('audio' | 'motion'), which the ProtectPanel uses to
 * fire the SOS cascade.
 *
 * NOTE: Both sensors require user permission:
 *   - Microphone: navigator.mediaDevices.getUserMedia
 *   - Motion:     DeviceMotionEvent.requestPermission (iOS 13+)
 */

import { useCallback, useRef, useState } from 'react';

export type GuardianSensitivity = 'low' | 'medium' | 'high';
export type DistressTrigger = 'audio' | 'motion';

interface GuardianConfig {
  sensitivity: GuardianSensitivity;
  onDistressDetected: (type: DistressTrigger) => void;
}

// Sensitivity → threshold mappings
const AUDIO_THRESHOLDS: Record<GuardianSensitivity, number> = {
  low:    220,  // very loud (scream)
  medium: 180,  // loud sustained sound
  high:   140,  // moderate spike
};
const MOTION_THRESHOLDS: Record<GuardianSensitivity, number> = {
  low:    40,   // hard fall / strong hit
  medium: 25,   // moderate jerk
  high:   15,   // light sudden movement
};
const COOLDOWN_MS = 8000; // prevent re-triggering for 8 s

export function useGuardianMode({ sensitivity, onDistressDetected }: GuardianConfig) {
  const [active, setActive]         = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);   // 0-255 RMS
  const [error, setError]           = useState<string | null>(null);
  const [lastTrigger, setLastTrigger] = useState<DistressTrigger | null>(null);

  const ctxRef      = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number>(0);
  const cooldownRef = useRef<boolean>(false);
  const motionListenerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  // ── Audio loop ──────────────────────────────────────────────
  const startAudioLoop = useCallback((analyser: AnalyserNode) => {
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      // RMS of time-domain data (centred on 128)
      const rms = Math.sqrt(buf.reduce((s, v) => s + (v - 128) ** 2, 0) / buf.length);
      setAudioLevel(Math.round(rms));

      if (!cooldownRef.current && rms > AUDIO_THRESHOLDS[sensitivity]) {
        cooldownRef.current = true;
        setLastTrigger('audio');
        onDistressDetected('audio');
        setTimeout(() => { cooldownRef.current = false; }, COOLDOWN_MS);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [sensitivity, onDistressDetected]);

  // ── Motion listener ─────────────────────────────────────────
  const handleMotion = useCallback((e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);

    if (!cooldownRef.current && mag > MOTION_THRESHOLDS[sensitivity]) {
      cooldownRef.current = true;
      setLastTrigger('motion');
      onDistressDetected('motion');
      setTimeout(() => { cooldownRef.current = false; }, COOLDOWN_MS);
    }
  }, [sensitivity, onDistressDetected]);

  // ── Start ───────────────────────────────────────────────────
  const startGuardian = useCallback(async () => {
    setError(null);

    // 1. Request microphone
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone permission denied. Audio detection disabled.');
      stream = null as any;
    }

    // 2. Web Audio setup
    if (stream) {
      const ctx      = new AudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      ctxRef.current      = ctx;
      analyserRef.current = analyser;
      streamRef.current   = stream;

      startAudioLoop(analyser);
    }

    // 3. DeviceMotion
    try {
      // @ts-ignore — requestPermission only exists on iOS 13+
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        // @ts-ignore
        const perm = await DeviceMotionEvent.requestPermission();
        if (perm !== 'granted') throw new Error('Motion permission denied');
      }
      const listener = handleMotion;
      motionListenerRef.current = listener as any;
      window.addEventListener('devicemotion', listener as any);
    } catch {
      // Motion not available on desktop — not a hard error
      console.info('[Guardian] DeviceMotion unavailable or denied');
    }

    setActive(true);
  }, [startAudioLoop, handleMotion]);

  // ── Stop ────────────────────────────────────────────────────
  const stopGuardian = useCallback(() => {
    cancelAnimationFrame(rafRef.current);

    streamRef.current?.getTracks().forEach(t => t.stop());
    analyserRef.current?.disconnect();
    ctxRef.current?.close();

    ctxRef.current      = null;
    analyserRef.current = null;
    streamRef.current   = null;

    if (motionListenerRef.current) {
      window.removeEventListener('devicemotion', motionListenerRef.current as any);
      motionListenerRef.current = null;
    }

    setActive(false);
    setAudioLevel(0);
    setLastTrigger(null);
  }, []);

  return { active, audioLevel, error, lastTrigger, startGuardian, stopGuardian };
}
