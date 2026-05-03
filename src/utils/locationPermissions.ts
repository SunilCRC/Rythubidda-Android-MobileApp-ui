import { Linking, Platform } from 'react-native';

/**
 * Thin wrapper around `react-native-permissions` for the location runtime
 * permission. Two reasons we don't import the library at module scope:
 *
 *   1. The library has a native module — if the JS bundle runs against an
 *      APK that hasn't been rebuilt yet (common during dev), `import` at the
 *      top of the file would crash the entire app on launch. Lazy `require`
 *      lets us return `'unavailable'` and let the rest of the app keep
 *      working.
 *   2. Tests (Jest) can mock `require('react-native-permissions')` per
 *      test instead of fighting with hoisting.
 */

export type LocationPermissionStatus =
  | 'granted'      // user accepted (precise OR approximate)
  | 'limited'      // iOS-only; user accepted but with reduced accuracy
  | 'denied'       // user has not yet been asked, or denied without "don't ask again"
  | 'blocked'      // user denied with "don't ask again" — must go to Settings
  | 'unavailable'; // native module missing (pre-rebuild) or device has no GPS

interface RNPermissionsLike {
  PERMISSIONS: {
    ANDROID: { ACCESS_FINE_LOCATION: string; ACCESS_COARSE_LOCATION: string };
    IOS: { LOCATION_WHEN_IN_USE: string };
  };
  RESULTS: {
    UNAVAILABLE: string;
    DENIED: string;
    LIMITED: string;
    GRANTED: string;
    BLOCKED: string;
  };
  check: (permission: string) => Promise<string>;
  request: (permission: string) => Promise<string>;
  openSettings: () => Promise<void>;
}

function loadModule(): RNPermissionsLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-permissions') as RNPermissionsLike;
  } catch {
    return null;
  }
}

function permissionForPlatform(mod: RNPermissionsLike): string {
  return Platform.OS === 'ios'
    ? mod.PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : mod.PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
}

function mapResult(
  mod: RNPermissionsLike,
  raw: string,
): LocationPermissionStatus {
  switch (raw) {
    case mod.RESULTS.GRANTED:
      return 'granted';
    case mod.RESULTS.LIMITED:
      return 'limited';
    case mod.RESULTS.BLOCKED:
      return 'blocked';
    case mod.RESULTS.DENIED:
      return 'denied';
    case mod.RESULTS.UNAVAILABLE:
    default:
      return 'unavailable';
  }
}

/**
 * Read the current permission state without prompting. Safe to call on
 * every render; cheap and synchronous-ish at the JS layer.
 */
export async function checkLocationPermission(): Promise<LocationPermissionStatus> {
  const mod = loadModule();
  if (!mod) return 'unavailable';
  try {
    const raw = await mod.check(permissionForPlatform(mod));
    return mapResult(mod, raw);
  } catch {
    return 'unavailable';
  }
}

/**
 * Show the OS dialog. If the user previously selected "don't ask again",
 * this will resolve immediately to `'blocked'` — call `openAppSettings()`
 * in that case.
 */
export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  const mod = loadModule();
  if (!mod) return 'unavailable';
  try {
    const raw = await mod.request(permissionForPlatform(mod));
    return mapResult(mod, raw);
  } catch {
    return 'unavailable';
  }
}

/**
 * Send the user to the OS-level app settings page so they can flip on
 * location for our app. We fall back to `Linking.openSettings` on
 * platforms where react-native-permissions' helper isn't available.
 */
export async function openAppSettings(): Promise<void> {
  const mod = loadModule();
  if (mod) {
    try {
      await mod.openSettings();
      return;
    } catch {
      // fall through
    }
  }
  try {
    await Linking.openSettings();
  } catch {
    // ignore — at this point there's nothing more we can do.
  }
}
