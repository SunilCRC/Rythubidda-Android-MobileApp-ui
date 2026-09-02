/**
 * Mobile-side shipping calculator.
 *
 * Inputs:
 *   - customer's lat/lng (from address.latitude/longitude, set when the
 *     address was saved via GPS or backfilled by Google forward-geocode)
 *   - cart subtotal (drives the free-shipping check)
 *   - the list of active delivery centers fetched from the backend on
 *     app launch (so this stays in sync with the `delivery_center` table)
 *   - global perKmRate + freeAboveCartAmount (from the same fetch)
 *
 * Strategy: find the NEAREST active center → if customer is within that
 * center's max radius, compute cost = perKmRate × distance. If the
 * customer is outside every center's radius, mark out-of-range.
 *
 * Fallback: when `centers` is empty/undefined (offline, first launch
 * before the fetch resolved, server down), we use the hardcoded
 * `SHIPPING_CONFIG` as a single-store fallback. App still works in
 * degraded mode.
 */

import { SHIPPING_CONFIG } from '../constants/shipping';
import type { DeliveryCenter, ShippingBand } from '../types';

export interface ShippingResult {
  /** True when the customer is inside the nearest store's radius. */
  applicable: boolean;
  /** Haversine distance (km) to the nearest store. */
  distanceKm: number;
  /** Shipping cost in ₹. 0 when applicable=false OR free shipping. */
  cost: number;
  /** True when subtotal hit the free-shipping threshold. */
  isFree: boolean;
  /** Name of the nearest store — surfaced as "X km from <NAME>". */
  centerName: string;
  /**
   * Coords of the nearest center — callers fetch driving distance to
   * THIS specific point so the user-facing "X km from <store>" line
   * matches what Google Maps shows for the same route. Without
   * exposing these, the caller would have to re-implement
   * nearest-center selection.
   */
  centerLat?: number;
  centerLng?: number;
  /**
   * Per-km rate that was actually applied (after per-center override
   * + global fallback resolution). Exposed so the caller can
   * recompute cost when it swaps Haversine distance for driving
   * distance.
   */
  ratePerKm?: number;
}

/** Great-circle distance between two WGS84 points (km). */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Pure function — no side effects, no network. Safe to call on every
 * render or address change.
 *
 * @param centers              Active centers from `useDeliveryCenterStore`.
 *                             If empty / undefined, falls back to a single
 *                             synthetic center built from SHIPPING_CONFIG.
 * @param globalPerKmRate      Global ₹/km from backend. Used when a center
 *                             has no `perKmRate` override.
 * @param freeAboveCartAmount  Cart-subtotal threshold for free shipping.
 */
export function calculateShippingMobile(
  customerLat: number,
  customerLng: number,
  subtotal: number,
  centers?: DeliveryCenter[],
  globalPerKmRate?: number,
  freeAboveCartAmount?: number,
  bands?: ShippingBand[],
): ShippingResult {
  // Resolve the candidate list. If none provided, use the hardcoded
  // fallback so the app still works before the splash fetch completes.
  const usable: DeliveryCenter[] =
    centers && centers.length > 0
      ? centers
      : [
          {
            id: 0,
            name: SHIPPING_CONFIG.warehouseName,
            latitude: SHIPPING_CONFIG.warehouseLat,
            longitude: SHIPPING_CONFIG.warehouseLng,
            maxRadiusKm: SHIPPING_CONFIG.maxRadiusKm,
            perKmRate: null,
          },
        ];

  // Find the nearest center.
  let nearest = usable[0];
  let minDistance = Infinity;
  for (const c of usable) {
    const d = haversineKm(c.latitude, c.longitude, customerLat, customerLng);
    if (d < minDistance) {
      minDistance = d;
      nearest = c;
    }
  }

  // Per-store rate beats global rate beats the hardcoded constant.
  const rate =
    typeof nearest.perKmRate === 'number'
      ? nearest.perKmRate
      : globalPerKmRate ?? SHIPPING_CONFIG.perKmRate;

  // Out of range: customer is farther than the NEAREST store's radius.
  if (minDistance > nearest.maxRadiusKm) {
    return {
      applicable: false,
      distanceKm: minDistance,
      cost: 0,
      isFree: false,
      centerName: nearest.name,
      centerLat: nearest.latitude,
      centerLng: nearest.longitude,
      ratePerKm: rate,
    };
  }

  // Free-shipping policy. Distance-banded when the admin has bands
  // configured (mirrors the backend ShippingCalculator: band matched on
  // km, fee capped at the real per-km price); legacy single threshold
  // otherwise. A distance BEYOND the last band gets NO free threshold —
  // the admin's rules end at the last band's maxKm, so the full per-km
  // fee applies (matches the backend's order-#386 fix). This is an
  // ESTIMATE for display before the backend quote arrives — the server
  // remains the charging authority.
  const fullFee = Math.round(rate * minDistance);
  let threshold: number | null =
    freeAboveCartAmount ?? SHIPPING_CONFIG.freeAboveCartAmount;
  let feeAboveThreshold = 0;

  if (bands && bands.length > 0) {
    let band = bands.find(b => minDistance >= b.minKm && minDistance < b.maxKm);
    if (!band && minDistance < bands[0].minKm) {
      band = bands[0];
    }
    threshold = band ? band.freeAboveAmount : null;
    feeAboveThreshold = band ? (band.feeAboveThreshold ?? 0) : 0;
  }

  if (threshold != null && threshold > 0 && subtotal >= threshold) {
    const charged = Math.min(Math.round(feeAboveThreshold), fullFee);
    return {
      applicable: true,
      distanceKm: minDistance,
      cost: charged,
      isFree: charged === 0,
      centerName: nearest.name,
      centerLat: nearest.latitude,
      centerLng: nearest.longitude,
      ratePerKm: rate,
    };
  }

  return {
    applicable: true,
    distanceKm: minDistance,
    cost: Math.round(rate * minDistance),
    isFree: false,
    centerName: nearest.name,
    centerLat: nearest.latitude,
    centerLng: nearest.longitude,
    ratePerKm: rate,
  };
}
