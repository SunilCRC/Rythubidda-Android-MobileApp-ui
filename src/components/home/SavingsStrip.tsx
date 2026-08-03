import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Text } from '../common';
import { spacing } from '../../theme/spacing';

/**
 * Zepto-style "dopamine bar" (approved v3 board), powered by the
 * FIRST10 engine that already exists:
 *   • eligible + items in cart → "You're saving ₹X today"
 *   • eligible, empty cart     → the 10% pitch
 *   • not eligible             → renders nothing
 * Display only — the backend applies the actual discount at checkout.
 */
interface Props {
  eligible: boolean;
  cartSubtotal: number;
}

const GREEN_DEEP = '#14735F';

export const SavingsStrip: React.FC<Props> = ({ eligible, cartSubtotal }) => {
  if (!eligible) return null;
  const saving = Math.round(cartSubtotal * 0.10);

  return (
    <View style={styles.strip}>
      <Icon name="zap" size={14} color={GREEN_DEEP} />
      {saving > 0 ? (
        <Text variant="caption" weight="800" color={GREEN_DEEP} style={styles.txt} numberOfLines={1}>
          You're saving ₹{saving} today{' '}
          <Text variant="caption" weight="600" color="#3f7f6f">· FIRST10 auto-applied</Text>
        </Text>
      ) : (
        <Text variant="caption" weight="800" color={GREEN_DEEP} style={styles.txt} numberOfLines={1}>
          Get 10% OFF your first order{' '}
          <Text variant="caption" weight="600" color="#3f7f6f">· FIRST10 auto-applied</Text>
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    borderRadius: 13,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    backgroundColor: '#DDF0E7',
  },
  txt: { flex: 1 },
});
