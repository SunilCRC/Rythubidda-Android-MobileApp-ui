/**
 * Google Geocoding API wrapper — reverse-geocode lat/lng → structured address.
 *
 * We hit the REST endpoint directly (no SDK) because:
 *   • The maps SDK on Android already includes the Geocoder Java class,
 *     but using it from JS would require a native bridge for nothing.
 *   • A plain `fetch` keeps the bundle small and the surface obvious.
 *
 * Cost discipline:
 *   • One request per "Use current location" tap. Never on debounce / drag —
 *     dragging the map pin DOES re-geocode, but only on `onDragEnd`.
 *   • `addressCache` (in-memory + persisted) collapses repeated calls for
 *     coordinates rounded to 4 decimals (~11 m) to 1 lookup per location.
 *   • Hard 8s timeout — better to fail fast than burn budget waiting on
 *     a flaky network request.
 *
 * Error model: always resolves, never throws. Caller branches on `ok`.
 */

import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const CACHE_STORAGE_KEY = 'rb_geocode_cache_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_MAX_ENTRIES = 100;

export interface ResolvedAddress {
  /** Always present (the only required field for serviceability lookup). */
  pincode: string;
  city?: string;
  state?: string;
  country?: string;
  area?: string;        // sublocality / neighbourhood, e.g. "Kukatpally"
  road?: string;        // route / street name
  formatted?: string;   // "Plot 12, Kukatpally Housing Society, Hyderabad…"
  /**
   * `place_id` is opaque — useful if we ever want to fetch fresh place
   * details later. Not strictly needed by the rest of the app today.
   */
  placeId?: string;
  latitude: number;
  longitude: number;
}

export type ReverseGeocodeResult =
  | { ok: true; address: ResolvedAddress }
  | {
      ok: false;
      error:
        | 'no_result'
        | 'key_missing'      // GOOGLE_MAPS_API_KEY empty / not baked into APK
        | 'key_rejected'     // Google returned REQUEST_DENIED — restrictions wrong
        | 'over_limit'       // OVER_QUERY_LIMIT — billing / quota issue
        | 'network'
        | 'timeout'
        | 'invalid_response';
      message?: string;
    };

interface GeocodeResponse {
  status: string;
  error_message?: string;
  results?: Array<{
    place_id?: string;
    formatted_address?: string;
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    geometry?: {
      location?: { lat: number; lng: number };
    };
  }>;
}

/**
 * Round to 4 decimals (~11 m). At GPS accuracy of ~5 m the same physical
 * spot produces a stable cache key on repeat detection.
 */
function cacheKey(lat: number, lng: number): string {
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return `${r(lat)},${r(lng)}`;
}

interface CacheEntry {
  at: number;            // epoch ms
  address: ResolvedAddress;
}

let memCache: Map<string, CacheEntry> | null = null;

async function loadCache(): Promise<Map<string, CacheEntry>> {
  if (memCache) return memCache;
  memCache = new Map();
  try {
    const raw = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
      const now = Date.now();
      for (const [k, v] of Object.entries(parsed)) {
        if (v && now - v.at < CACHE_TTL_MS) {
          memCache.set(k, v);
        }
      }
    }
  } catch {
    // corrupt cache — start clean
  }
  return memCache;
}

async function persistCache(): Promise<void> {
  if (!memCache) return;
  try {
    // Trim oldest entries if we exceed the cap (LRU-ish on insertion order).
    if (memCache.size > CACHE_MAX_ENTRIES) {
      const overflow = memCache.size - CACHE_MAX_ENTRIES;
      const keys = [...memCache.keys()].slice(0, overflow);
      keys.forEach(k => memCache!.delete(k));
    }
    const obj: Record<string, CacheEntry> = {};
    memCache.forEach((v, k) => {
      obj[k] = v;
    });
    await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // best-effort
  }
}

function pick(
  components: NonNullable<GeocodeResponse['results']>[number]['address_components'],
  ...types: string[]
): string | undefined {
  if (!components) return undefined;
  for (const t of types) {
    const found = components.find(c => c.types.includes(t));
    if (found) return found.long_name;
  }
  return undefined;
}

function parseResults(
  json: GeocodeResponse,
  fallbackLat: number,
  fallbackLng: number,
): ResolvedAddress | null {
  const result = json.results?.[0];
  if (!result?.address_components) return null;
  const c = result.address_components;
  const pincode = pick(c, 'postal_code');
  if (!pincode) return null; // no pincode → useless for serviceability check
  return {
    pincode,
    city:
      pick(c, 'locality', 'postal_town', 'administrative_area_level_2', 'sublocality_level_1') ?? undefined,
    state: pick(c, 'administrative_area_level_1'),
    country: pick(c, 'country'),
    area:
      pick(c, 'sublocality_level_2', 'sublocality_level_1', 'sublocality', 'neighborhood') ?? undefined,
    road: pick(c, 'route'),
    formatted: result.formatted_address,
    placeId: result.place_id,
    latitude: result.geometry?.location?.lat ?? fallbackLat,
    longitude: result.geometry?.location?.lng ?? fallbackLng,
  };
}

function getApiKey(): string {
  return (Config.GOOGLE_MAPS_API_KEY as string | undefined) ?? '';
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  const cache = await loadCache();
  const key = cacheKey(lat, lng);
  const hit = cache.get(key);
  if (hit) {
    return { ok: true, address: hit.address };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    // The .env value never made it into the APK. Most common cause:
    // someone updated `.env` but didn't run `cd android && ./gradlew clean`
    // before the next `npm run android`, so dotenv.gradle is reusing
    // the previous build's snapshot.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[geocode] GOOGLE_MAPS_API_KEY is empty at runtime. Rebuild Android after editing .env.',
      );
    }
    return {
      ok: false,
      error: 'key_missing',
      message: 'GOOGLE_MAPS_API_KEY not bundled into APK — rebuild required.',
    };
  }
  if (__DEV__) {
    // Log the FIRST 8 chars only — never the full key — so we can confirm
    // the right key made it into the build. Visible in `adb logcat`.
    // eslint-disable-next-line no-console
    console.log(`[geocode] using key ${apiKey.slice(0, 8)}…`);
  }

  const url = `${GEOCODE_URL}?latlng=${encodeURIComponent(
    `${lat},${lng}`,
  )}&key=${encodeURIComponent(apiKey)}&language=en`;

  // 8s manual timeout — `fetch` doesn't have one by default.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === 'AbortError') {
      return { ok: false, error: 'timeout' };
    }
    return { ok: false, error: 'network', message: e?.message };
  }
  clearTimeout(timer);

  if (!res.ok) {
    return { ok: false, error: 'network', message: `HTTP ${res.status}` };
  }

  let json: GeocodeResponse;
  try {
    json = (await res.json()) as GeocodeResponse;
  } catch {
    return { ok: false, error: 'invalid_response' };
  }

  switch (json.status) {
    case 'OK':
      break;
    case 'ZERO_RESULTS':
      return { ok: false, error: 'no_result' };
    case 'OVER_QUERY_LIMIT':
      return { ok: false, error: 'over_limit', message: json.error_message };
    case 'REQUEST_DENIED':
    case 'INVALID_REQUEST':
      // Common causes:
      //  • API key restrictions don't include Geocoding API
      //  • Geocoding API not enabled on the GCP project
      //  • SHA-1 in the key restriction doesn't match the APK's signing cert
      //  • Package name in restriction doesn't match `com.rythubiddamobile`
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(`[geocode] Google rejected key: ${json.error_message ?? json.status}`);
      }
      return { ok: false, error: 'key_rejected', message: json.error_message };
    default:
      return {
        ok: false,
        error: 'invalid_response',
        message: `${json.status}: ${json.error_message ?? ''}`,
      };
  }

  const address = parseResults(json, lat, lng);
  if (!address) {
    return { ok: false, error: 'no_result', message: 'No pincode at this location' };
  }

  // Cache the win.
  cache.set(key, { at: Date.now(), address });
  void persistCache();

  return { ok: true, address };
}

/**
 * Forward-geocode: typed-address text → lat/lng + structured address.
 *
 * Used when a user fills the AddEditAddress form manually (without using
 * the GPS button) and we still want lat/lng on the saved row so the
 * distance-based shipping calculator on the backend can run.
 *
 * Cost: same per-request rate as reverseGeocode. We only call it once per
 * address save when the form has no lat/lng yet — so well under the daily
 * cap. India is biased via `region=in` and `components=country:IN`.
 *
 * Caller should pass a reasonable composite string like
 *   "Plot 42, Kukatpally Housing Board, Hyderabad, Telangana 500072".
 * Empty / very short strings short-circuit to no_result without a request.
 */
export async function forwardGeocode(
  addressText: string,
): Promise<ReverseGeocodeResult> {
  const trimmed = addressText.trim();
  if (trimmed.length < 8) {
    return { ok: false, error: 'no_result' };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[geocode] GOOGLE_MAPS_API_KEY is empty at runtime — cannot forward-geocode.',
      );
    }
    return {
      ok: false,
      error: 'key_missing',
      message: 'GOOGLE_MAPS_API_KEY not bundled into APK — rebuild required.',
    };
  }

  const params = new URLSearchParams({
    address: trimmed,
    key: apiKey,
    region: 'in',
    components: 'country:IN',
    language: 'en',
  });
  const url = `${GEOCODE_URL}?${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === 'AbortError') return { ok: false, error: 'timeout' };
    return { ok: false, error: 'network', message: e?.message };
  }
  clearTimeout(timer);

  if (!res.ok) {
    return { ok: false, error: 'network', message: `HTTP ${res.status}` };
  }

  let json: GeocodeResponse;
  try {
    json = (await res.json()) as GeocodeResponse;
  } catch {
    return { ok: false, error: 'invalid_response' };
  }

  switch (json.status) {
    case 'OK':
      break;
    case 'ZERO_RESULTS':
      return { ok: false, error: 'no_result' };
    case 'OVER_QUERY_LIMIT':
      return { ok: false, error: 'over_limit', message: json.error_message };
    case 'REQUEST_DENIED':
    case 'INVALID_REQUEST':
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(`[geocode] Google rejected key (forward): ${json.error_message ?? json.status}`);
      }
      return { ok: false, error: 'key_rejected', message: json.error_message };
    default:
      return {
        ok: false,
        error: 'invalid_response',
        message: `${json.status}: ${json.error_message ?? ''}`,
      };
  }

  // Use the geometry's lat/lng as authoritative — caller has nothing else.
  const result = json.results?.[0];
  const loc = result?.geometry?.location;
  if (!result || !loc) return { ok: false, error: 'no_result' };

  const address = parseResults(json, loc.lat, loc.lng);
  if (!address) {
    return { ok: false, error: 'no_result', message: 'No pincode at this location' };
  }
  return { ok: true, address };
}
