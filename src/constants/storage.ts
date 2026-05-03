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
  // Location feature (Google Maps stack)
  DELIVERY_LOCATION: 'rb_delivery_location',
  LOCATION_PRIMER_SEEN: 'rb_location_primer_seen',
  RECENT_LOCATIONS: 'rb_recent_locations',
};

export const KEYCHAIN_SERVICE = 'com.rythubidda.mobile.auth';
