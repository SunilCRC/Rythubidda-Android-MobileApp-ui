import { apiClient } from '../client';
import { ENDPOINTS } from '../../constants/endpoints';
import type { PaymentMethod, RazorpayOrderConfig } from '../../types';

/**
 * Payment endpoints live on legacy `/shop/*` paths and return raw JSON
 * (not the `{success, message, data}` envelope). We use the axios client
 * directly so we can read the raw body.
 */

/** Online payment methods the checkout page offers (sent to the gateway as a hint). */
export type OnlineMethod = 'upi' | 'card' | 'netbanking' | 'wallet';

async function postRaw<T>(url: string, params: Record<string, unknown>): Promise<T> {
  const res = await apiClient.post<T>(url, undefined, { params });
  return res.data;
}

export const paymentService = {
  createRazorpayOrder: (cartId: string | number) =>
    postRaw<RazorpayOrderConfig>(ENDPOINTS.RAZORPAY_CREATE_ORDER, { cartId }),

  verifyRazorpay: (params: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    cartId: string | number;
  }) =>
    postRaw<{ status: string; redirect?: string; message?: string }>(
      ENDPOINTS.RAZORPAY_VERIFY,
      params,
    ),

  cancelRazorpay: (razorpay_order_id: string, cartId: string | number) =>
    postRaw<{ status: string; message?: string; redirect?: string }>(
      ENDPOINTS.RAZORPAY_CANCEL,
      { razorpay_order_id, cartId },
    ),

  failRazorpay: (params: {
    razorpay_order_id: string;
    cartId: string | number;
    error_code?: string;
    error_description?: string;
  }) =>
    postRaw<{ status: string; message?: string; redirect?: string }>(
      ENDPOINTS.RAZORPAY_FAIL,
      params,
    ),

  /**
   * Which gateway checkout should open - the server decides. Any failure
   * (older backend without this endpoint, network) falls back to Razorpay so
   * the existing flow keeps working.
   */
  getGateway: async (): Promise<{ gateway: 'RAZORPAY' | 'CASHFREE'; cashfreeMode: 'sandbox' | 'production'; codEnabled: boolean }> => {
    try {
      const res = await apiClient.get<any>(ENDPOINTS.PAYMENT_GATEWAY);
      const d = res.data || {};
      return {
        gateway: d.gateway === 'CASHFREE' ? 'CASHFREE' : 'RAZORPAY',
        cashfreeMode: d.cashfreeMode === 'production' ? 'production' : 'sandbox',
        codEnabled: d.codEnabled === true,
      };
    } catch {
      return { gateway: 'RAZORPAY', cashfreeMode: 'sandbox', codEnabled: false };
    }
  },

  /** `method` makes the Cashfree screen open on that payment method (upi / card / netbanking / wallet). */
  createCashfreeOrder: (cartId: string | number, method?: OnlineMethod) =>
    postRaw<{
      order_id?: string;
      payment_session_id?: string;
      amount?: number;
      mode?: 'sandbox' | 'production';
      error?: string;
    }>(ENDPOINTS.CASHFREE_CREATE_ORDER, method ? { cartId, method } : { cartId }),

  /** Server re-checks the order with Cashfree; the app's own result is never trusted. */
  verifyCashfree: (order_id: string, cartId: string | number) =>
    postRaw<{ status: 'success' | 'pending' | 'error'; message?: string }>(
      ENDPOINTS.CASHFREE_VERIFY,
      { order_id, cartId },
    ),

  cancelCashfree: (order_id: string) =>
    postRaw<{ status: string }>(ENDPOINTS.CASHFREE_CANCEL, { order_id }).catch(() => undefined),

  createOrder: (cartId: string | number, paymentType: PaymentMethod) =>
    postRaw<{ status: string }>(ENDPOINTS.CREATE_ORDER, { cartId, paymentType }),

  updateCartAddress: (cartId: string | number, addressId: number) =>
    postRaw<{ status: string }>(ENDPOINTS.UPDATE_CART_ADDRESS, { cartId, addressId }),
};
