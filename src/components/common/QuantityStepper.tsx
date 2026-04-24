import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { Text } from './Text';
import { haptics } from '../../utils/haptics';

interface Props {
  qty: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  tone?: 'primary' | 'surface';
  style?: ViewStyle;
}

/**
 * Reusable +/- stepper. Used on product cards, cart line items,
 * and the product detail screen so cart quantity stays consistent.
 */
export const QuantityStepper: React.FC<Props> = ({
  qty,
  onIncrement,
  onDecrement,
  min = 0,
  max = 10,
  size = 'md',
  loading,
  tone = 'primary',
  style,
}) => {
  const sizing = SIZES[size];
  const isPrimary = tone === 'primary';

  const decrement = () => {
    if (qty <= min || loading) return;
    haptics.select();
    onDecrement();
  };
  const increment = () => {
    if (qty >= max || loading) return;
    haptics.select();
    onIncrement();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      style={[
        styles.container,
        {
          height: sizing.height,
          paddingHorizontal: sizing.pad,
          backgroundColor: isPrimary ? colors.cta : colors.surface,
          borderWidth: isPrimary ? 0 : 1.5,
          borderColor: colors.border,
        },
        shadows.sm,
        style,
      ]}
    >
      <Pressable
        onPress={decrement}
        disabled={qty <= min || !!loading}
        hitSlop={6}
        style={styles.btn}
        android_ripple={{ color: colors.pressed, borderless: true, radius: 18 }}
      >
        <Icon
          name="minus"
          size={sizing.icon}
          color={
            qty <= min
              ? isPrimary
                ? 'rgba(255,255,255,0.5)'
                : colors.textMuted
              : isPrimary
              ? colors.white
              : colors.ctaDark
          }
        />
      </Pressable>

      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary ? colors.white : colors.primary}
          style={styles.value}
        />
      ) : (
        <Text
          variant="bodyBold"
          color={isPrimary ? colors.white : colors.textPrimary}
          style={[styles.value, { fontSize: sizing.font }]}
        >
          {qty}
        </Text>
      )}

      <Pressable
        onPress={increment}
        disabled={qty >= max || !!loading}
        hitSlop={6}
        style={styles.btn}
        android_ripple={{ color: colors.pressed, borderless: true, radius: 18 }}
      >
        <Icon
          name="plus"
          size={sizing.icon}
          color={
            qty >= max
              ? isPrimary
                ? 'rgba(255,255,255,0.5)'
                : colors.textMuted
              : isPrimary
              ? colors.white
              : colors.ctaDark
          }
        />
      </Pressable>
    </Animated.View>
  );
};

const SIZES = {
  sm: { height: 32, pad: 6, icon: 14, font: 13 },
  md: { height: 40, pad: 8, icon: 16, font: 15 },
  lg: { height: 48, pad: 10, icon: 18, font: 17 },
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
  },
  btn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: 28,
    textAlign: 'center',
    marginHorizontal: spacing.xs,
  },
});
