import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Text } from '../common/Text';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';

/**
 * Brand-themed toast — replaces the default `react-native-toast-message`
 * BaseToast/ErrorToast widgets. Wider padding, rounded card, tinted icon
 * well on the left, bold title + dim subtitle, soft shadow.
 *
 * Visual rhythm matches the rest of the app (cards, headers, location
 * pill) — warm browns / cream tints, not the stock iOS gray strip.
 *
 * Three variants:
 *   • success — green check, success-tinted icon well
 *   • error   — red alert-octagon, error-tinted icon well
 *   • info    — brand brown info icon, cream icon well
 */

type Variant = 'success' | 'error' | 'info';

interface VariantStyle {
  icon: string;
  iconColor: string;
  iconBg: string;
  accentBorder: string;
}

const VARIANTS: Record<Variant, VariantStyle> = {
  success: {
    icon: 'check-circle',
    iconColor: colors.white,
    iconBg: colors.success,
    accentBorder: colors.success,
  },
  error: {
    icon: 'x-octagon',
    iconColor: colors.white,
    iconBg: colors.error,
    accentBorder: colors.error,
  },
  info: {
    icon: 'info',
    iconColor: colors.white,
    iconBg: colors.primary,
    accentBorder: colors.primary,
  },
};

interface Props {
  variant: Variant;
  text1?: string;
  text2?: string;
}

export const BrandToast: React.FC<Props> = ({ variant, text1, text2 }) => {
  const v = VARIANTS[variant];
  return (
    <View
      style={[
        styles.toast,
        { borderLeftColor: v.accentBorder },
      ]}
    >
      <View style={[styles.iconWell, { backgroundColor: v.iconBg }]}>
        <Icon name={v.icon} size={18} color={v.iconColor} />
      </View>
      <View style={styles.body}>
        {text1 ? (
          <Text
            variant="bodyBold"
            weight="800"
            color={colors.textPrimary}
            numberOfLines={2}
          >
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text
            variant="caption"
            weight="600"
            color={colors.textSecondary}
            numberOfLines={3}
            style={{ marginTop: 2 }}
          >
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.base,
    marginHorizontal: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 64,
    width: '92%',
    ...shadows.lg,
  },
  iconWell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  body: { flex: 1, marginLeft: spacing.sm + 2 },
});
