import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { usePressScale } from '../../hooks/usePressScale';
import { haptics } from '../../utils/haptics';
import { Text } from './Text';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'cta';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  haptic?: boolean;
}

const SIZE_STYLES: Record<
  ButtonSize,
  { height: number; paddingH: number; fontSize: number; radius: number }
> = {
  sm: { height: 38, paddingH: spacing.base, fontSize: 13, radius: radius.base },
  md: { height: 46, paddingH: spacing.lg, fontSize: 14, radius: radius.lg },
  lg: { height: 54, paddingH: spacing.xl, fontSize: 16, radius: radius.lg },
};

export const Button: React.FC<Props> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  haptic = true,
}) => {
  const isDisabled = disabled || loading;
  const { bg, fg, border, gradient } = resolveColors(variant, isDisabled);
  const sz = SIZE_STYLES[size];
  const press = usePressScale(0.97);

  const handlePress = () => {
    if (haptic) haptics.tap();
    onPress?.();
  };

  const Inner = (
    <View style={styles.content}>
      {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
      <Text
        variant="button"
        color={fg}
        style={{ fontSize: sz.fontSize, letterSpacing: 0.3 }}
      >
        {title}
      </Text>
      {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
    </View>
  );

  return (
    <Animated.View style={[press.style, fullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        disabled={isDisabled}
        android_ripple={
          variant === 'ghost' || variant === 'outline'
            ? { color: colors.pressed, borderless: false }
            : undefined
        }
        style={{
          borderRadius: sz.radius,
          overflow: 'hidden',
        }}
      >
        {gradient ? (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.base,
              {
                height: sz.height,
                paddingHorizontal: sz.paddingH,
                borderRadius: sz.radius,
              },
              variant === 'primary' && !isDisabled ? shadows.md : null,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={fg} />
            ) : (
              Inner
            )}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.base,
              {
                height: sz.height,
                paddingHorizontal: sz.paddingH,
                backgroundColor: bg,
                borderColor: border,
                borderWidth: variant === 'outline' ? 1.5 : 0,
                borderRadius: sz.radius,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={fg} />
            ) : (
              Inner
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

function resolveColors(variant: ButtonVariant, disabled: boolean) {
  if (disabled) {
    return {
      bg: colors.disabled,
      fg: colors.disabledText,
      border: colors.disabled,
      gradient: undefined,
    };
  }
  switch (variant) {
    case 'primary':
      // Primary CTA buttons (Login, Sign Up, Place Order, Add to Cart, etc.)
      // use the warm terracotta brand color #AB6639, not the green accent.
      return {
        bg: colors.cta,
        fg: colors.white,
        border: colors.cta,
        gradient: [colors.ctaLight, colors.cta] as [string, string],
      };
    case 'secondary':
      return {
        bg: colors.secondary,
        fg: colors.primaryDark,
        border: colors.secondary,
        gradient: colors.gradients.secondary,
      };
    case 'outline':
      return {
        bg: colors.transparent,
        fg: colors.primary,
        border: colors.primary,
        gradient: undefined,
      };
    case 'ghost':
      return {
        bg: colors.transparent,
        fg: colors.primary,
        border: colors.transparent,
        gradient: undefined,
      };
    case 'danger':
      return {
        bg: colors.error,
        fg: colors.white,
        border: colors.error,
        gradient: [colors.accentLight, colors.error] as [string, string],
      };
    case 'cta':
      return {
        bg: colors.cta,
        fg: colors.white,
        border: colors.cta,
        gradient: [colors.ctaLight, colors.cta] as [string, string],
      };
  }
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center' },
  leftIcon: { marginRight: spacing.sm },
  rightIcon: { marginLeft: spacing.sm },
});
