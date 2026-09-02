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
          <Text
            variant="label"
            weight="700"
            color={colors.textPrimary}
            style={styles.label}
          >
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
            <Icon
              name={leftIcon}
              size={18}
              color={colors.primary}
              style={styles.leftIcon}
            />
          ) : null}
          <TextInput
            ref={ref}
            style={[styles.input, style as TextStyle]}
            // Clearly muted grey — placeholderTextColor used to be
            // textTertiary (#3E3D37, near-black) which read as
            // already-typed text. neutral[400] sits well below the
            // body legibility floor so the hint can never be confused
            // with user input.
            placeholderTextColor={colors.palette.neutral[400]}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
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
                color={colors.primary}
              />
            </Pressable>
          ) : rightIcon ? (
            <Pressable onPress={onRightIconPress} hitSlop={8} style={styles.rightAction}>
              <Icon name={rightIcon} size={18} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
        {hasError ? (
          <Text
            variant="caption"
            weight="700"
            color={colors.error}
            style={styles.helper}
          >
            {error}
          </Text>
        ) : helper ? (
          <Text
            variant="caption"
            weight="600"
            color={colors.textSecondary}
            style={styles.helper}
          >
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
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    minHeight: 54,
  },
  input: {
    flex: 1,
    // Real bold FILE (Nunito Sans Bold) — no more synthetic bolding;
    // see typography.ts for the per-weight font-file setup.
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    fontWeight: 'normal',
    // Pure black instead of palette.neutral[800] (#161612) — testers
    // reported the typed text looked pale; maxing contrast removes
    // any device-specific tinting (Samsung OneUI, MIUI etc. shift the
    // near-black to a soft grey on some skins).
    color: '#000000',
    // Android adds a few px of "font padding" around glyphs that
    // visually thins the stroke. Killing it makes the text read crisper.
    includeFontPadding: false,
    paddingVertical: spacing.sm,
  },
  leftIcon: { marginRight: spacing.sm },
  rightAction: { padding: spacing.xs, marginLeft: spacing.xs },
  helper: { marginTop: spacing.xs, marginLeft: spacing.xs },
});

Input.displayName = 'Input';
