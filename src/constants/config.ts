import Config from 'react-native-config';

/**
 * Runtime configuration. Values come from .env via react-native-config.
 * Fallbacks point at the production backend so the app works even if .env is missing.
 */

export const APP_CONFIG = {
  API_BASE_URL: Config.API_BASE_URL || 'https://rythubidda.com',
  API_TIMEOUT_MS: Number(Config.API_TIMEOUT_MS || 30000),
  ENV: Config.ENV || 'production',
  APP_NAME: 'Rythu Bidda',
  SUPPORT_EMAIL: 'admin@RythuBidda.com',
  WEB_URL: 'https://rythubidda.com',
  MIN_ORDER_FREE_SHIPPING: 1000,
  MAX_CART_ITEM_QTY: 10,
  OTP_LENGTH: 6,
  OTP_RESEND_SECONDS: 30,
  PINCODE_LENGTH: 6,
  PHONE_LENGTH: 10,
  PASSWORD_MIN_LENGTH: 8,
};

export const isDevelopment = APP_CONFIG.ENV === 'development';
export const isProduction = APP_CONFIG.ENV === 'production';
