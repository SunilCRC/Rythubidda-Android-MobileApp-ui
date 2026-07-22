/**
 * Google Distance Matrix API — driving distance between two WGS84 points.
 *
 * Design rules that make the shipping fee DETERMINISTIC for the same
 * (origin, destination):
 *
 *   1. Retry with exponential backoff (up to 3 attempts) before giving
 *      up on the API. Transient network blips no longer flip the app
 *      into the Haversine × 1.4 fallback path — which is the root
 *      cause of "same address, different fee on reload".
 *
 *   2. SUCCESSFUL API results are persisted to AsyncStorage (30-day
 *      TTL). Once we've resolved a (origin, dest) pair once, every
 *      future reload / cold start returns the exact same km and thus
 *      the exact same fee. No more inter-session drift.
 *
 *   3. Haversine × 1.4 fallback is NEVER cached. If the API failed
 *      this time, next call retries the API instead of locking in
 *      the estimate. This is what stops the "one bad session poisons
 *      the price forever" failure mode.
 *
 * Cost discipline: Distance Matrix ($5 per 1000 elements, first 40 000
 * free/month). The persistent cache means a customer with 3 saved
 * addresses costs 3 API calls total, ever — not 3 per checkout.
 *
 * Requires: **Distance Matrix API** enabled in GCP on the same key
 * as Geocoding/Places/Maps SDK.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { haversineKm } from './mobileShipping';

const URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const TIMEOUT_MS = 8000;

/** Retry policy. */
const MAX_ATTEMPTS = 3;
/** Backoff between attempts (ms). Index i is the sleep BEFORE attempt i+1. */
const BACKOFF_MS = [0, 500, 1500];

/** Persistent-cache config. */
const STORAGE_KEY = 'rb_distance_cache_v1';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CACHE_MAX_ENTRIES = 200;

/**
 * Empirical multiplier from Haversine → driving distance for Indian
 * urban areas. 1.4 is the mid-point of typical Hyderabad routes
 * (range observed: 1.3 → 1.6). Used ONLY as a fallback when every
 * retry of the real API call has failed.
 */
const HAVERSINE_TO_DRIVING_MULTIPLIER = 1.4;

export type DistanceSource = 'driving' | 'estimated';

export interface DistanceResult {
  km: number;
  source: DistanceSource;
  /** Driving duration in seconds — only present when source='driving'. */
  durationSec?: number;
}

interface CacheEntry {
  km: number;
  durationSec?: number;
  /** Epoch ms — used for TTL check. */
  at: number;
}

/**
 * In-memory tier of the cache — populated from AsyncStorage on first
 * access. Sync reads after that avoid disk hits inside the hot
 * shipping-calc path.
 */
let memCache: Map<string, CacheEntry> | null = null;

function cacheKey(a: number, b: number, c: number, d: number): string {
  // ~11 m precision — collapses repeated lookups for the same address.
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return `${r(a)},${r(b)}|${r(c)},${r(d)}`;
}

async function loadCache(): Promise<Map<string, CacheEntry>> {
  if (memCache) return memCache;
  memCache = new Map();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
      const now = Date.now();
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v.km === 'number' && now - v.at < CACHE_TTL_MS) {
          memCache.set(k, v);
        }
      }
    }
  } catch {
    // Corrupt cache blob — start with an empty cache. Not fatal.
  }
  return memCache;
}

async function persistCache(): Promise<void> {
  if (!memCache) return;
  try {
    // Simple LRU-ish cap on insertion order — drop oldest keys first.
    if (memCache.size > CACHE_MAX_ENTRIES) {
      const overflow = memCache.size - CACHE_MAX_ENTRIES;
      const keys = [...memCache.keys()].slice(0, overflow);
      keys.forEach(k => memCache!.delete(k));
    }
    const obj: Record<string, CacheEntry> = {};
    memCache.forEach((v, k) => {
      obj[k] = v;
    });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Best-effort — persistence failure doesn't break the caller.
  }
}

function fallback(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number,
): DistanceResult {
  const straight = haversineKm(oLat, oLng, dLat, dLng);
  return {
    km: straight * HAVERSINE_TO_DRIVING_MULTIPLIER,
    source: 'estimated',
  };
}

interface DMResponse {
  status?: string;
  error_message?: string;
  rows?: Array<{
    elements?: Array<{
      status?: string;
      distance?: { value?: number };
      duration?: { value?: number };
    }>;
  }>;
}

/**
 * Result of one raw API attempt.
 *
 *   { ok: true, km, durationSec } — API returned a usable distance
 *   { ok: false, retriable: true } — transient (network / 5xx / timeout)
 *   { ok: false, retriable: false } — permanent (bad key, ZERO_RESULTS)
 */
type AttemptResult =
  | { ok: true; km: number; durationSec?: number }
  | { ok: false; retriable: boolean; reason: string };

async function attemptOnce(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  apiKey: string,
): Promise<AttemptResult> {
  const params = new URLSearchParams({
    origins: `${originLat},${originLng}`,
    destinations: `${destLat},${destLng}`,
    units: 'metric',
    mode: 'driving',
    key: apiKey,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } catch (e: any) {
    clearTimeout(timer);
    // AbortError (timeout) and generic network failures are both
    // transient — the next retry has a decent chance of succeeding.
    return {
      ok: false,
      retriable: true,
      reason: `${e?.name ?? 'unknown'}: ${e?.message ?? ''}`,
    };
  }
  clearTimeout(timer);

  if (res.status >= 500 && res.status < 600) {
    return { ok: false, retriable: true, reason: `HTTP ${res.status}` };
  }
  if (!res.ok) {
    // 4xx = client error → permanent, not worth retrying.
    return { ok: false, retriable: false, reason: `HTTP ${res.status}` };
  }

  let json: DMResponse;
  try {
    json = (await res.json()) as DMResponse;
  } catch {
    return { ok: false, retriable: true, reason: 'invalid_json' };
  }

  if (json.status && json.status !== 'OK') {
    // OVER_QUERY_LIMIT is technically transient (quota resets) but
    // retrying inside the same request tight loop won't help. Treat as
    // permanent for this call; caller falls back once and moves on.
    const permanent = json.status === 'REQUEST_DENIED' ||
      json.status === 'INVALID_REQUEST' ||
      json.status === 'MAX_ELEMENTS_EXCEEDED';
    return {
      ok: false,
      retriable: !permanent,
      reason: `${json.status}: ${json.error_message ?? ''}`,
    };
  }

  const elem = json.rows?.[0]?.elements?.[0];
  if (!elem || elem.status !== 'OK' || typeof elem.distance?.value !== 'number') {
    return { ok: false, retriable: false, reason: `element status=${elem?.status ?? 'missing'}` };
  }

  return {
    ok: true,
    km: elem.distance.value / 1000,
    durationSec: elem.duration?.value,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Driving distance from origin (warehouse) to destination (customer)
 * in km. NEVER throws — always returns a usable number.
 *
 * Determinism guarantees:
 *   • Same (origin, dest) → same km, across reloads and cold starts,
 *     once any single successful API call has landed
 *   • Retries up to 3× with backoff before falling back to Haversine
 *   • Fallback (`source: 'estimated'`) is NEVER cached, so a failed
 *     session doesn't poison future sessions
 */
export async function getDrivingDistanceKm(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<DistanceResult> {
  const key = cacheKey(originLat, originLng, destLat, destLng);
  const cache = await loadCache();
  const hit = cache.get(key);
  if (hit) {
    return { km: hit.km, source: 'driving', durationSec: hit.durationSec };
  }

  const apiKey = (Config.GOOGLE_MAPS_API_KEY as string | undefined) ?? '';
  if (!apiKey) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[distance] GOOGLE_MAPS_API_KEY is empty — using Haversine × 1.4 estimate.',
      );
    }
    return fallback(originLat, originLng, destLat, destLng);
  }

  let lastReason = '';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt] > 0) await sleep(BACKOFF_MS[attempt]);
    const r = await attemptOnce(originLat, originLng, destLat, destLng, apiKey);
    if (r.ok) {
      const entry: CacheEntry = { km: r.km, durationSec: r.durationSec, at: Date.now() };
      cache.set(key, entry);
      void persistCache();
      return { km: r.km, source: 'driving', durationSec: r.durationSec };
    }
    lastReason = r.reason;
    if (!r.retriable) break; // permanent error — no point retrying
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        `[distance] Attempt ${attempt + 1}/${MAX_ATTEMPTS} failed: ${r.reason}. ${attempt + 1 < MAX_ATTEMPTS ? 'Retrying…' : 'Giving up.'}`,
      );
    }
  }

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      `[distance] All ${MAX_ATTEMPTS} attempts failed (last: ${lastReason}). Using Haversine × 1.4 estimate — NOT cached, will retry API on next call.`,
    );
  }
  return fallback(originLat, originLng, destLat, destLng);
}

/**
 * Debug/dev helper — wipe the persistent cache. Handy when a delivery
 * center moves or the per-km rate changes and you want to force a
 * fresh API round-trip everywhere.
 */
export async function clearDistanceCache(): Promise<void> {
  memCache = new Map();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort
  }
}
