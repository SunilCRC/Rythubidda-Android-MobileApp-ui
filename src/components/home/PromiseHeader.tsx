import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { Text } from '../common';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { iconForCategory, titleCaseCategory } from '../../utils/categoryIcon';
import type { Category } from '../../types';

/**
 * v3 market-grade header (approved board): the Zepto/Blinkit
 * "promise-first" pattern in Rythu Bidda's skin.
 *
 *   • Promise line — "Farm-fresh in 24 hrs" — instead of a logo;
 *     the location line sits under it (tap → LocationPicker).
 *   • Bell + profile as stroke icons (Feather), no emojis.
 *   • Search bar with a ROTATING placeholder (Instamart pattern).
 *   • Photo category bubbles replace text chips — image when the
 *     backend category has one, category emoji as the fallback.
 */
interface Props {
  categories: Category[];
  locationLabel: string;
  searchHints?: string[];
  onLocationPress: () => void;
  onSearchPress: () => void;
  onProfilePress: () => void;
  onCategoryPress: (category: Category) => void;
}

const DEFAULT_HINTS = ['cold-pressed oil', 'ragi batter', 'dry fruits', 'millets', 'brown rice'];

export const PromiseHeader: React.FC<Props> = ({
  categories,
  locationLabel,
  searchHints,
  onLocationPress,
  onSearchPress,
  onProfilePress,
  onCategoryPress,
}) => {
  const hints = searchHints && searchHints.length > 0 ? searchHints : DEFAULT_HINTS;
  const [hintIdx, setHintIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setHintIdx(i => (i + 1) % hints.length), 3000);
    return () => clearInterval(t);
  }, [hints.length]);

  return (
    <LinearGradient
      colors={[colors.tintMid, colors.tintSoft]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.band}
    >
      <View style={styles.topRow}>
        {/* Brand logo — the full RYTHU BIDDA plough mark, the SAME
            asset the splash screen uses so splash → home feels
            continuous. Multiply blend melts its white background
            into the cream header. */}
        <Image
          source={require('../../assets/images/brand-logo.gif')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Rythu Bidda"
        />
        <Pressable
          onPress={onProfilePress}
          android_ripple={{ color: colors.pressed, borderless: true, radius: 20 }}
          style={styles.roundBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Icon name="user" size={17} color={colors.primaryDark} />
        </Pressable>
      </View>

      {/* Delivery location — one tappable line under the logo. */}
      <Pressable onPress={onLocationPress} hitSlop={8} style={styles.locRow}>
        <Icon name="map-pin" size={12} color={colors.textTertiary} />
        <Text variant="caption" weight="700" color={colors.textSecondary} numberOfLines={1} style={{ flexShrink: 1 }}>
          {' '}{locationLabel}
        </Text>
        <Text variant="caption" weight="800" color={colors.primary}> · Change</Text>
      </Pressable>

      <Pressable
        onPress={onSearchPress}
        android_ripple={{ color: colors.pressed }}
        style={({ pressed }) => [styles.searchBar, pressed && { opacity: 0.9 }]}
        accessibilityRole="button"
        accessibilityLabel="Search products"
      >
        <Icon name="search" size={16} color={colors.textMuted} />
        <Text variant="bodySmall" color={colors.textMuted} numberOfLines={1}>
          Search "<Text variant="bodySmall" weight="700" color={colors.textSecondary}>{hints[hintIdx]}</Text>"
        </Text>
      </Pressable>

      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bubbles}
        >
          {categories.slice(0, 12).map(c => (
            <Pressable
              key={String(c.id ?? c.categoryId ?? c.name)}
              onPress={() => onCategoryPress(c)}
              style={({ pressed }) => [styles.bub, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={`Browse ${c.name}`}
            >
              {/* Icon bubbles (user preference over photos) — the
                  category-accurate emoji on a warm squircle. */}
              <View style={styles.bubIm}>
                <Text style={styles.bubEmoji}>{iconForCategory(c.name)}</Text>
              </View>
              <Text variant="caption" weight="800" color={colors.textSecondary} numberOfLines={1} style={styles.bubLabel}>
                {titleCaseCategory(c.name || '')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  band: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  // The plough logo is a wide lockup (~2.9:1) — size it to carry the
  // header without crowding the profile button on 360dp phones.
  logo: {
    width: 172,
    height: 60,
    mixBlendMode: 'multiply' as any,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.tintStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    ...shadows.sm,
  },
  bubbles: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 2,
  },
  bub: { width: 58, alignItems: 'center' },
  bubIm: {
    width: 56,
    height: 56,
    borderRadius: 19,
    backgroundColor: colors.tintSoft,
    borderWidth: 1,
    borderColor: colors.tintStrong,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bubImg: { width: '100%', height: '100%' },
  bubEmoji: { fontSize: 24, includeFontPadding: false },
  bubLabel: { marginTop: 4, fontSize: 9.5, maxWidth: 58 },
});
