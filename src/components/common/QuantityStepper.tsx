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
          backgroundColor: isPrimary ? colors.primary : colors.surface,
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
        hitSlop={8}
        style={[styles.btn, { width: sizing.btn, height: sizing.btn }]}
        android_ripple={{
          color: isPrimary ? 'rgba(255,255,255,0.2)' : colors.pressed,
          borderless: true,
          radius: sizing.btn / 2,
        }}
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
              : colors.primary
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
          weight="800"
          color={isPrimary ? colors.white : colors.textPrimary}
          style={[styles.value, { fontSize: sizing.font }]}
        >
          {qty}
        </Text>
      )}

      <Pressable
        onPress={increment}
        disabled={qty >= max || !!loading}
        hitSlop={8}
        style={[styles.btn, { width: sizing.btn, height: sizing.btn }]}
        android_ripple={{
          color: isPrimary ? 'rgba(255,255,255,0.2)' : colors.pressed,
          borderless: true,
          radius: sizing.btn / 2,
        }}
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
              : colors.primary
          }
        />
      </Pressable>
    </Animated.View>
  );
};

// Touch targets meet the 36×36 spec (md = 40, lg = 44). Font is larger
// so the quantity reads unambiguously against the brand background.
const SIZES = {
  sm: { height: 36, pad: 6, icon: 16, font: 15, btn: 36 },
  md: { height: 44, pad: 8, icon: 18, font: 17, btn: 40 },
  lg: { height: 52, pad: 10, icon: 20, font: 19, btn: 44 },
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: 32,
    textAlign: 'center',
    marginHorizontal: spacing.xs,
  },
});
