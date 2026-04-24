import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { fonts, fontSizes } from '../../theme/typography';
import { Text } from './Text';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  helper?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  style?: TextStyle | TextStyle[];
}

export const Input = forwardRef<TextInput, Props>(
  (
    {
      label,
      error,
      helper,
      leftIcon,
      rightIcon,
      onRightIconPress,
      isPassword,
      containerStyle,
      onFocus,
      onBlur,
      style,
      ...rest
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);
    const [pwdVisible, setPwdVisible] = useState(false);
    const hasError = !!error;

    const borderColor = hasError
      ? colors.error
      : focused
      ? colors.primary
      : colors.border;

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? (
          <Text variant="label" color={colors.textSecondary} style={styles.label}>
            {label}
          </Text>
        ) : null}
        <View
          style={[
            styles.field,
            { borderColor, backgroundColor: colors.white },
          ]}
        >
          {leftIcon ? (
            <Icon name={leftIcon} size={18} color={colors.textTertiary} style={styles.leftIcon} />
          ) : null}
          <TextInput
            ref={ref}
            style={[styles.input, style as TextStyle]}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={isPassword && !pwdVisible}
            onFocus={(e: any) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e: any) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />
          {isPassword ? (
            <Pressable
              onPress={() => setPwdVisible(v => !v)}
              hitSlop={8}
              style={styles.rightAction}
            >
              <Icon
                name={pwdVisible ? 'eye-off' : 'eye'}
                size={18}
                color={colors.textTertiary}
              />
            </Pressable>
          ) : rightIcon ? (
            <Pressable onPress={onRightIconPress} hitSlop={8} style={styles.rightAction}>
              <Icon name={rightIcon} size={18} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
        {hasError ? (
          <Text variant="caption" color={colors.error} style={styles.helper}>
            {error}
          </Text>
        ) : helper ? (
          <Text variant="caption" color={colors.textTertiary} style={styles.helper}>
            {helper}
          </Text>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: { marginBottom: spacing.base },
  label: { marginBottom: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.base,
    paddingHorizontal: spacing.base,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  leftIcon: { marginRight: spacing.sm },
  rightAction: { padding: spacing.xs, marginLeft: spacing.xs },
  helper: { marginTop: spacing.xs, marginLeft: spacing.xs },
});

Input.displayName = 'Input';
