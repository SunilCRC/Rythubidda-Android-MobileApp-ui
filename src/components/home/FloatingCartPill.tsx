import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Text } from '../common';
import { spacing } from '../../theme/spacing';
import { useCartItemCount, useCartStore } from '../../store';
import { formatINR } from '../../utils/format';

/**
 * Instamart's signature floating "View Cart" pill (approved v3
 * board). Reads live cart state; hides itself when the cart is
 * empty. Deep farm-green so it pops on the cream background.
 * Replaces the Cart TAB as the primary cart entry — the CartTab
 * stack still exists (checkout, addresses), its tab button is just
 * hidden.
 */
interface Props {
  onPress: () => void;
  /** Distance from the bottom edge — sits above the tab bar on
      tabbed screens (default), lower on rail screens. */
  bottom?: number;
}

const GREEN = '#234D20';

export const FloatingCartPill: React.FC<Props> = ({ onPress, bottom = 12 }) => {
  const count = useCartItemCount();
  const subtotal = useCartStore(s => s.cart?.subtotal ?? 0);
  if (!count || count <= 0) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pill, { bottom }, pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
      accessibilityLabel={`View cart, ${count} items`}
    >
      <View style={styles.left}>
        <Icon name="shopping-cart" size={15} color="#FBEFDF" />
        <Text variant="bodySmall" weight="800" color="#FFFFFF">
          {count} item{count === 1 ? '' : 's'}
          {subtotal > 0 ? ` · ${formatINR(subtotal)}` : ''}
        </Text>
      </View>
      <View style={styles.right}>
        <Text variant="bodySmall" weight="800" color="#FFFFFF">
          View Cart
        </Text>
        <Icon name="arrow-right" size={15} color="#FBEFDF" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GREEN,
    borderRadius: 15,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    shadowColor: '#143210',
    shadowOpacity: 0.4,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
