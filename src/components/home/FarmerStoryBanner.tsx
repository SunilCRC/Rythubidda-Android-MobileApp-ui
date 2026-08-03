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
}

export const FarmerStoryBanner: React.FC<Props> = ({ farmer, onPress }) => {
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
      style={({ pressed }) => [pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
      accessibilityLabel={`Meet today's farmer ${farmer.name}`}
    >
      <LinearGradient
        colors={['#34531F', '#4C7029', '#7BA23F']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.banner}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="caption" weight="800" color="rgba(255,255,255,0.85)" style={styles.kicker}>
            MEET TODAY'S FARMER
          </Text>
          <Text variant="h5" weight="800" color="#FFFFFF" numberOfLines={1} style={{ marginTop: 2 }}>
            {farmer.name}
          </Text>
          <Text variant="caption" weight="600" color="rgba(255,255,255,0.9)" numberOfLines={1} style={{ marginTop: 1 }}>
            {meta}
          </Text>
          <View style={styles.cta}>
            <Text variant="caption" weight="800" color="#34531F">
              His Story →
            </Text>
          </View>
        </View>
        <View style={styles.ava}>
          <Icon name="user" size={26} color="#8B532E" />
        </View>
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
