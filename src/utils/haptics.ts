import { Platform, Vibration } from 'react-native';

/**
 * Lightweight haptic feedback using the built-in Vibration API.
 *
 * We wrap every call in try/catch because Vibration requires the
 * `android.permission.VIBRATE` permission at the manifest level.
 * If the permission isn't granted (or the hardware is unavailable),
 * the call throws — we swallow it silently so haptics remain a
 * purely cosmetic nice-to-have and never crash the app.
 */

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    // Permission denied or hardware unavailable — ignore.
  }
}

export const haptics = {
  tap: () => safe(() => Vibration.vibrate(10)),
  success: () =>
    safe(() =>
      Vibration.vibrate(Platform.OS === 'ios' ? 10 : [0, 15, 40, 20]),
    ),
  warning: () =>
    safe(() =>
      Vibration.vibrate(Platform.OS === 'ios' ? 20 : [0, 20, 50, 30]),
    ),
  error: () =>
    safe(() =>
      Vibration.vibrate(
        Platform.OS === 'ios' ? 30 : [0, 25, 50, 25, 50, 25],
      ),
    ),
  select: () => safe(() => Vibration.vibrate(6)),
};
