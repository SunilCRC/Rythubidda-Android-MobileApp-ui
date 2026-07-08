import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  InteractionManager,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { Text } from '../common/Text';
import { Button } from '../common/Button';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';

/**
 * Promo announcement modal — appears once per app session right after
 * the user lands on the home screen, à la Zepto's offers / rewards
 * sheet. Currently surfaces the "Free delivery on orders above ₹1,000"
 * message; the body image + headline + CTA are designed to be easy to
 * swap out for live promos later (the user said they'll wire it up to
 * the backend in a future step).
 *
 * Behaviour:
 *   • Shown exactly once per JS session (module-level `shownThisSession`
 *     flag, resets when the app restarts). This avoids the modal
 *     re-appearing every time the user navigates back to home.
 *   • Dismissable via the close button OR by tapping the backdrop OR
 *     the "Start shopping" CTA.
 *   • Springs in (scale 0.85 → 1, opacity 0 → 1) for the modern modal
 *     feel; runs entirely on the native thread (useNativeDriver: true).
 */

// Module-level flag — survives across re-mounts of the modal in the
// same session, resets when the JS bundle is unloaded (app fully closed).
let shownThisSession = false;

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = Math.min(360, SCREEN_W - spacing.xl * 2);

export const WelcomePromoModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Decide whether to show on mount.
  //
  // Mounting a native Modal mid-navigation has been observed to race
  // react-native-screens' fragment manager and crash the app:
  //   "No view found for id 0x… for fragment ScreenFragment"
  // `InteractionManager.runAfterInteractions` defers the work until
  // every pending UI animation / navigation transition has finished —
  // i.e. until the navigator is fully settled — which eliminates that
  // race. The 500 ms delay still runs ON TOP of that, so the user
  // still sees the home screen for a beat before the modal appears.
  useEffect(() => {
    if (shownThisSession) return;
    shownThisSession = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handle = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => setVisible(true), 500);
    });
    return () => {
      handle.cancel?.();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Play the entry spring whenever the modal becomes visible.
  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, scale, opacity]);

  const close = () => {
    // Reverse animation, then unmount.
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      // statusBarTranslucent INTENTIONALLY OMITTED. Combined with
      // react-native-screens + the new architecture (newArchEnabled=true
      // in gradle.properties), translucent modals racing the fragment
      // manager during initial navigation cause:
      //   "No view found for id 0x… for fragment ScreenFragment"
      // crash at app launch. Without statusBarTranslucent the modal
      // doesn't extend into the status-bar area — that's a cosmetic
      // trade-off; the modal's centred card still looks correct and
      // the app no longer crashes.
      animationType="none"
      onRequestClose={close}
    >
      {/* Dim the rest of the screen and let a tap on the backdrop close. */}
      <Pressable style={styles.backdrop} onPress={close}>
        <Animated.View
          // Stop tap-to-close from triggering when the user touches the
          // card itself (without this, every tap on the card would
          // bubble up to the backdrop's onPress and dismiss).
          // eslint-disable-next-line react-native/no-inline-styles
          style={[
            styles.card,
            { width: CARD_W, transform: [{ scale }], opacity },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Close button — top-right of the card */}
          <Pressable
            onPress={close}
            hitSlop={10}
            style={styles.closeBtn}
            android_ripple={{ color: colors.pressed, borderless: true, radius: 18 }}
          >
            <Icon name="x" size={18} color={colors.textPrimary} />
          </Pressable>

          {/* Hero badge — gradient circle with a delivery-truck icon */}
          <LinearGradient
            colors={colors.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBadge}
          >
            <Icon name="truck" size={36} color={colors.white} />
          </LinearGradient>

          <Text
            variant="h3"
            weight="800"
            color={colors.textPrimary}
            align="center"
            style={styles.title}
          >
            FREE Delivery 🎉
          </Text>

          <Text
            variant="body"
            weight="600"
            color={colors.textSecondary}
            align="center"
            style={styles.subtitle}
          >
            On all orders above{' '}
            <Text variant="body" weight="800" color={colors.primary}>
              ₹1,000
            </Text>
            . Hand-picked farm produce, delivered straight from the farmer.
          </Text>

          {/* Highlight strip — "limited time" style ribbon */}
          <View style={styles.highlight}>
            <Icon name="gift" size={14} color={colors.primaryDark} />
            <Text
              variant="caption"
              weight="700"
              color={colors.primaryDark}
              style={{ marginLeft: 6 }}
            >
              No middlemen · Farmer-first pricing
            </Text>
          </View>

          <Button
            title="Start Shopping"
            onPress={close}
            fullWidth
            size="lg"
            style={styles.cta}
          />

          <Pressable onPress={close} hitSlop={6} style={styles.skip}>
            <Text variant="caption" weight="700" color={colors.textTertiary}>
              Maybe later
            </Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 18, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.xl,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
    ...shadows.md,
  },
  title: {
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  subtitle: {
    marginBottom: spacing.base,
    lineHeight: 22,
    paddingHorizontal: spacing.xs,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tintSoft,
    borderColor: colors.tintMid,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
  },
  cta: {
    marginBottom: spacing.sm,
  },
  skip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.base,
  },
});
