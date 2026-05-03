/**
 * Wrapper around `react-native-geolocation-service`.
 *
 * Why this library and not `@react-native-community/geolocation`?
 *  - Returns higher-accuracy fixes on Android (uses FusedLocation under
 *    the hood when available, falls back to GPS otherwise).
 *  - Plays nicer with newer Google Play Services versions.
 *  - Has a `forceRequestLocation` flag that prevents Android from
 *    returning a cached fix from another app.
 *
 * As with locationPermissions.ts we lazy-require so a missing native
 * module doesn't crash the app on launch.
 */

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number;        // metres — useful for "GPS is fuzzy" UI hints
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
}

export type GeolocationError =
  | 'permission_denied'
  | 'position_unavailable'  // OS couldn't get a fix (no GPS, indoors, etc.)
  | 'timeout'
  | 'unavailable'           // native module not linked (pre-rebuild)
  | 'unknown';

export type GetLocationResult =
  | { ok: true; coords: Coords }
  | { ok: false; error: GeolocationError; message?: string };

interface GeolocationModule {
  getCurrentPosition: (
    success: (pos: {
      coords: Coords;
      timestamp: number;
    }) => void,
    error: (err: { code: number; message: string }) => void,
    opts?: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
      forceRequestLocation?: boolean;
      forceLocationManager?: boolean;
      showLocationDialog?: boolean;
    },
  ) => void;
}

function loadModule(): GeolocationModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-geolocation-service');
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

interface Options {
  /** Defaults to true. Falls back to network-based positioning on failure. */
  highAccuracy?: boolean;
  /** Maximum time we'll wait for a fix, in ms. Defaults to 15s. */
  timeoutMs?: number;
  /** Accept a cached fix up to this many ms old. Defaults to 60s. */
  maxAgeMs?: number;
}

/**
 * Get a single GPS reading. Always resolves — never throws — so callers
 * can just branch on `result.ok`.
 */
export function getCurrentLocation(
  opts: Options = {},
): Promise<GetLocationResult> {
  const mod = loadModule();
  if (!mod) {
    return Promise.resolve({
      ok: false,
      error: 'unavailable',
      message: 'Native geolocation module not linked. Rebuild the app.',
    });
  }
  const {
    highAccuracy = true,
    timeoutMs = 15000,
    maxAgeMs = 60000,
  } = opts;

  return new Promise(resolve => {
    let settled = false;
    const finish = (r: GetLocationResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };

    try {
      mod.getCurrentPosition(
        pos => finish({ ok: true, coords: { ...pos.coords, timestamp: pos.timestamp } }),
        err => {
          // Map react-native-geolocation-service error codes to our enum.
          // Codes: 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT, 5 PLAY_SERVICE_NOT_AVAILABLE
          const map: Record<number, GeolocationError> = {
            1: 'permission_denied',
            2: 'position_unavailable',
            3: 'timeout',
            5: 'unavailable',
          };
          finish({
            ok: false,
            error: map[err?.code] ?? 'unknown',
            message: err?.message,
          });
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: timeoutMs,
          maximumAge: maxAgeMs,
          forceRequestLocation: true,
          showLocationDialog: true,
        },
      );
    } catch (e: any) {
      finish({ ok: false, error: 'unknown', message: e?.message });
    }
  });
}
