import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  BackHandler,
  Image,
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text } from './common';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { APP_CONFIG } from '../constants/config';

/**
 * Mandatory-update gate.
 *
 * On launch (and every time the app comes back to the foreground) we
 * fetch a tiny JSON published next to the website:
 *
 *   { "android": { "minVersionCode": 30, "latestVersionName": "1.0.4",
 *                  "storeUrl": "...", "message": "..." } }
 *
 * If this build's versionCode is below `minVersionCode` the whole app
 * is replaced by a full-screen "Update required" panel — hardware back
 * is swallowed, so there is no way past it except installing the new
 * version from Google Play. Releasing v31 and setting minVersionCode
 * to 31 in that file therefore locks every older install out.
 *
 * Fail-open on purpose: if the file can't be fetched (offline, DNS,
 * timeout) the customer keeps using the app — a flaky network must
 * never brick the shop.
 */

interface VersionInfo {
  minVersionCode: number;
  latestVersionName?: string;
  storeUrl?: string;
  message?: string;
}

const PLAY_WEB_URL =
  'https://play.google.com/store/apps/details?id=com.rythubiddamobile';
const PLAY_MARKET_URL = 'market://details?id=com.rythubiddamobile';
const FETCH_TIMEOUT_MS = 8000;

async function fetchVersionInfo(): Promise<VersionInfo | null> {
  const url = APP_CONFIG.APP_VERSION_URL;
  if (!url) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    // Cache-buster so a CDN / browser-style cache never pins an old file.
    const res = await fetch(`${url}?t=${Date.now()}`, {
      signal: ctrl.signal,
      headers: { 'Cache-Control': 'no-cache', Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const a = body?.android ?? body;
    const min = Number(a?.minVersionCode);
    if (!Number.isFinite(min) || min <= 0) return null;
    return {
      minVersionCode: min,
      latestVersionName: a?.latestVersionName,
      storeUrl: typeof a?.storeUrl === 'string' ? a.storeUrl : undefined,
      message: typeof a?.message === 'string' ? a.message : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function openStore(storeUrl?: string) {
  // market:// opens the Play app directly; fall back to the web URL
  // (or an admin-supplied one) if the Play app isn't installed.
  try {
    await Linking.openURL(PLAY_MARKET_URL);
  } catch {
    try {
      await Linking.openURL(storeUrl || PLAY_WEB_URL);
    } catch {
      /* nothing else we can do */
    }
  }
}

export const ForceUpdateGate: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [required, setRequired] = useState<VersionInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    // Unknown build number (should never happen in a real APK) → never block.
    if (!APP_CONFIG.VERSION_CODE) return;
    setChecking(true);
    const info = await fetchVersionInfo();
    setChecking(false);
    if (info && info.minVersionCode > APP_CONFIG.VERSION_CODE) {
      setRequired(info);
    } else if (info) {
      setRequired(null);
    }
    // info === null → fetch failed → leave current state untouched.
  }, []);

  // Check on mount and whenever the app returns to the foreground
  // (the customer may come back from Play without having updated).
  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  // While blocked, swallow the hardware back button.
  useEffect(() => {
    if (!required) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [required]);

  if (!required) return <>{children}</>;

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Image
          source={require('../assets/images/brand-logo.gif')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text variant="h3" weight="800" color={colors.textPrimary} align="center">
          Update required
        </Text>
        <Text
          variant="body"
          color={colors.textSecondary}
          align="center"
          style={styles.message}
        >
          {required.message ||
            'A new version of Rythu Bidda is available. Please update the app from Google Play to continue shopping.'}
        </Text>
        {required.latestVersionName ? (
          <Text variant="caption" color={colors.textSecondary} align="center">
            Latest version: {required.latestVersionName}
          </Text>
        ) : null}
        <Button
          title="Update now"
          size="lg"
          fullWidth
          onPress={() => openStore(required.storeUrl)}
          style={styles.button}
        />
        <Button
          title={checking ? 'Checking…' : 'I have updated'}
          variant="ghost"
          size="sm"
          fullWidth
          disabled={checking}
          onPress={check}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: { width: 120, height: 60, marginBottom: spacing.sm },
  message: { marginTop: spacing.xs },
  button: { marginTop: spacing.md },
});
