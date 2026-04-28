import { apiGet, apiPost, apiRaw } from '../client';
import { ENDPOINTS } from '../../constants/endpoints';
import type {
  InvoiceInfo,
  ReviewItem,
  SaleOrder,
  SaleOrderItem,
} from '../../types';

export const orderService = {
  list: (fdate?: string) =>
    apiGet<SaleOrder[]>(ENDPOINTS.ORDERS, {
      params: fdate ? { fdate } : undefined,
    }),

  /**
   * The backend does NOT expose a dedicated `GET /orders/{id}` route — only
   * `GET /orders` (list) and `GET /viewSaleItems?id=…` exist (see
   * `ShopController#getCustomerOrders`). We therefore fetch the list (which
   * already contains every per-order field, including `shippingAddress`,
   * `billingAddress`, `subTotal`, `grandTotal`, `shippingAmount`, and
   * `totalItemCount`) and pick the requested order by id.
   *
   * The default 30-day window is tried first; if the order isn't there we
   * retry with `fdate=all` so older orders still resolve. Throws if the
   * order doesn't belong to the current customer (matching the previous
   * behaviour).
   */
  detail: async (orderId: number | string): Promise<SaleOrder> => {
    const target = String(orderId);
    const matches = (o: SaleOrder) =>
      String(o.entityId ?? '') === target ||
      String(o.orderId ?? '') === target ||
      String(o.incrementId ?? '') === target;

    let list = await orderService.list();
    let found = list.find(matches);
    if (!found) {
      // Fallback to the full history — the order may be older than 30 days.
      list = await orderService.list('all');
      found = list.find(matches);
    }
    if (!found) {
      throw {
        status: 404,
        message: 'Order not found',
      };
    }
    return found;
  },

  saleItems: (orderId: number | string) =>
    apiRaw<SaleOrderItem[]>(ENDPOINTS.ORDER_SALE_ITEMS, {
      params: { id: orderId },
    }),

  reviewableItems: (orderId: number | string) =>
    apiRaw<SaleOrderItem[]>(ENDPOINTS.ORDER_REVIEW_ITEMS, {
      params: { id: orderId },
    }),

  /**
   * Backend `POST /api/v1/shop/submitReviews` reads the request body as a
   * raw JSON string and `ObjectMapper.readValue`s it into `OrderReviewDTO`.
   * The expected shape is `{ orderId, reviews: ReviewItem[] }` — and crucially,
   * each review is keyed by `saleOrderItemId` (not productId) with the
   * rating sent as a string and the title as `headline`.
   *
   * The endpoint always returns HTTP 200 with a plain-text body — either
   * `"Success: N reviews saved"` or `"ERROR: …"`. We detect the latter
   * client-side and throw so the UI can surface the failure.
   */
  submitReviews: async (
    orderId: number,
    reviews: ReviewItem[],
  ): Promise<string> => {
    const result = await apiPost<string>(ENDPOINTS.SUBMIT_REVIEWS, {
      orderId,
      reviews,
    });
    if (typeof result === 'string' && /^\s*ERROR/i.test(result)) {
      throw { status: 500, message: result.replace(/^\s*ERROR:?\s*/i, '') };
    }
    return result;
  },

  cancel: (orderId: number | string) =>
    apiPost<string>(ENDPOINTS.CANCEL_ORDER, undefined, {
      params: { orderId },
    }),

  invoice: (orderId: number | string) =>
    apiGet<InvoiceInfo>(ENDPOINTS.INVOICE(orderId)),
};
