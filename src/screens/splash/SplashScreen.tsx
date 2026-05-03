import React, { useEffect, useRef } from 'react';
import { Animated, StatusBar, StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../../components/common';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAuthStore, useCartStore, useLocationStore } from '../../store';

const SPLASH_DURATION_MS = 2500;

/**
 * First screen shown on app launch.
 * Fades in the brand, waits for auth hydration to complete (token validation),
 * then advances to the main app. Guests and authenticated users land on the
 * same home tab; auth gating happens at the action level.
 */
export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  const hydrate = useAuthStore(s => s.hydrate);
  const status = useAuthStore(s => s.status);
  const hydrateCart = useCartStore(s => s.hydrate);
  const hydrateLocation = useLocationStore(s => s.hydrate);

  useEffect(() => {
    // Animate logo in
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Kick off auth + cart + location hydration in parallel
    hydrate();
    hydrateCart();
    hydrateLocation();
  }, [hydrate, hydrateCart, hydrateLocation, logoOpacity, logoScale, taglineOpacity]);

  useEffect(() => {
    // Advance once the minimum splash duration has elapsed AND auth has resolved
    const minWait = new Promise<void>(res =>
      setTimeout(() => res(), SPLASH_DURATION_MS),
    );
    const authSettled = new Promise<void>(res => {
      if (status === 'authenticated' || status === 'unauthenticated') {
        res();
      } else {
        const unsub = useAuthStore.subscribe(s => {
          if (s.status === 'authenticated' || s.status === 'unauthenticated') {
            res();
            unsub();
          }
        });
      }
    });

    Promise.all([minWait, authSettled]).then(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    });
  }, [navigation, status]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.background} barStyle="dark-content" />
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          alignItems: 'center',
        }}
      >
        <FastImage
          source={require('../../assets/images/cow-animation.gif')}
          style={styles.logo}
          resizeMode={FastImage.resizeMode.contain}
        />
        <Text variant="h2" color={colors.primaryDark} align="center" style={styles.brand}>
          RYTHU BIDDA
        </Text>
      </Animated.View>

      <Animated.View style={{ opacity: taglineOpacity, marginTop: spacing.sm }}>
        <Text variant="bodySmall" color={colors.textSecondary} align="center">
          Farm-fresh, farmer-first.
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text variant="caption" color={colors.textMuted} align="center">
          v1.0.0
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  logo: { width: 128, height: 128, marginBottom: spacing.base },
  brand: { letterSpacing: 2 },
  footer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
