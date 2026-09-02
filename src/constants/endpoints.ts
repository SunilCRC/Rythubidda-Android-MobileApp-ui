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

  // Account lifecycle — deactivate / delete / restore
  ACCOUNT_ELIGIBILITY: '/api/v1/customer/account/eligibility',
  ACCOUNT_OTP: '/api/v1/customer/account/otp',
  ACCOUNT_DEACTIVATE: '/api/v1/customer/account/deactivate',
  ACCOUNT_DELETE: '/api/v1/customer/account/delete',
  // No-token pair: restores a deactivated account at sign-in, and backs
  // the public web deletion page.
  ACCOUNT_RECOVERY_OTP: '/api/v1/customer/account/recovery/otp',
  ACCOUNT_RECOVERY_CONFIRM: '/api/v1/customer/account/recovery/confirm',

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
  TODAYS_DEAL_CURRENT: '/api/v1/shop/todays-deals/current',
  TODAYS_FARMER: '/api/v1/shop/farmers/todays-farmer',
  FARMER_DETAIL: (id: number | string) => `/api/v1/shop/farmers/${id}`,
  REVIEWS_APPROVED: '/api/v1/shop/reviews/approved',
  FIRST_ORDER_DISCOUNT: '/api/v1/shop/first-order-discount',
  SYNC_VERSION: '/api/v1/shop/sync-version',
  PINCODE_VALIDATE: '/api/v1/shop/pincode/validate',
  DELIVERY_CENTERS: '/api/v1/shop/delivery-centers',

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
