/**
 * Generic haptic feedback helper using the standard screen-tactile navigator.vibrate API.
 * Safely guards for browser compatibility.
 */
export function triggerHaptic(pattern: number | number[] = 15) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Browser may block non-user-triggered vibration, swallow gracefully
    }
  }
}
