import { useEffect, useRef } from 'react';

// Expose sensitivity thresholds as constants for easy tuning
export const MIC_SENSITIVITY_THRESHOLDS = {
  low: 80,    // Scream level (RMS max is 128)
  medium: 55, // Shouting/Loud talking
  high: 30,   // Moderate talking
};

interface MicListenerProps {
  active: boolean;
  isPromptOpen: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  onVolumeTrigger: () => void;
  onSpeechTrigger: () => void;
  onSafeSpeechDetected?: () => void;
  onAudioLevelChange: (level: number) => void;
}

export function useMicListener({
  active,
  isPromptOpen,
  sensitivity,
  onVolumeTrigger,
  onSpeechTrigger,
  onSafeSpeechDetected,
  onAudioLevelChange,
}: MicListenerProps) {
  const onVolumeTriggerRef = useRef(onVolumeTrigger);
  const onSpeechTriggerRef = useRef(onSpeechTrigger);
  const onSafeSpeechDetectedRef = useRef(onSafeSpeechDetected);
  const onAudioLevelChangeRef = useRef(onAudioLevelChange);

  useEffect(() => {
    onVolumeTriggerRef.current = onVolumeTrigger;
    onSpeechTriggerRef.current = onSpeechTrigger;
    onSafeSpeechDetectedRef.current = onSafeSpeechDetected;
    onAudioLevelChangeRef.current = onAudioLevelChange;
  }, [onVolumeTrigger, onSpeechTrigger, onSafeSpeechDetected, onAudioLevelChange]);

  // 1. Web Audio API for volume monitoring
  useEffect(() => {
    if (!active) {
      onAudioLevelChangeRef.current(0);
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let stream: MediaStream | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationFrameId = 0;
    let lastVolumeTriggerTime = 0;

    const startAudio = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (!analyser) return;
          analyser.getByteTimeDomainData(dataArray);

          // Calculate RMS (Root Mean Square) volume (centered on silence 128)
          let sumSquares = 0;
          for (let i = 0; i < bufferLength; i++) {
            const val = dataArray[i] - 128;
            sumSquares += val * val;
          }
          const rms = Math.sqrt(sumSquares / bufferLength);
          onAudioLevelChangeRef.current(Math.round(rms));

          const threshold = MIC_SENSITIVITY_THRESHOLDS[sensitivity];
          if (rms > threshold) {
            const now = Date.now();
            if (now - lastVolumeTriggerTime > 3000) {
              lastVolumeTriggerTime = now;
              console.info(`[useMicListener] Loud sound detected: RMS ${rms.toFixed(1)} exceeds threshold ${threshold}`);
              onVolumeTriggerRef.current();
            }
          }

          animationFrameId = requestAnimationFrame(checkVolume);
        };

        checkVolume();
      } catch (err) {
        console.error('Error starting Web Audio API volume listener:', err);
      }
    };

    startAudio();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (source) source.disconnect();
      if (analyser) analyser.disconnect();
      if (audioContext) audioContext.close();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [active, sensitivity]);

  // 2. Web Speech API for wake phrases
  useEffect(() => {
    if (!active) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[useMicListener] Web Speech API (SpeechRecognition) is not supported in this browser.');
      return;
    }

    let recognition: any = null;
    let isListening = false;
    let isStoppedExplicitly = false;

    const startRecognition = () => {
      if (isStoppedExplicitly) return;
      try {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          isListening = true;
          console.info('[useMicListener] SpeechRecognition started listening...');
        };

        recognition.onerror = (e: any) => {
          console.error('[useMicListener] SpeechRecognition error:', e.error);
          if (e.error === 'not-allowed') {
            isListening = false;
          }
        };

        recognition.onend = () => {
          isListening = false;
          console.info('[useMicListener] SpeechRecognition ended.');
          // Auto-restart if Guardian Mode is active and we didn't stop explicitly
          if (active && !isStoppedExplicitly) {
            setTimeout(() => {
              if (active && !isListening && !isStoppedExplicitly) {
                try {
                  recognition.start();
                } catch (err) {
                  console.error('[useMicListener] Failed to restart SpeechRecognition:', err);
                }
              }
            }, 1000);
          }
        };

        recognition.onresult = (event: any) => {
          const results = event.results;
          const lastResult = results[results.length - 1];
          const transcript = lastResult[0].transcript.toLowerCase().trim();
          
          console.info('[useMicListener] Transcript:', transcript, 'Final:', lastResult.isFinal);

          const isDistressPhrase = 
            transcript.includes('help me') ||
            transcript.includes('sos') ||
            transcript.includes('sheild ai') ||
            transcript.includes('shield ai') ||
            transcript.includes('sheildai') ||
            transcript.includes('shieldai');

          const isSafePhrase = 
            transcript.includes('i am safe') ||
            transcript.includes("i'm safe") ||
            transcript.includes('im safe') ||
            transcript.includes('safe');

          if (isPromptOpen && isSafePhrase) {
            console.info('[useMicListener] Verbal safe word detected:', transcript);
            onSafeSpeechDetectedRef.current?.();
          } else if (!isPromptOpen && isDistressPhrase) {
            console.info('[useMicListener] Verbal distress phrase detected:', transcript);
            onSpeechTriggerRef.current();
          }
        };

        recognition.start();
      } catch (err) {
        console.error('[useMicListener] Error initializing SpeechRecognition:', err);
      }
    };

    startRecognition();

    return () => {
      isStoppedExplicitly = true;
      if (recognition) {
        try {
          recognition.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }
    };
  }, [active, isPromptOpen]);
}
