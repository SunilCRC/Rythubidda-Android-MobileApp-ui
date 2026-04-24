import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { formatINR } from '../../utils/format';
import { Text } from './Text';

interface Props {
  amount: number | undefined | null;
  mrp?: number | null;
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
  color?: string;
}

export const Price: React.FC<Props> = ({ amount, mrp, size = 'md', inline, color }) => {
  const hasDiscount = mrp != null && amount != null && mrp > amount;
  const variant = size === 'lg' ? 'h4' : size === 'md' ? 'h6' : 'bodyBold';
  return (
    <View style={[styles.row, inline && styles.inline]}>
      <Text variant={variant} color={color || colors.primaryDark}>
        {formatINR(amount ?? 0)}
      </Text>
      {hasDiscount ? (
        <>
          <Text
            variant="bodySmall"
            color={colors.textMuted}
            style={styles.mrp}
          >
            {formatINR(mrp!)}
          </Text>
          <Text variant="caption" color={colors.success} style={styles.save}>
            {Math.round(((mrp! - amount!) / mrp!) * 100)}% OFF
          </Text>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  inline: { flexDirection: 'row' },
  mrp: {
    marginLeft: spacing.sm,
    textDecorationLine: 'line-through',
  },
  save: { marginLeft: spacing.sm, fontWeight: '700' },
});
