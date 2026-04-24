/**
 * AsyncStorage keys (non-secret data).
 * Secret tokens go to Keychain via authStorage.ts.
 */
export const STORAGE_KEYS = {
  GUEST_CART_ID: 'rb_guest_cart_id',
  GUEST_CART: 'rb_guest_cart',
  RECENT_SEARCHES: 'rb_recent_searches',
  ONBOARDING_SEEN: 'rb_onboarding_seen',
  LAST_KNOWN_PINCODE: 'rb_last_known_pincode',
};

export const KEYCHAIN_SERVICE = 'com.rythubidda.mobile.auth';
