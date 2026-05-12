import { apiGet } from '../client';
import { ENDPOINTS } from '../../constants/endpoints';
import type { ShippingConfig, DeliveryCenter } from '../../types';

/**
 * Shipping/delivery-config service.
 *
 * Mobile fetches the active delivery centers + global shipping defaults
 * once on app launch and caches in `useDeliveryCenterStore`. This keeps
 * mobile's distance-based calculator in sync with the backend's
 * `delivery_center` table — no need to redeploy the APK when stores are
 * added, repositioned, or repriced.
 */
export const shippingService = {
  /**
   * GET /api/v1/shop/delivery-centers
   *
   * Returns `{ centers, perKmRate, freeAboveCartAmount }`. The response
   * envelope is auto-unwrapped by the axios client so this method
   * resolves directly to the shape above.
   */
  config: async (): Promise<ShippingConfig> => {
    const raw = await apiGet<any>(ENDPOINTS.DELIVERY_CENTERS);
    // Normalise — backend returns Java Doubles which deserialize as
    // `number` on the wire. Coerce + clamp to defaults if a field is
    // unexpectedly absent so a partial response doesn't break shipping.
    const centers: DeliveryCenter[] = Array.isArray(raw?.centers)
      ? raw.centers.map((c: any) => ({
          id: Number(c?.id ?? 0),
          name: String(c?.name ?? ''),
          latitude: Number(c?.latitude),
          longitude: Number(c?.longitude),
          maxRadiusKm: Number(c?.maxRadiusKm ?? 60),
          perKmRate:
            c?.perKmRate == null || c?.perKmRate === ''
              ? null
              : Number(c.perKmRate),
        }))
      : [];
    return {
      centers,
      perKmRate: Number(raw?.perKmRate ?? 10),
      freeAboveCartAmount: Number(raw?.freeAboveCartAmount ?? 1000),
    };
  },
};
