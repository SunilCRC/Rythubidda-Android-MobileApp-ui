import Config from 'react-native-config';

/**
 * Runtime configuration. Values come from `.env` via `react-native-config`.
 *
 * The same APK works against either backend — production or local dev —
 * just by editing `.env` and rebuilding (or `gradlew clean && npm run android`
 * for Android-side env changes to take effect).
 *
 *   ─ Production:   API_BASE_URL=https://rythubidda.com
 *   ─ Emulator dev: API_BASE_URL=http://10.0.2.2:8080
 *                   (10.0.2.2 is the Android emulator's loopback to the host)
 *   ─ Physical dev: API_BASE_URL=http://<your-host-LAN-ip>:8080
 *                   e.g. http://192.168.1.42:8080  ← phone on same wifi
 *
 * Cleartext (http://) is allowed only in DEBUG builds — `gradle.properties`
 * sets `usesCleartextTraffic=true` for debug, `false` for release. So you
 * never accidentally ship an http URL in production.
 *
 * If `.env` is missing or `API_BASE_URL` is empty, we fall back to
 * production. That's the safer default — a missing env doesn't silently
 * point at someone's stale dev server.
 */

const DEFAULT_PROD_URL = 'https://rythubidda.com';

function pickApiBaseUrl(): string {
  const fromEnv = (Config.API_BASE_URL ?? '').trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, ''); // strip trailing slashes
  return DEFAULT_PROD_URL;
}

/**
 * Optional fallback URL used by the axios client when the primary URL
 * fails with a network error. Typical setup: primary = local dev backend
 * (http://10.0.2.2:8080), fallback = production. If local is down,
 * the app transparently switches to production for the rest of the
 * session — no manual `.env` editing.
 *
 * Only used when:
 *   - the primary call fails with a NETWORK error (not 4xx/5xx)
 *   - the fallback is set and differs from the primary
 *
 * Returns null when not configured (no fallback behaviour).
 */
function pickApiFallbackUrl(primary: string): string | null {
  const fromEnv = (Config.API_BASE_URL_FALLBACK ?? '').trim();
  const candidate = fromEnv ? fromEnv.replace(/\/+$/, '') : DEFAULT_PROD_URL;
  // Only enable fallback when it actually differs from the primary —
  // pointless to retry against the same URL.
  return candidate && candidate !== primary ? candidate : null;
}

const _primary = pickApiBaseUrl();

export const APP_CONFIG = {
  ENV: Config.ENV || 'production',
  API_BASE_URL: _primary,
  API_BASE_URL_FALLBACK: pickApiFallbackUrl(_primary),
  API_TIMEOUT_MS: Number(Config.API_TIMEOUT_MS || 30000),

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

// Helpful one-time log in dev. Two lines so we can tell the difference
// between "code resolved the wrong URL" (rare) and "APK has stale .env
// values baked in" (common — needs `gradlew clean && rebuild`).
if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log(
    `[config] RAW Config.API_BASE_URL = "${Config.API_BASE_URL ?? '(undefined)'}", ` +
      `Config.API_BASE_URL_FALLBACK = "${Config.API_BASE_URL_FALLBACK ?? '(undefined)'}"`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `[config] RESOLVED API_BASE_URL = ${APP_CONFIG.API_BASE_URL} (ENV=${APP_CONFIG.ENV})` +
      (APP_CONFIG.API_BASE_URL_FALLBACK
        ? ` · fallback = ${APP_CONFIG.API_BASE_URL_FALLBACK}`
        : ' · NO FALLBACK CONFIGURED'),
  );
}
