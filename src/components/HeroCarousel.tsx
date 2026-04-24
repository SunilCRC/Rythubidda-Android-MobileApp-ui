import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
  ViewToken,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { pickFirstImage } from '../utils/image';
import type { GalleryImage } from '../types';

interface Props {
  images: GalleryImage[];
  height?: number;
  autoPlayIntervalMs?: number;
}

const { width: SCREEN_W } = Dimensions.get('window');

export const HeroCarousel: React.FC<Props> = ({
  images,
  height = 200,
  autoPlayIntervalMs = 4000,
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
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            <FastImage
              source={{ uri: pickFirstImage(item.imageUrl, item.image, item.url) }}
              style={styles.image}
              resizeMode={FastImage.resizeMode.cover}
            />
          </View>
        )}
      />
      {images.length > 1 ? (
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
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    gap: 4,
  },
  dot: { height: 6, borderRadius: 3 },
});
