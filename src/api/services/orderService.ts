import { apiGet, apiPost, apiRaw } from '../client';
import { ENDPOINTS } from '../../constants/endpoints';
import type {
  InvoiceInfo,
  ReviewSubmission,
  SaleOrder,
  SaleOrderItem,
} from '../../types';

export const orderService = {
  list: (fdate?: string) =>
    apiGet<SaleOrder[]>(ENDPOINTS.ORDERS, {
      params: fdate ? { fdate } : undefined,
    }),

  detail: (orderId: number | string) =>
    apiGet<SaleOrder>(ENDPOINTS.ORDER_DETAIL(orderId)),

  saleItems: (orderId: number | string) =>
    apiRaw<SaleOrderItem[]>(ENDPOINTS.ORDER_SALE_ITEMS, {
      params: { id: orderId },
    }),

  reviewableItems: (orderId: number | string) =>
    apiRaw<SaleOrderItem[]>(ENDPOINTS.ORDER_REVIEW_ITEMS, {
      params: { id: orderId },
    }),

  submitReviews: (reviews: ReviewSubmission[]) =>
    apiPost<string>(ENDPOINTS.SUBMIT_REVIEWS, reviews),

  cancel: (orderId: number | string) =>
    apiPost<string>(ENDPOINTS.CANCEL_ORDER, undefined, {
      params: { orderId },
    }),

  invoice: (orderId: number | string) =>
    apiGet<InvoiceInfo>(ENDPOINTS.INVOICE(orderId)),
};
