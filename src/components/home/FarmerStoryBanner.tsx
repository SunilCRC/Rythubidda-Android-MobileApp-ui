import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { Text } from '../common';
import { spacing } from '../../theme/spacing';
import type { TodaysFarmer } from '../../types';

/**
 * "Meet Today's Farmer" as an editorial green banner (approved v3
 * board) — the one element no competitor app has, so it gets the
 * loudest, most distinct treatment on the feed. Tapping anywhere
 * opens the full FarmerStory screen.
 */
interface Props {
  farmer: TodaysFarmer;
  onPress: (farmer: TodaysFarmer) => void;
  /** Half-width card for the farmer+reviews duo row — vertical
      layout, no avatar circle, parent owns the margins. */
  compact?: boolean;
}

export const FarmerStoryBanner: React.FC<Props> = ({ farmer, onPress, compact }) => {
  const days = farmer.harvestedDaysAgo ?? 0;
  const meta = [
    farmer.cropSpecialty || null,
    farmer.location || null,
    days > 0 ? `harvested ${days} day${days === 1 ? '' : 's'} ago` : 'freshly harvested',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => onPress(farmer)}
      style={({ pressed }) => [compact && { flex: 1 }, pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
      accessibilityLabel={`Meet today's farmer ${farmer.name}`}
    >
      <LinearGradient
        colors={['#34531F', '#4C7029', '#7BA23F']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.banner, compact && styles.bannerCompact]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            variant="caption"
            weight="800"
            color="rgba(255,255,255,0.85)"
            style={compact ? { ...styles.kicker, fontSize: 7.5, letterSpacing: 1 } : styles.kicker}
          >
            MEET TODAY'S FARMER
          </Text>
          <Text
            variant={compact ? 'body' : 'h5'}
            weight="800"
            color="#FFFFFF"
            numberOfLines={1}
            style={{ marginTop: 2 }}
          >
            {farmer.name}
          </Text>
          <Text
            variant="caption"
            weight="600"
            color="rgba(255,255,255,0.9)"
            numberOfLines={2}
            style={compact ? { marginTop: 1, fontSize: 9.5, lineHeight: 13 } : { marginTop: 1 }}
          >
            {meta}
          </Text>
          <View style={[styles.cta, compact && styles.ctaCompact]}>
            <Text variant="caption" weight="800" color="#34531F" style={compact ? { fontSize: 10 } : undefined}>
              His Story →
            </Text>
          </View>
        </View>
        {!compact ? (
          <View style={styles.ava}>
            <Icon name="user" size={26} color="#8B532E" />
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    borderRadius: 18,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  // Duo-row variant: parent row owns margins; the card fills its
  // half-column and matches the reviews card's height.
  bannerCompact: {
    marginHorizontal: 0,
    marginTop: 0,
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  ctaCompact: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
  },
  kicker: { fontSize: 8.5, letterSpacing: 1.4 },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 7,
    backgroundColor: 'rgba(255,253,248,0.94)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  ava: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FBEFDF',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
