import { useEffect, useRef } from 'react';

// Expose sensitivity thresholds as constants for easy tuning
export const MOTION_SENSITIVITY_THRESHOLDS = {
  low: 40.0,    // Hard fall or crash
  medium: 25.0, // Running / heavy jog
  high: 15.0,   // Sudden moderate movement
};

interface MotionSensorProps {
  active: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  onTrigger: () => void;
}

export function useMotionSensor({ active, sensitivity, onTrigger }: MotionSensorProps) {
  const onTriggerRef = useRef(onTrigger);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    if (!active) return;

    const threshold = MOTION_SENSITIVITY_THRESHOLDS[sensitivity];
    let lastTriggerTime = 0;

    const handleMotion = (e: DeviceMotionEvent) => {
      // Prioritize acceleration (user movement, excluding gravity) if available
      const accel = e.acceleration || e.accelerationIncludingGravity;
      if (!accel) return;

      const x = accel.x ?? 0;
      const y = accel.y ?? 0;
      const z = accel.z ?? 0;

      const mag = Math.sqrt(x * x + y * y + z * z);

      if (mag > threshold) {
        const now = Date.now();
        // Cooldown of 3 seconds to avoid double triggering
        if (now - lastTriggerTime > 3000) {
          lastTriggerTime = now;
          console.info(`[useMotionSensor] Motion trigger: magnitude ${mag.toFixed(2)} exceeds threshold ${threshold}`);
          onTriggerRef.current();
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [active, sensitivity]);
}

/**
 * Request device motion permissions, particularly for iOS Safari.
 */
export async function requestMotionPermission(): Promise<boolean> {
  if (
    typeof window !== 'undefined' &&
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof (DeviceMotionEvent as any).requestPermission === 'function'
  ) {
    try {
      const state = await (DeviceMotionEvent as any).requestPermission();
      return state === 'granted';
    } catch (err) {
      console.error('Error requesting motion permission:', err);
      return false;
    }
  }
  // Desktop or Android where permission isn't requested explicitly via requestPermission()
  return true;
}
