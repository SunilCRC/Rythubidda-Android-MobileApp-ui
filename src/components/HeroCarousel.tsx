import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
  ViewToken,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import { Text } from './common';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { pickFirstImage } from '../utils/image';
import type { GalleryImage, TodaysFarmer } from '../types';

interface Props {
  images: GalleryImage[];
  height?: number;
  autoPlayIntervalMs?: number;
  /** "Shop now →" CTA on each slide (UX board) — hidden when omitted. */
  onShopPress?: () => void;
  /**
   * Today's farmer — when present, a glass card overlays the right
   * side of the carousel (same treatment as the web hero) and the
   * slide dots move into the card's foot. Space optimization: the
   * farmer no longer needs his own section in the feed.
   */
  farmer?: TodaysFarmer | null;
  onStoryPress?: (farmer: TodaysFarmer) => void;
}

const { width: SCREEN_W } = Dimensions.get('window');

export const HeroCarousel: React.FC<Props> = ({
  images,
  height = 200,
  autoPlayIntervalMs = 4000,
  onShopPress,
  farmer,
  onStoryPress,
}) => {
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const width = SCREEN_W - spacing.base * 2;

  useEffect(() => {
    if (!images || images.length < 2) return;
    const timer = setInterval(() => {
      setIndex(prev => {
        const next = (prev + 1) % images.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, autoPlayIntervalMs);
    return () => clearInterval(timer);
  }, [images, autoPlayIntervalMs]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setIndex(viewableItems[0].index);
      }
    },
  ).current;

  if (!images || images.length === 0) return null;

  const goToSlide = (i: number) => {
    setIndex(i);
    listRef.current?.scrollToIndex({ index: i, animated: true });
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={images}
        keyExtractor={(item, i) => `hero-${item.id ?? i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={width}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
        renderItem={({ item }) => {
          const heading = (item.heading || '').trim();
          const description = (item.description || '').trim();
          return (
            <View style={{ width, height }}>
              <FastImage
                source={{ uri: pickFirstImage(item.imageUrl, item.image, item.url) }}
                style={styles.image}
                resizeMode={FastImage.resizeMode.cover}
              />
              {heading || description ? (
                <>
                  {/* Cream scrim so the admin's heading/description
                      read crisply over any photo — same treatment as
                      the web hero. */}
                  <LinearGradient
                    colors={[
                      'rgba(251,250,245,0.94)',
                      'rgba(251,250,245,0.55)',
                      'rgba(251,250,245,0)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={[styles.copy, farmer ? { maxWidth: '48%' } : null]}>
                    {heading ? (
                      <Text variant="body" weight="800" color={colors.primaryDark} numberOfLines={2}>
                        {heading}
                      </Text>
                    ) : null}
                    {description ? (
                      <Text
                        variant="caption"
                        color={colors.textMuted}
                        numberOfLines={3}
                        style={{ marginTop: 4, lineHeight: 15 }}
                      >
                        {description}
                      </Text>
                    ) : null}
                    {onShopPress ? (
                      <Pressable
                        onPress={onShopPress}
                        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
                        accessibilityRole="button"
                        accessibilityLabel="Shop now"
                      >
                        <Text variant="caption" weight="800" color={colors.white}>
                          Shop now →
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              ) : null}
            </View>
          );
        }}
      />
      {images.length > 1 && !farmer ? (
        <View style={styles.counter}>
          <Text variant="caption" weight="800" color={colors.primaryDark} style={{ fontSize: 10 }}>
            {index + 1} / {images.length}
          </Text>
        </View>
      ) : null}
      {images.length > 1 && !farmer ? (
        <View style={styles.dots}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? colors.primary : colors.palette.neutral[300],
                  width: i === index ? 16 : 6,
                },
              ]}
            />
          ))}
        </View>
      ) : null}

      {/* ── Meet Today's Farmer — glass card overlay, right side, same
           as the web hero. Slide dots live at the card's foot. ── */}
      {farmer ? (
        <View style={styles.farmerWrap} pointerEvents="box-none">
          <View style={styles.farmerCard}>
            <View style={styles.farmerHead}>
              <View style={styles.farmerAva}>
                <Text style={{ fontSize: 14, includeFontPadding: false }}>🧑‍🌾</Text>
              </View>
              <Text
                variant="caption"
                weight="800"
                color={colors.textPrimary}
                style={{ flexShrink: 1, fontSize: 10.5, lineHeight: 13 }}
              >
                Meet Today's Farmer
              </Text>
            </View>
            <View style={styles.farmerDivider} />
            {farmer.cropSpecialty ? (
              <Text variant="caption" color={colors.textMuted} style={styles.farmerFrom} numberOfLines={2}>
                This week's {farmer.cropSpecialty} comes directly from
              </Text>
            ) : null}
            <Text variant="bodySmall" weight="800" color={colors.primaryDark} numberOfLines={1}>
              {farmer.name}
            </Text>
            <Text variant="caption" color={colors.textMuted} style={{ fontSize: 10 }} numberOfLines={1}>
              {farmer.location || ''}
              {farmer.harvestedDaysAgo && farmer.harvestedDaysAgo > 0
                ? `${farmer.location ? ' · ' : ''}Harvested ${farmer.harvestedDaysAgo}d ago`
                : ''}
            </Text>
            <Pressable
              onPress={() => onStoryPress?.(farmer)}
              style={({ pressed }) => [styles.farmerBtn, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel="Know his story"
            >
              <Text variant="caption" weight="800" color={colors.primary} style={{ fontSize: 10.5 }}>
                Know His Story →
              </Text>
            </Pressable>
            {images.length > 1 ? (
              <View style={styles.farmerDots}>
                {images.map((_, i) => (
                  <Pressable key={i} onPress={() => goToSlide(i)} hitSlop={6}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: i === index ? colors.primary : colors.palette.neutral[300],
                          width: i === index ? 14 : 6,
                        },
                      ]}
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.palette.secondary[100],
  },
  image: { width: '100%', height: '100%' },
  copy: {
    position: 'absolute',
    left: spacing.base,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    maxWidth: '64%',
  },
  counter: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255,253,248,0.92)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cta: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  // Bottom-LEFT per the UX board (was centered).
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.base,
    gap: 4,
  },
  dot: { height: 6, borderRadius: 3 },

  // ── Farmer overlay (web-hero treatment, scaled for mobile) ──
  farmerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: spacing.sm,
  },
  farmerCard: {
    width: 158,
    backgroundColor: 'rgba(255,253,248,0.95)',
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    shadowColor: '#231810',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  farmerHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  farmerAva: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.tintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5D6BC',
    marginVertical: 7,
  },
  farmerFrom: { fontSize: 9.5, lineHeight: 12, marginBottom: 3 },
  farmerBtn: {
    marginTop: 7,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 5,
    alignItems: 'center',
  },
  farmerDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
});
