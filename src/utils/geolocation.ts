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
  /** Maximum time we'll wait for a fix, in ms. Defaults to 20s — gives
   *  GPS enough time to lock on satellites instead of returning a
   *  rougher cell-tower / Wi-Fi fix. */
  timeoutMs?: number;
  /** Accept a cached fix up to this many ms old. Defaults to 0 — never
   *  accept stale fixes. Cached fixes from other apps are the #1 cause
   *  of "the app says I'm 300m away from where I actually am". */
  maxAgeMs?: number;
  /** When set, keep watching for a better fix until accuracy (in metres)
   *  is at or below this value, or the overall timeout fires. Default:
   *  50m, which is fine for delivery-address detection. */
  targetAccuracyM?: number;
}

interface GeolocationWatchModule extends GeolocationModule {
  watchPosition: (
    success: (pos: { coords: Coords; timestamp: number }) => void,
    error: (err: { code: number; message: string }) => void,
    opts?: {
      enableHighAccuracy?: boolean;
      distanceFilter?: number;
      interval?: number;
      fastestInterval?: number;
      forceRequestLocation?: boolean;
      forceLocationManager?: boolean;
      showLocationDialog?: boolean;
    },
  ) => number;
  clearWatch: (id: number) => void;
}

/**
 * Get a high-accuracy GPS reading. Always resolves — never throws — so
 * callers can just branch on `result.ok`.
 *
 * Strategy (the previous single-shot version returned the FIRST fix the
 * OS handed us, which on Android is routinely a cached / cell-tower /
 * Wi-Fi fix with 300–500m accuracy — exactly the symptom the user
 * reported):
 *
 *   1. Open a watcher with `enableHighAccuracy: true`, distanceFilter 0,
 *      so it streams every new fix as the GPS chip locks more satellites.
 *   2. Track the best (lowest `accuracy`) fix we've seen so far.
 *   3. As soon as a fix arrives with accuracy ≤ targetAccuracyM, stop
 *      watching and return it.
 *   4. If the overall timeout fires first, return whatever the best fix
 *      is so far (even if it's worse than the target — beats failing).
 *   5. `maximumAge: 0` and `forceRequestLocation: true` ensure we never
 *      accept a stale fix from FusedLocation's cache.
 */
export function getCurrentLocation(
  opts: Options = {},
): Promise<GetLocationResult> {
  const mod = loadModule() as GeolocationWatchModule | null;
  if (!mod || typeof mod.watchPosition !== 'function') {
    return Promise.resolve({
      ok: false,
      error: 'unavailable',
      message: 'Native geolocation module not linked. Rebuild the app.',
    });
  }
  const {
    highAccuracy = true,
    timeoutMs = 20000,
    targetAccuracyM = 50,
  } = opts;

  return new Promise(resolve => {
    let settled = false;
    let watchId: number | null = null;
    let best: Coords | null = null;

    const finish = (r: GetLocationResult) => {
      if (settled) return;
      settled = true;
      if (watchId !== null) {
        try { mod.clearWatch(watchId); } catch { /* ignore */ }
      }
      if (timer) clearTimeout(timer);
      resolve(r);
    };

    // Overall budget. If even one fix has arrived by then we return it;
    // otherwise we fail with `timeout`.
    const timer = setTimeout(() => {
      if (best) {
        finish({ ok: true, coords: best });
      } else {
        finish({ ok: false, error: 'timeout' });
      }
    }, timeoutMs);

    try {
      watchId = mod.watchPosition(
        pos => {
          const c: Coords = { ...pos.coords, timestamp: pos.timestamp };
          // Keep the most accurate fix so far. `accuracy` may be
          // undefined on some Android OEMs — fall back to "trust it" in
          // that case.
          const a = c.accuracy ?? 0;
          const ba = best?.accuracy ?? Number.POSITIVE_INFINITY;
          if (!best || a < ba) {
            best = c;
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log(`[geo] fix lat=${c.latitude.toFixed(6)} lng=${c.longitude.toFixed(6)} acc=${a}m`);
            }
          }
          // Good enough — return immediately.
          if (a > 0 && a <= targetAccuracyM) {
            finish({ ok: true, coords: c });
          }
        },
        err => {
          // PERMISSION_DENIED + POSITION_UNAVAILABLE → bail fast.
          // Other errors: keep waiting — sometimes the first fix fails
          // and the next one comes through.
          const map: Record<number, GeolocationError> = {
            1: 'permission_denied',
            2: 'position_unavailable',
            3: 'timeout',
            5: 'unavailable',
          };
          if (err?.code === 1 || err?.code === 2 || err?.code === 5) {
            finish({
              ok: false,
              error: map[err.code] ?? 'unknown',
              message: err?.message,
            });
          }
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn('[geo] watch error', err?.code, err?.message);
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          distanceFilter: 0,
          // How often the OS reports updates while satellites lock on.
          // 1s is generous — usually a good fix arrives in 2-4 reports.
          interval: 1000,
          fastestInterval: 500,
          forceRequestLocation: true,
          showLocationDialog: true,
        },
      );
    } catch (e: any) {
      finish({ ok: false, error: 'unknown', message: e?.message });
    }
  });
}
