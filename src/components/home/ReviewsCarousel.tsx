import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, View, ViewToken } from 'react-native';
import { Text } from '../common';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import type { ApprovedReview } from '../../types';

/**
 * "What Our Customers Say" — swipeable carousel of ADMIN-APPROVED
 * reviews (status = 1 in the admin Reviews page), auto-advancing
 * every 4 s with an "n / total" counter. Renders nothing when the
 * list is empty — real data or nothing.
 */
interface Props {
  reviews: ApprovedReview[];
  /** Half-width card for the farmer+reviews duo row — no ‹ ›
      arrows, tighter type, parent owns the margins. */
  compact?: boolean;
  /** Actual rendered card width — REQUIRED for correct paging when
      the card isn't full-bleed (the duo row). */
  pageWidth?: number;
}

const SCREEN_W = Dimensions.get('window').width;

export const ReviewsCarousel: React.FC<Props> = ({ reviews, compact, pageWidth }) => {
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const width = pageWidth ?? SCREEN_W - spacing.base * 2;

  useEffect(() => {
    if (reviews.length < 2) return;
    const t = setInterval(() => {
      setIndex(prev => {
        const next = (prev + 1) % reviews.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [reviews]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setIndex(viewableItems[0].index);
      }
    },
  ).current;

  const goTo = (next: number) => {
    const clamped = (next + reviews.length) % reviews.length;
    setIndex(clamped);
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
  };

  if (!reviews || reviews.length === 0) return null;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={[styles.head, compact && styles.headCompact]}>
        <Text
          variant="body"
          weight="800"
          color={colors.textPrimary}
          numberOfLines={1}
          style={compact ? { fontSize: 12, flexShrink: 1 } : undefined}
        >
          What Our Customers Say
        </Text>
        {/* ‹ › paging circles per the UX board */}
        {compact ? null : (
        <View style={styles.nav}>
          <Pressable
            onPress={() => goTo(index - 1)}
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Previous review"
          >
            <Text style={styles.navGlyph}>‹</Text>
          </Pressable>
          <Pressable
            onPress={() => goTo(index + 1)}
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Next review"
          >
            <Text style={styles.navGlyph}>›</Text>
          </Pressable>
        </View>
        )}
      </View>
      <FlatList
        ref={listRef}
        data={reviews}
        keyExtractor={r => `rev-${r.id}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={width}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => {
          const stars = Math.max(1, Math.min(5, item.rating || 5));
          const quote = (item.review || '').trim() || (item.title || '').trim();
          return (
            <View style={{ width, paddingHorizontal: compact ? spacing.md : spacing.base, paddingBottom: compact ? spacing.sm + 2 : spacing.base }}>
              <Text style={compact ? { ...styles.quoteMark, fontSize: 18, lineHeight: 20, marginTop: 2 } : styles.quoteMark}>“</Text>
              <Text
                variant="bodySmall"
                weight="600"
                color={colors.textPrimary}
                numberOfLines={compact ? 2 : 3}
                style={compact ? { fontSize: 11, lineHeight: 15 } : { lineHeight: 19 }}
              >
                {quote}
              </Text>
              <Text style={compact ? { ...styles.stars, fontSize: 11, marginTop: 4, marginBottom: 2 } : styles.stars}>
                {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
              </Text>
              <Text
                variant="caption"
                weight="700"
                color={colors.textTertiary}
                numberOfLines={1}
                style={compact ? { fontSize: 9 } : undefined}
              >
                — {item.customerName || 'Verified Customer'}
                {item.productName ? ` · ${item.productName}` : ''}
              </Text>
            </View>
          );
        }}
      />
      {/* "n / N" counter — full-width card only; the compact duo-row
          card drops it to save vertical space (auto-rotation still
          runs silently). */}
      {compact ? null : (
        <Text
          variant="caption"
          weight="800"
          color={colors.textMuted}
          align="center"
          style={styles.counter}
        >
          {index + 1} / {reviews.length}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  // Duo-row variant: parent row owns the margins; card fills its
  // half-column and matches the farmer banner's height.
  cardCompact: {
    marginHorizontal: 0,
    marginTop: 0,
    flex: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    paddingBottom: spacing.xs,
  },
  headCompact: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  quoteMark: {
    fontSize: 26,
    lineHeight: 28,
    color: colors.primary,
    fontWeight: '900',
  },
  stars: {
    color: colors.warning,
    fontSize: 13,
    letterSpacing: 2,
    marginTop: 7,
    marginBottom: 3,
  },
  nav: { flexDirection: 'row', gap: 5 },
  navBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.tintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navGlyph: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '800',
    color: colors.primaryDark,
    includeFontPadding: false,
  },
  counter: { fontSize: 9.5, paddingBottom: spacing.sm },
});
