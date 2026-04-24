import React, { useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import FastImage from 'react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../../api/services';
import { LoadingScreen, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { toArray } from '../../utils/format';
import { isValidImageUrl, resolveImageUrl } from '../../utils/image';
import type { Category } from '../../types';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = spacing.base;
const H_PADDING = spacing.base;
const CARD_W = (SCREEN_W - H_PADDING * 2 - GRID_GAP) / 2;

// A small set of icons we cycle through so every category gets a
// distinct, confident visual hint even when the backend has no image.
const ICON_CYCLE = [
  'shopping-bag',
  'coffee',
  'box',
  'gift',
  'droplet',
  'award',
  'feather',
  'sun',
];

/**
 * Bold, visually-rich category grid.
 * Each tile rotates through 6 lighter warm-brown tints so the grid
 * feels alive without adding extra brand colors.
 */
export const CategoriesListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['categories'],
    queryFn: catalogService.getCategories,
  });

  const categories = useMemo(() => toArray<Category>(data), [data]);

  if (isLoading) return <LoadingScreen message="Loading categories..." />;

  const navigate = (cat: Category) => {
    navigation.navigate('Category', {
      categoryId: (cat.id || cat.categoryId)!,
      name: cat.name,
    });
  };

  return (
    <Container edges={['top']}>
      <View style={styles.headerWrap}>
        <Text variant="h3" color={colors.textPrimary} weight="800">
          Shop by Category
        </Text>
        <Text
          variant="bodySmall"
          color={colors.textSecondary}
          weight="600"
          style={{ marginTop: 4 }}
        >
          Hand-picked essentials from our farmers.
        </Text>
      </View>
      <FlatList
        data={categories}
        keyExtractor={(c, i) => `cat-${c.id ?? c.categoryId ?? i}`}
        contentContainerStyle={styles.list}
        refreshing={isFetching}
        onRefresh={refetch}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
        renderItem={({ item, index }) => (
          <CategoryTile
            category={item}
            index={index}
            onPress={() => navigate(item)}
          />
        )}
      />
    </Container>
  );
};

interface TileProps {
  category: Category;
  index: number;
  onPress: () => void;
}

const CategoryTile: React.FC<TileProps> = ({ category, index, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const tint = colors.categoryTints[index % colors.categoryTints.length];
  const iconName = ICON_CYCLE[index % ICON_CYCLE.length];
  const hasImage = isValidImageUrl(category.image);
  const subCount =
    category.children?.length ?? category.subcategories?.length ?? 0;

  return (
    <Animated.View style={{ transform: [{ scale }], width: CARD_W }}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        android_ripple={{ color: colors.pressed }}
        style={styles.tile}
      >
        {/* Tinted top */}
        <View style={[styles.art, { backgroundColor: tint }]}>
          {hasImage ? (
            <FastImage
              source={{ uri: resolveImageUrl(category.image!) }}
              style={styles.artImage}
              resizeMode={FastImage.resizeMode.contain}
            />
          ) : (
            <View style={styles.iconWrap}>
              <Icon name={iconName} size={36} color={colors.primary} />
            </View>
          )}
        </View>
        {/* Label */}
        <View style={styles.label}>
          <Text
            variant="bodyBold"
            color={colors.textPrimary}
            weight="700"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={styles.labelText}
          >
            {category.name}
          </Text>
          {subCount > 0 ? (
            <Text
              variant="caption"
              color={colors.primary}
              weight="700"
              style={{ marginTop: 2 }}
            >
              {subCount} {subCount === 1 ? 'item' : 'items'}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: H_PADDING,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: H_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  row: { gap: GRID_GAP },
  tile: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  art: {
    width: '100%',
    height: CARD_W * 0.72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artImage: { width: '78%', height: '78%' },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  label: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 60,
    justifyContent: 'center',
  },
  labelText: { minHeight: 38 },
});
