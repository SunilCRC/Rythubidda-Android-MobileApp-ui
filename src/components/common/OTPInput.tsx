import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { fonts } from '../../theme/typography';
import { haptics } from '../../utils/haptics';

export interface OTPInputHandle {
  shake: () => void;
  focus: () => void;
  clear: () => void;
}

interface Props {
  length?: number;
  value?: string;
  onChange?: (otp: string) => void;
  onComplete?: (otp: string) => void;
  autoFocus?: boolean;
  error?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * 6-box (configurable) OTP input with auto-advance, backspace handling,
 * focus-on-current-empty-cell behavior, and an imperative `shake()` for
 * error feedback. Supports `onComplete` callback for auto-submit.
 */
export const OTPInput = forwardRef<OTPInputHandle, Props>(
  (
    {
      length = 6,
      value = '',
      onChange,
      onComplete,
      autoFocus = true,
      error = false,
      disabled = false,
      style,
    },
    ref,
  ) => {
    const inputsRef = useRef<Array<TextInput | null>>([]);
    const digits = splitDigits(value, length);
    const shake = useSharedValue(0);

    useImperativeHandle(ref, () => ({
      shake: () => {
        haptics.error();
        shake.value = withSequence(
          withRepeat(withTiming(1, { duration: 60 }), 3, true),
          withTiming(0, { duration: 60 }),
        );
      },
      focus: () => {
        const emptyIdx = digits.findIndex(d => !d);
        const idx = emptyIdx === -1 ? length - 1 : emptyIdx;
        inputsRef.current[idx]?.focus();
      },
      clear: () => {
        onChange?.('');
        setTimeout(() => inputsRef.current[0]?.focus(), 0);
      },
    }));

    useEffect(() => {
      if (autoFocus) {
        const t = setTimeout(() => inputsRef.current[0]?.focus(), 180);
        return () => clearTimeout(t);
      }
    }, [autoFocus]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        {
          translateX:
            shake.value === 0
              ? 0
              : (shake.value > 0.5 ? 1 : -1) * 6,
        },
      ],
    }));

    const setDigit = (idx: number, raw: string) => {
      // Support paste: if a full OTP is dropped into one cell, spread it out.
      const clean = raw.replace(/\D/g, '');
      if (clean.length > 1) {
        const next = clean.slice(0, length).padEnd(length, '').slice(0, length);
        onChange?.(next.replace(/\s/g, ''));
        const firstEmpty = [...next].findIndex(c => !c);
        const focusIdx = firstEmpty === -1 ? length - 1 : firstEmpty;
        inputsRef.current[focusIdx]?.focus();
        if (next.replace(/\s/g, '').length === length) {
          onComplete?.(next.replace(/\s/g, ''));
        }
        return;
      }

      const nextDigits = [...digits];
      nextDigits[idx] = clean.slice(0, 1);
      const nextStr = nextDigits.join('');
      onChange?.(nextStr);

      if (clean && idx < length - 1) {
        inputsRef.current[idx + 1]?.focus();
      }
      if (nextStr.length === length && !nextStr.includes('')) {
        // Defer so the final keystroke renders before the screen transitions.
        setTimeout(() => onComplete?.(nextStr), 80);
      }
    };

    return (
      <Animated.View style={[styles.boxes, animatedStyle, style]}>
        {digits.map((d, i) => {
          const filled = !!d;
          return (
            <TextInput
              key={i}
              ref={r => {
                inputsRef.current[i] = r;
              }}
              value={d}
              onChangeText={v => setDigit(i, v)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !digits[i] && i > 0) {
                  inputsRef.current[i - 1]?.focus();
                  const nextDigits = [...digits];
                  nextDigits[i - 1] = '';
                  onChange?.(nextDigits.join(''));
                }
              }}
              keyboardType="number-pad"
              maxLength={1}
              editable={!disabled}
              selectionColor={colors.primary}
              cursorColor={colors.primary}
              style={[
                styles.box,
                {
                  borderColor: error
                    ? colors.error
                    : filled
                    ? colors.primary
                    : colors.border,
                  backgroundColor: filled ? colors.tintSoft : colors.surface,
                  color: colors.textPrimary,
                },
              ]}
              textContentType="oneTimeCode"
            />
          );
        })}
      </Animated.View>
    );
  },
);

OTPInput.displayName = 'OTPInput';

function splitDigits(value: string, length: number) {
  const arr = Array(length).fill('');
  for (let i = 0; i < Math.min(value.length, length); i++) arr[i] = value[i];
  return arr;
}

const styles = StyleSheet.create({
  boxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  box: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 22,
    fontWeight: '800',
  },
});
