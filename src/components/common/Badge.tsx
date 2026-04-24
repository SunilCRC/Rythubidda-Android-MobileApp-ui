import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';

interface Props {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
}

const PALETTE: Record<Variant, { bg: string; fg: string }> = {
  primary: { bg: colors.palette.primary[100], fg: colors.primaryDark },
  secondary: { bg: colors.palette.secondary[200], fg: colors.primaryDark },
  success: { bg: '#dcfce7', fg: '#166534' },
  warning: { bg: '#fef3c7', fg: '#92400e' },
  error: { bg: '#fee2e2', fg: '#991b1b' },
  neutral: { bg: colors.palette.neutral[100], fg: colors.palette.neutral[700] },
};

export const Badge: React.FC<Props> = ({ label, variant = 'primary', style }) => {
  const { bg, fg } = PALETTE[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text variant="caption" color={fg} weight="600">
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
});
