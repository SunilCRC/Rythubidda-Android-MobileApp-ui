/**
 * Mobile-side shipping calculator.
 *
 * Why on mobile (not just calling backend)? — instant UI feedback. The
 * customer picks an address, the cost appears with no network round-trip.
 * Backend still gets the final cost via the existing calculate-shipping
 * endpoint at order time, so order persistence is unaffected.
 *
 * Inputs:
 *   - customer's lat/lng (from address.latitude/longitude — set when the
 *     address was saved with GPS, or backfilled by Google forward-geocode)
 *   - cart subtotal (drives the free-shipping check)
 *
 * Output: a Result describing the cost + the distance + a one-line
 * human-readable subtitle for the UI.
 */

import { SHIPPING_CONFIG } from '../constants/shipping';

export interface ShippingResult {
  /** True when the address is within the serviceable radius. */
  applicable: boolean;
  /** Haversine distance (km) from the warehouse. */
  distanceKm: number;
  /** Shipping cost in ₹. 0 when applicable=false OR free shipping. */
  cost: number;
  /** True when subtotal hit the free-shipping threshold. */
  isFree: boolean;
}

/**
 * Great-circle distance between two WGS84 points. Same formula the
 * backend uses (GeoDistance.haversineKm) — keeps mobile + backend
 * agreeing on the number to ~0.5% accuracy.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // mean earth radius in km
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
 * Compute shipping for a customer at (lat, lng) given the cart subtotal.
 * Pure function — no side effects, no network. Safe to call on every
 * render or address change.
 */
export function calculateShippingMobile(
  customerLat: number,
  customerLng: number,
  subtotal: number,
): ShippingResult {
  const distance = haversineKm(
    SHIPPING_CONFIG.warehouseLat,
    SHIPPING_CONFIG.warehouseLng,
    customerLat,
    customerLng,
  );

  if (distance > SHIPPING_CONFIG.maxRadiusKm) {
    return { applicable: false, distanceKm: distance, cost: 0, isFree: false };
  }

  const free =
    SHIPPING_CONFIG.freeAboveCartAmount > 0 &&
    subtotal >= SHIPPING_CONFIG.freeAboveCartAmount;
  if (free) {
    return { applicable: true, distanceKm: distance, cost: 0, isFree: true };
  }

  const cost = Math.round(SHIPPING_CONFIG.perKmRate * distance);
  return { applicable: true, distanceKm: distance, cost, isFree: false };
}
