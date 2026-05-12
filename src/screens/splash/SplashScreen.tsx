import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../../components/common';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  useAuthStore,
  useCartStore,
  useDeliveryCenterStore,
  useLocationStore,
} from '../../store';

const SPLASH_DURATION_MS = 2500;

/**
 * First screen shown on app launch.
 *
 * Visual design (inspired by Flipkart / Zomato / Zepto / Country Delight):
 *  • Full-screen warm cream→tan gradient — establishes the brand's earthy,
 *    farm-fresh feel before anything else loads.
 *  • Pulsing halo behind the animated cow — small concentric rings that
 *    breathe in/out, drawing the eye to the brand mark.
 *  • Decorative grain-stalk icons in the four corners (low opacity) — adds
 *    visual texture without competing with the centre.
 *  • Bold letter-spaced wordmark + ornamental divider + tagline.
 *  • Animated three-dot loader at the bottom signals that work is happening
 *    (auth hydration) — better than a blank wait.
 *
 * Behaviour is unchanged: fade in, hydrate stores, advance once auth
 * resolves AND the minimum splash duration elapses.
 */
export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  // ── Animation values ────────────────────────────────────────────────
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  // Halo pulse — loops independently throughout the splash duration.
  const haloPulse = useRef(new Animated.Value(0)).current;
  // Three-dot loader — each dot offset by 200ms.
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // ── Store hydration ─────────────────────────────────────────────────
  const hydrate = useAuthStore(s => s.hydrate);
  const status = useAuthStore(s => s.status);
  const hydrateCart = useCartStore(s => s.hydrate);
  const hydrateLocation = useLocationStore(s => s.hydrate);
  const hydrateShipping = useDeliveryCenterStore(s => s.hydrate);

  useEffect(() => {
    // Sequenced reveal — feels intentional instead of "things popped in".
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
      Animated.timing(wordmarkOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Halo pulse — infinite breath in / breath out
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(haloPulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    // Three-dot loader — staggered bounces
    const makeBounce = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(800 - delay),
        ]),
      );
    makeBounce(dot1, 0).start();
    makeBounce(dot2, 200).start();
    makeBounce(dot3, 400).start();

    // Kick off auth + cart + location + shipping-config hydration in parallel.
    // Shipping config (delivery centers + global rate) is needed by Checkout
    // before the user picks an address. Splash is the right time to fetch it.
    hydrate();
    hydrateCart();
    hydrateLocation();
    hydrateShipping();

    return () => {
      pulse.stop();
    };
  }, [
    hydrate,
    hydrateCart,
    hydrateLocation,
    hydrateShipping,
    logoOpacity,
    logoScale,
    wordmarkOpacity,
    taglineOpacity,
    haloPulse,
    dot1,
    dot2,
    dot3,
  ]);

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

  // ── Interpolated styles ─────────────────────────────────────────────
  const innerHaloStyle = {
    transform: [
      {
        scale: haloPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.15],
        }),
      },
    ],
    opacity: haloPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.55, 0.25],
    }),
  };
  const outerHaloStyle = {
    transform: [
      {
        scale: haloPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.3],
        }),
      },
    ],
    opacity: haloPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 0.0],
    }),
  };
  const dotStyle = (v: Animated.Value) => ({
    transform: [
      {
        translateY: v.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
        }),
      },
    ],
    opacity: v.interpolate({
      inputRange: [0, 1],
      outputRange: [0.45, 1],
    }),
  });

  return (
    <LinearGradient
      colors={[colors.tintSoft, colors.tintMid, colors.tintSoft]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar backgroundColor={colors.tintSoft} barStyle="dark-content" />

      {/* ── Decorative corner accents ────────────────────────────────── */}
      <View style={[styles.corner, styles.cornerTL]}>
        <Icon name="feather" size={28} color={colors.primary} />
      </View>
      <View style={[styles.corner, styles.cornerTR]}>
        <Icon name="feather" size={28} color={colors.primary} />
      </View>
      <View style={[styles.corner, styles.cornerBL]}>
        <Icon name="feather" size={28} color={colors.primary} />
      </View>
      <View style={[styles.corner, styles.cornerBR]}>
        <Icon name="feather" size={28} color={colors.primary} />
      </View>

      {/* ── Centred brand reveal ─────────────────────────────────────── */}
      <View style={styles.centerWrap}>
        {/* Pulsing concentric halos (decorative — behind the cow) */}
        <View style={styles.haloStack}>
          <Animated.View style={[styles.haloOuter, outerHaloStyle]} />
          <Animated.View style={[styles.haloInner, innerHaloStyle]} />

          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}
          >
            <FastImage
              source={require('../../assets/images/cow-animation.gif')}
              style={styles.cow}
              resizeMode={FastImage.resizeMode.contain}
            />
          </Animated.View>
        </View>

        {/* Wordmark + ornamental divider + tagline */}
        <Animated.View
          style={{ opacity: wordmarkOpacity, alignItems: 'center', marginTop: spacing.lg }}
        >
          <Text
            variant="h1"
            weight="800"
            color={colors.primaryDark}
            align="center"
            style={styles.brand}
          >
            RYTHU BIDDA
          </Text>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerOrnament}>
              <Icon name="star" size={10} color={colors.primary} />
            </View>
            <View style={styles.dividerLine} />
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: taglineOpacity,
            marginTop: spacing.sm,
            alignItems: 'center',
          }}
        >
          <Text
            variant="bodyBold"
            weight="700"
            color={colors.textSecondary}
            align="center"
            style={{ letterSpacing: 0.3 }}
          >
            Farm-fresh, farmer-first.
          </Text>
          <Text
            variant="caption"
            weight="600"
            color={colors.textTertiary}
            align="center"
            style={{ marginTop: 4 }}
          >
            From farm to your door · No middlemen
          </Text>
        </Animated.View>
      </View>

      {/* ── Bottom: animated 3-dot loader + version ──────────────────── */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          <Animated.View style={[styles.dot, dotStyle(dot1)]} />
          <Animated.View style={[styles.dot, dotStyle(dot2)]} />
          <Animated.View style={[styles.dot, dotStyle(dot3)]} />
        </View>
        <Text
          variant="caption"
          color={colors.textTertiary}
          weight="700"
          align="center"
          style={{ marginTop: spacing.sm, letterSpacing: 1 }}
        >
          MADE WITH ♥ FOR INDIAN FARMERS
        </Text>
        <Text
          variant="caption"
          color={colors.textMuted}
          align="center"
          style={{ marginTop: 2 }}
        >
          v1.0.0
        </Text>
      </View>
    </LinearGradient>
  );
};

const HALO_INNER_SIZE = 200;
const HALO_OUTER_SIZE = 260;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Decorative grain-stalk icons in each corner
  corner: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.18,
  },
  cornerTL: { top: spacing['2xl'], left: spacing.xl, transform: [{ rotate: '-35deg' }] },
  cornerTR: { top: spacing['2xl'], right: spacing.xl, transform: [{ rotate: '35deg' }] },
  cornerBL: { bottom: spacing['5xl'], left: spacing.xl, transform: [{ rotate: '-145deg' }] },
  cornerBR: { bottom: spacing['5xl'], right: spacing.xl, transform: [{ rotate: '145deg' }] },

  // Central content
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  // Pulsing halo behind the cow
  haloStack: {
    width: HALO_OUTER_SIZE,
    height: HALO_OUTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloOuter: {
    position: 'absolute',
    width: HALO_OUTER_SIZE,
    height: HALO_OUTER_SIZE,
    borderRadius: HALO_OUTER_SIZE / 2,
    backgroundColor: colors.palette.primary[100],
  },
  haloInner: {
    position: 'absolute',
    width: HALO_INNER_SIZE,
    height: HALO_INNER_SIZE,
    borderRadius: HALO_INNER_SIZE / 2,
    backgroundColor: colors.palette.primary[200],
  },
  cow: {
    width: 160,
    height: 160,
  },

  // Wordmark + ornamental divider
  brand: { letterSpacing: 4 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  dividerLine: {
    height: 1,
    width: 32,
    backgroundColor: colors.primary,
    opacity: 0.5,
  },
  dividerOrnament: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.tintSoft,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer (animated dots + version)
  footer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
