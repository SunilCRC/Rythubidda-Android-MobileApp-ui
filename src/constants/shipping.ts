/**
 * Shipping config — mobile-side single source of truth.
 *
 * Mirrors the `delivery.center.*` and `shipping.*` properties in the
 * backend's application.properties. Mobile uses these to compute
 * distance + cost LOCALLY (Haversine) so the checkout UI is instant
 * and doesn't depend on a backend round-trip for display.
 *
 * IMPORTANT: keep these values in sync with the backend's
 * application.properties. If they drift, customer sees one cost in the
 * cart and a different one on the order receipt — bad.
 *
 * If you change pricing often, replace this with a runtime fetch from
 * a `/api/v1/shop/shipping/config` endpoint and cache the result.
 */
export const SHIPPING_CONFIG = {
  /** WGS84 latitude of the warehouse / fulfilment hub. */
  warehouseLat: 17.493244301928385,
  /** WGS84 longitude of the warehouse / fulfilment hub. */
  warehouseLng: 78.41158584975756,
  /** Display name shown in checkout ("12.4 km from <NAME>"). */
  warehouseName: 'RYTHUBIDDA NATURALS - DESI ORGANIC GROCERY STORE',
  /** Beyond this radius the address is "out of delivery range". */
  maxRadiusKm: 60,
  /** Per-km shipping rate in ₹. */
  perKmRate: 10,
  /**
   * Free shipping above this cart subtotal in ₹. Set to 0 to disable
   * (then shipping is always charged regardless of cart size).
   */
  freeAboveCartAmount: 1000,
};
