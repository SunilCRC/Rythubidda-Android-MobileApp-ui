import { apiDelete, apiGet, apiPost, apiPut } from '../client';
import { ENDPOINTS } from '../../constants/endpoints';
import type {
  DeliveryInfo,
  ShippingCalcResult,
  ShoppingCart,
  ShoppingItem,
} from '../../types';

export const cartService = {
  getCart: () => apiGet<ShoppingCart>(ENDPOINTS.CART),

  addItem: (item: Partial<ShoppingItem>) =>
    apiPost<ShoppingCart>(ENDPOINTS.CART_ADD_ITEM, item),

  updateQuantity: (itemId: number | string, qty: number) =>
    apiPut<void>(ENDPOINTS.CART_UPDATE_QTY(itemId), undefined, {
      params: { qty },
    }),

  removeItem: (itemId: number | string) =>
    apiDelete<void>(ENDPOINTS.CART_REMOVE_ITEM(itemId)),

  clearCart: (cartId: number | string) =>
    apiDelete<void>(ENDPOINTS.CART_CLEAR(cartId)),

  calculateShipping: (cartId: number | string, zipcode: string, shippingCode?: string) =>
    apiGet<ShippingCalcResult>(ENDPOINTS.CART_CALCULATE_SHIPPING, {
      params: { cartId, zipcode, ...(shippingCode ? { shippingCode } : {}) },
    }),

  reviewOrder: (info: DeliveryInfo) =>
    apiPost<{
      shoppingCart: ShoppingCart;
      customerAddress: unknown;
      deliveryInfo: DeliveryInfo;
    }>(ENDPOINTS.CART_REVIEW_ORDER, info),

  checkProduct: (productId: number | string, qtyOptionId?: number | string) =>
    apiGet<ShoppingItem>(ENDPOINTS.CART_CHECK_PRODUCT, {
      params: { productId, ...(qtyOptionId ? { qtyOptionId } : {}) },
    }),
};
