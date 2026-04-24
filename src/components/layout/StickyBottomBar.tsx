import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { shadows, spacing } from '../../theme/spacing';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Floating bottom bar with top shadow. Respects device safe-area so the
 * content never sits under the gesture indicator. Used by the product
 * detail screen (price + Add to Cart), and ready for future checkout /
 * confirm screens.
 */
export const StickyBottomBar: React.FC<Props> = ({ children, style }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: spacing.base + insets.bottom },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    // Inverted shadow — shadow projects upward
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },
});
