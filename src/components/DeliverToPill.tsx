import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { Text } from './common';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { useLocationStore, type DeliveryLocation } from '../store';

/**
 * Compact "Deliver to · 500072 ▾" pill — Zepto / Swiggy / Blinkit pattern.
 * Always visible above the home search bar so the user can see and change
 * their delivery pincode without digging through cart or settings.
 *
 *  • If no location is set → reads "Set delivery location" so first-time
 *    users have a clear CTA.
 *  • Once set → shows area + pincode (with formatted address as subtitle).
 *
 * Tapping always opens the LocationStack modal at the root nav level —
 * works the same from any screen that mounts this component.
 */
export const DeliverToPill: React.FC = () => {
  const navigation = useNavigation<any>();
  const location = useLocationStore(s => s.location);

  const onPress = () => {
    // Walk up: tab navigator → MainTabs → Root navigator. The root nav
    // owns the Location modal stack.
    const root = navigation.getParent()?.getParent() ?? navigation.getParent();
    root?.navigate('Location', { screen: 'LocationPicker' });
  };

  const hasLocation = !!location?.pincode;
  const subtitle = hasLocation
    ? buildSubtitle(location)
    : 'Tap to choose pincode or auto-detect';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && { opacity: 0.85 }]}
      android_ripple={{ color: colors.pressed }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={
        hasLocation
          ? `Deliver to ${location?.pincode}. Tap to change.`
          : 'Set delivery location'
      }
    >
      <View style={styles.iconWell}>
        <Icon name="map-pin" size={14} color={colors.primary} />
      </View>
      <View style={styles.textCol}>
        <View style={styles.row}>
          <Text variant="caption" weight="700" color={colors.textTertiary}>
            Deliver to
          </Text>
          <Icon
            name="chevron-down"
            size={14}
            color={colors.primary}
            style={{ marginLeft: 2 }}
          />
        </View>
        <Text
          variant="bodySmall"
          weight="700"
          color={colors.textPrimary}
          numberOfLines={1}
        >
          {hasLocation ? buildTitle(location) : 'Set delivery location'}
        </Text>
        <Text
          variant="caption"
          weight="600"
          color={colors.textTertiary}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
};

function buildTitle(loc: DeliveryLocation) {
  const area = loc.area || loc.city;
  return area ? `${area} ${loc.pincode}` : loc.pincode;
}

function buildSubtitle(loc: DeliveryLocation) {
  if (loc.formatted) return loc.formatted;
  const parts = [loc.area, loc.city, loc.state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : `Pincode ${loc.pincode}`;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.tintSoft,
    borderWidth: 1,
    borderColor: colors.tintMid,
    flex: 1,
  },
  iconWell: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  textCol: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
