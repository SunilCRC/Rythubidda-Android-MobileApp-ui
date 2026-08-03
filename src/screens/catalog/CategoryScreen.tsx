import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { catalogService } from '../../api/services';
import { EmptyState, Skeleton, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ProductCard } from '../../components/ProductCard';
import { ProductQuickSheet } from '../../components/ProductQuickSheet';
import { FloatingCartPill } from '../../components/home/FloatingCartPill';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { toArray } from '../../utils/format';
import { hasProductImage } from '../../utils/image';
import { titleCaseCategory } from '../../utils/categoryIcon';
import type { HomeStackParamList } from '../../navigation/types';
import type { Product } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Category'>;

type SortKey = 'popular' | 'priceAsc' | 'new';

/**
 * v3 category browser (per feedback: no side rail — full-width):
 * contextual search header, sort chips, dense 2-col grid, quick
 * sheet on tap, floating cart pill. Category hopping happens via the
 * home bubbles / drawer instead of an in-screen rail.
 */
export const CategoryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { categoryId, name } = route.params;
  const [sort, setSort] = useState<SortKey>('popular');
  const [sheetProductId, setSheetProductId] = useState<number | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['productsByCategory', categoryId],
    queryFn: () => catalogService.getProductsByCategory(categoryId),
  });

  const products = useMemo(() => {
    const list = toArray<Product>(data).filter(hasProductImage);
    if (sort === 'priceAsc') {
      return [...list].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    }
    if (sort === 'new') {
      return [...list].sort(
        (a, b) => Number(b.isNewArrival ?? false) - Number(a.isNewArrival ?? false),
      );
    }
    return list;
  }, [data, sort]);

  return (
    <Container edges={['top']}>
      {/* Contextual search header */}
      <View style={styles.head}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Icon name="arrow-left" size={19} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('Search')}
          style={styles.searchBar}
          android_ripple={{ color: colors.pressed }}
          accessibilityRole="button"
        >
          <Icon name="search" size={15} color={colors.textMuted} />
          <Text variant="bodySmall" color={colors.textMuted} numberOfLines={1}>
            Search in {titleCaseCategory(name)}…
          </Text>
        </Pressable>
      </View>

      <View style={styles.main}>
        <Text variant="body" weight="800" color={colors.textPrimary} numberOfLines={1}>
          {titleCaseCategory(name)}
        </Text>
        <Text variant="caption" weight="700" color={colors.textTertiary}>
          {isLoading ? 'Loading…' : `${products.length} products`}
        </Text>

        <View style={styles.sortRow}>
          {([
            ['popular', 'Popular'],
            ['priceAsc', 'Price ↓'],
            ['new', 'New'],
          ] as Array<[SortKey, string]>).map(([key, label]) => {
            const on = sort === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSort(key)}
                style={[styles.sortChip, on && styles.sortChipOn]}
                accessibilityRole="button"
              >
                <Text variant="caption" weight="800" color={on ? colors.white : colors.textSecondary}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading || !data ? (
          <View style={styles.skeletonGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                height={210}
                width="48%"
                style={{ marginBottom: spacing.md, borderRadius: radius.lg }}
              />
            ))}
          </View>
        ) : products.length === 0 ? (
          <EmptyState
            icon="package"
            title="No products yet"
            subtitle="This category is empty. Check back soon!"
          />
        ) : (
          <FlatList
            data={products}
            keyExtractor={(p, i) => `p-${p.id ?? p.productId ?? i}`}
            numColumns={2}
            refreshing={isFetching}
            onRefresh={refetch}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            columnWrapperStyle={{ gap: spacing.md }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            renderItem={({ item }) => (
              <View style={{ flex: 1 }}>
                <ProductCard
                  product={item}
                  compact
                  onPress={() => setSheetProductId((item.id || item.productId)!)}
                />
              </View>
            )}
          />
        )}
      </View>

      <FloatingCartPill onPress={() => navigation.getParent()?.navigate('CartTab')} />

      <ProductQuickSheet
        visible={sheetProductId != null}
        productId={sheetProductId ?? undefined}
        onClose={() => setSheetProductId(null)}
        onViewDetails={id => navigation.navigate('ProductDetail', { productId: id })}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.tintSoft,
  },
  backBtn: {
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    ...shadows.sm,
  },
  main: { flex: 1, paddingHorizontal: spacing.base, paddingTop: spacing.md },
  sortRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm, marginBottom: spacing.md },
  sortChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  sortChipOn: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  list: { paddingBottom: 96 },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
