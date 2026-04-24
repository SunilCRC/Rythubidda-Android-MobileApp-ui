import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  padded?: boolean;
  elevated?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export const Card: React.FC<Props> = ({
  children,
  onPress,
  padded = true,
  elevated = true,
  style,
}) => {
  const base: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...(padded ? { padding: spacing.base } : {}),
    ...(elevated ? shadows.sm : {}),
    borderWidth: elevated ? 0 : 1,
    borderColor: colors.border,
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: colors.pressed }}
        style={({ pressed }) => [
          base,
          pressed && { opacity: 0.92 },
          style as ViewStyle,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style as ViewStyle]}>{children}</View>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _s = StyleSheet.create({});
