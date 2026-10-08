import { apiGet, apiPost } from '../client';
import { ENDPOINTS } from '../../constants/endpoints';
import type { MyCoupon, ShoppingCart } from '../../types';

/**
 * Customer coupons — assigned by the admin, redeemed at checkout.
 *
 * Every money rule lives on the server (coupon amount ≤ items subtotal,
 * second order onward, one use, never stacked with FIRST10). The app only
 * lists coupons and asks to attach/detach one; after that it re-reads
 * the cart so totals and the Razorpay amount follow the server.
 */
export interface MyCouponsResult {
  coupons: MyCoupon[];
  appliedCode: string | null;
  firstOrder: boolean;
}

export const couponService = {
  mine: async (cartId?: string | number | null): Promise<MyCouponsResult> => {
    const raw = await apiGet<any>(ENDPOINTS.COUPONS_MINE, {
      params: cartId ? { cartId: String(cartId) } : undefined,
    });
    const list: any[] = Array.isArray(raw?.coupons) ? raw.coupons : [];
    return {
      coupons: list
        .filter(c => c && c.code)
        .map(c => ({
          id: Number(c.id),
          code: String(c.code),
          title: String(c.title ?? ''),
          amount: Number(c.amount) || 0,
          minCartValue: Number(c.minCartValue ?? c.amount) || 0,
          expiresAt: c.expiresAt ?? null,
          // Device-clock expiry, anchored to the moment the server answered.
          expiresAtMs:
            c.secondsLeft === null || c.secondsLeft === undefined
              ? null
              : Date.now() + Number(c.secondsLeft) * 1000,
          state: c.state ?? 'READY',
          shortfall: Number(c.shortfall) || 0,
        })),
      appliedCode: raw?.appliedCode ?? null,
      firstOrder: !!raw?.firstOrder,
    };
  },

  apply: async (cartId: string | number, code: string): Promise<ShoppingCart | null> => {
    const raw = await apiPost<any>(ENDPOINTS.COUPONS_APPLY, { cartId: String(cartId), code });
    return raw?.shoppingCart ?? null;
  },

  remove: async (cartId: string | number): Promise<ShoppingCart | null> => {
    const raw = await apiPost<any>(ENDPOINTS.COUPONS_REMOVE, { cartId: String(cartId) });
    return raw?.shoppingCart ?? null;
  },
};
