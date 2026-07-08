/**
 * Google Distance Matrix API — driving distance between two WGS84 points.
 *
 * Why: Haversine (great-circle) gives "as the crow flies" distance which
 * for Indian urban areas is typically 1.3×–1.6× SHORTER than the actual
 * road distance Google Maps shows users. For a delivery business this
 * matters in three ways:
 *
 *   1. UI honesty — the "X km from <warehouse>" line at checkout should
 *      match what the customer sees if they open Google Maps directions
 *      to our store. Otherwise we look broken / cheap.
 *   2. Shipping price — perKmRate × straight_line underprices long
 *      routes by up to 60%, eating into margin.
 *   3. Serviceability — a 60 km straight-line radius allows ~95 km of
 *      actual driving, which kills next-day fresh-produce SLAs.
 *
 * Distance Matrix API pricing (Mar 2026): $5 per 1000 elements. The
 * first 40 000 elements/month are free under Google's recurring
 * credit. We cache aggressively (in-memory by lat/lng rounded to 4
 * decimals, ≈ 11 m precision) so a customer pinning the same address
 * over and over costs at most 1 call.
 *
 * Failure modes — every one falls back to `Haversine × 1.4` so checkout
 * still works (you just lose some accuracy):
 *   • API key missing in build → fallback
 *   • Distance Matrix API not enabled in GCP → fallback
 *   • Network failure / timeout → fallback
 *   • Google returns ZERO_RESULTS / NOT_FOUND → fallback
 *
 * NOTE: requires **Distance Matrix API** enabled on the same GCP key
 * as Geocoding/Places/Maps SDK. Enable it once in the GCP console;
 * billing must be on.
 */

import Config from 'react-native-config';
import { haversineKm } from './mobileShipping';

const URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const TIMEOUT_MS = 8000;

/**
 * Empirical multiplier from Haversine → driving distance for Indian
 * urban areas. 1.4 is the mid-point of typical Hyderabad routes
 * (range observed: 1.3 → 1.6). Used only as a fallback when the
 * Distance Matrix API call fails; the real API call is always tried
 * first.
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
}
const cache = new Map<string, CacheEntry>();

function cacheKey(a: number, b: number, c: number, d: number): string {
  // ~11 m precision — collapses repeated lookups for the same address.
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return `${r(a)},${r(b)}|${r(c)},${r(d)}`;
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
 * Driving distance from origin (warehouse) to destination (customer)
 * in km. NEVER throws — always returns a usable number. Caller can
 * differentiate via `source` to (optionally) tell the user the estimate
 * is approximate.
 */
export async function getDrivingDistanceKm(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<DistanceResult> {
  const key = cacheKey(originLat, originLng, destLat, destLng);
  const cached = cache.get(key);
  if (cached) {
    return { km: cached.km, source: 'driving', durationSec: cached.durationSec };
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
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        `[distance] Distance Matrix fetch failed (${e?.name ?? 'unknown'}: ${e?.message}). Falling back to estimate.`,
      );
    }
    return fallback(originLat, originLng, destLat, destLng);
  }
  clearTimeout(timer);

  if (!res.ok) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[distance] Distance Matrix HTTP ${res.status} — falling back.`);
    }
    return fallback(originLat, originLng, destLat, destLng);
  }

  let json: DMResponse;
  try {
    json = (await res.json()) as DMResponse;
  } catch {
    return fallback(originLat, originLng, destLat, destLng);
  }

  if (json.status && json.status !== 'OK') {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        `[distance] Distance Matrix status=${json.status}: ${json.error_message ?? ''}`,
      );
    }
    return fallback(originLat, originLng, destLat, destLng);
  }

  const elem = json.rows?.[0]?.elements?.[0];
  if (!elem || elem.status !== 'OK' || typeof elem.distance?.value !== 'number') {
    return fallback(originLat, originLng, destLat, destLng);
  }

  const km = elem.distance.value / 1000;
  const durationSec = elem.duration?.value;
  cache.set(key, { km, durationSec });
  return { km, source: 'driving', durationSec };
}
