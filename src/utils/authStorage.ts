import * as Keychain from 'react-native-keychain';
import { KEYCHAIN_SERVICE } from '../constants/storage';

/**
 * Token storage. Uses device secure storage (Keychain on iOS, Keystore on Android).
 * Falls back to an in-memory cache so reads are fast within a session.
 */

let cachedToken: string | null = null;

export async function saveToken(token: string): Promise<void> {
  cachedToken = token;
  try {
    await Keychain.setGenericPassword('authToken', token, {
      service: KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  } catch (e) {
    // Keychain failure shouldn't crash the app — we still have the in-memory token.
    if (__DEV__) console.warn('[authStorage] saveToken failed', e);
  }
}

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    const creds = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    if (creds && creds.password) {
      cachedToken = creds.password;
      return cachedToken;
    }
  } catch (e) {
    if (__DEV__) console.warn('[authStorage] getToken failed', e);
  }
  return null;
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  } catch (e) {
    if (__DEV__) console.warn('[authStorage] clearToken failed', e);
  }
}

export function getCachedToken(): string | null {
  return cachedToken;
}
