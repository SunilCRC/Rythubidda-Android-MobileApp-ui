/**
 * All backend endpoints — mirror of web app's usage.
 * Base URL is prefixed by the axios client.
 */

export const ENDPOINTS = {
  // Customer / auth
  SIGNUP: '/api/v1/customer/signup',
  LOGIN: '/api/v1/customer/login',
  LOGOUT: '/api/v1/customer/logout',
  VERIFY_OTP: '/api/v1/customer/verify-otp',
  RESEND_OTP: '/api/v1/customer/resend-otp',
  FORGOT_PASSWORD: '/api/v1/customer/forgot-password',
  FORGOT_PASSWORD_VERIFY_OTP: '/api/v1/customer/forgot-password/verify-otp',
  RESET_PASSWORD: '/api/v1/customer/reset-password',
  CHANGE_PASSWORD: '/api/v1/customer/change-password',
  PROFILE: '/api/v1/customer/profile',
  BILLING_ADDRESS: '/api/v1/customer/billing-address',
  SHIPPING_ADDRESS: '/api/v1/customer/shipping-address',

  // Shop / catalog (public)
  CATEGORIES: '/api/v1/shop/categories',
  FEATURED_PRODUCTS: '/api/v1/shop/products/featured',
  PRODUCTS_BY_CATEGORY: (categoryId: number | string) =>
    `/api/v1/shop/products/category/${categoryId}`,
  PRODUCT_DETAIL: (productId: number | string) =>
    `/api/v1/shop/product/${productId}`,
  SEARCH: '/api/v1/shop/search',
  SEARCH_SUGGESTIONS: '/api/v1/shop/search/suggestions',
  GALLERY_MAIN: '/api/v1/shop/gallery/main',
  BANNERS_ACTIVE: '/api/v1/shop/banners/active',
  PINCODE_VALIDATE: '/api/v1/shop/pincode/validate',

  // Cart
  CART: '/api/v1/shop/cart',
  CART_ADD_ITEM: '/api/v1/shop/cart/addItem',
  CART_UPDATE_QTY: (itemId: number | string) =>
    `/api/v1/shop/cart/item/${itemId}/quantity`,
  CART_REMOVE_ITEM: (itemId: number | string) =>
    `/api/v1/shop/cart/item/${itemId}`,
  CART_CLEAR: (cartId: number | string) => `/api/v1/shop/cart/${cartId}`,
  CART_CHECK_PRODUCT: '/api/v1/shop/cart/check-product',
  CART_CALCULATE_SHIPPING: '/api/v1/shop/cart/calculate-shipping',
  CART_REVIEW_ORDER: '/api/v1/shop/cart/review-order',

  // Addresses
  ADDRESSES: '/api/v1/shop/customer/addresses',
  ADDRESS_SAVE: '/api/v1/shop/customer/address',
  ADDRESS_UPDATE: '/api/v1/shop/customer/address',
  ADDRESS_DELETE: (id: number | string) =>
    `/api/v1/shop/customer/address/${id}`,

  // Orders
  ORDERS: '/api/v1/shop/orders',
  ORDER_DETAIL: (orderId: number | string) =>
    `/api/v1/shop/orders/${orderId}`,
  ORDER_SALE_ITEMS: '/api/v1/shop/viewSaleItems',
  ORDER_REVIEW_ITEMS: '/api/v1/shop/viewSubmitReviews',
  SUBMIT_REVIEWS: '/api/v1/shop/submitReviews',
  CANCEL_ORDER: '/api/v1/shop/cancelOrder',
  INVOICE: (orderId: number | string) => `/api/v1/shop/invoice/${orderId}`,

  // Payments (legacy /shop path)
  RAZORPAY_CREATE_ORDER: '/shop/razorpay/create-order',
  RAZORPAY_VERIFY: '/shop/razorpay/verify',
  RAZORPAY_CANCEL: '/shop/razorpay/cancel',
  RAZORPAY_FAIL: '/shop/razorpay/fail',
  CREATE_ORDER: '/shop/create-order',
  UPDATE_CART_ADDRESS: '/shop/updateCartAddress',
};
