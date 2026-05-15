import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Text } from '../common/Text';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import {
  _registerConfirmSubscriber,
  type ConfirmRequest,
} from '../../utils/confirm';

/**
 * Brand-themed dialog. Mounts once at the root (App.tsx). Listens for
 * imperative `confirm({...})` calls and renders a centered card with:
 *   • Icon (top, in tinted well)
 *   • Title (bold, centered)
 *   • Message (optional)
 *   • [Cancel] [Confirm]   ← single button when `singleAction` is set
 *
 * Animations: backdrop fades in, card scales up from 0.92 → 1 with
 * spring. Tapping the backdrop OR the back button OR Cancel resolves
 * the promise to false.
 */
export const ConfirmHost: React.FC = () => {
  const [req, setReq] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    _registerConfirmSubscriber(setReq);
    return () => _registerConfirmSubscriber(null);
  }, []);

  // Card entrance animation. Re-runs every time a new req arrives.
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!req) return;
    cardScale.setValue(0.92);
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [req, cardScale, cardOpacity]);

  if (!req) return null;
  const { options, resolve } = req;

  const handle = (yes: boolean) => {
    resolve(yes);
    setReq(null);
  };

  const iconName =
    options.icon ?? (options.destructive ? 'alert-triangle' : 'help-circle');
  const iconColor = options.destructive ? colors.error : colors.primary;
  const iconBg = options.destructive ? colors.errorSoft : colors.tintSoft;

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={() => handle(false)}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={() => handle(false)}>
        <Animated.View
          style={[
            styles.card,
            { opacity: cardOpacity, transform: [{ scale: cardScale }] },
          ]}
          // Stop backdrop press-through when tapping inside the card
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.iconWell, { backgroundColor: iconBg }]}>
            <Icon name={iconName} size={28} color={iconColor} />
          </View>

          <Text
            variant="h5"
            weight="800"
            color={colors.textPrimary}
            align="center"
            style={{ marginTop: spacing.base }}
          >
            {options.title}
          </Text>

          {options.message ? (
            <Text
              variant="body"
              weight="600"
              color={colors.textSecondary}
              align="center"
              style={{ marginTop: spacing.sm, lineHeight: 21 }}
            >
              {options.message}
            </Text>
          ) : null}

          <View
            style={[
              styles.actions,
              options.singleAction && { flexDirection: 'column' },
            ]}
          >
            {!options.singleAction ? (
              <>
                <Pressable
                  onPress={() => handle(false)}
                  android_ripple={{ color: colors.pressed }}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.cancelBtn,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <Text variant="button" weight="800" color={colors.textPrimary}>
                    {options.cancelText ?? 'Cancel'}
                  </Text>
                </Pressable>
                <View style={{ width: spacing.sm }} />
              </>
            ) : null}

            <Pressable
              onPress={() => handle(true)}
              android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: options.destructive
                    ? colors.error
                    : colors.primary,
                },
                pressed && { opacity: 0.92 },
                options.singleAction && { width: '100%' },
              ]}
            >
              <Text variant="button" weight="800" color={colors.white}>
                {options.confirmText ?? 'Confirm'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 18, 16, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    ...shadows.xl,
  },
  iconWell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    marginTop: spacing.lg,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  cancelBtn: {
    backgroundColor: colors.tintSoft,
    borderWidth: 1,
    borderColor: colors.tintMid,
  },
});
