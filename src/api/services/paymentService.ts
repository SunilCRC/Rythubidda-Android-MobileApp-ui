import { apiClient } from '../client';
import { ENDPOINTS } from '../../constants/endpoints';
import type { PaymentMethod, RazorpayOrderConfig } from '../../types';

/**
 * Payment endpoints live on legacy `/shop/*` paths and return raw JSON
 * (not the `{success, message, data}` envelope). We use the axios client
 * directly so we can read the raw body.
 */

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

  createOrder: (cartId: string | number, paymentType: PaymentMethod) =>
    postRaw<{ status: string }>(ENDPOINTS.CREATE_ORDER, { cartId, paymentType }),

  updateCartAddress: (cartId: string | number, addressId: number) =>
    postRaw<{ status: string }>(ENDPOINTS.UPDATE_CART_ADDRESS, { cartId, addressId }),
};
