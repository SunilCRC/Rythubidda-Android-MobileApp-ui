import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
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
import { iconForCategory, titleCaseCategory } from '../../utils/categoryIcon';
import type { Category, Product } from '../../types';

type SortKey = 'popular' | 'priceAsc' | 'new';

/**
 * SHOP tab (user feedback): aisle browsing in one screen — category
 * names + icons down the left rail, that category's products on the
 * right. Tap an aisle → products swap in place. Empty categories say
 * "No products" (never endless skeletons).
 */
export const ShopScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>('popular');
  const [sheetProductId, setSheetProductId] = useState<number | null>(null);

  const categoriesQ = useQuery({
    queryKey: ['categories'],
    queryFn: catalogService.getCategories,
    staleTime: 10 * 60 * 1000,
  });

  const rail = useMemo(
    () =>
      toArray<Category>(categoriesQ.data).filter(
        c => c.name.trim().toLowerCase() !== 'all products' && c.name.trim().toLowerCase() !== 'all',
      ),
    [categoriesQ.data],
  );

  // First aisle auto-selects once categories arrive.
  useEffect(() => {
    if (activeId == null && rail.length > 0) {
      const first = Number(rail[0].id ?? rail[0].categoryId);
      if (first) setActiveId(first);
    }
  }, [rail, activeId]);

  const activeName = useMemo(() => {
    const c = rail.find(r => Number(r.id ?? r.categoryId) === activeId);
    return c ? titleCaseCategory(c.name) : '';
  }, [rail, activeId]);

  const productsQ = useQuery({
    queryKey: ['productsByCategory', activeId],
    queryFn: () => catalogService.getProductsByCategory(activeId!),
    enabled: activeId != null,
  });

  const products = useMemo(() => {
    const list = toArray<Product>(productsQ.data).filter(hasProductImage);
    if (sort === 'priceAsc') {
      return [...list].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    }
    if (sort === 'new') {
      return [...list].sort(
        (a, b) => Number(b.isNewArrival ?? false) - Number(a.isNewArrival ?? false),
      );
    }
    return list;
  }, [productsQ.data, sort]);

  // Skeletons ONLY while genuinely loading — a settled empty answer
  // must show "No products", never endless placeholders.
  const loadingProducts =
    activeId == null ||
    productsQ.isLoading ||
    (productsQ.data === undefined && productsQ.isFetching);

  return (
    <Container edges={['top']}>
      {/* Search header */}
      <View style={styles.head}>
        <Text variant="h5" weight="800" color={colors.primaryDark}>
          Categories
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Search')}
          style={styles.searchBar}
          android_ripple={{ color: colors.pressed }}
          accessibilityRole="button"
        >
          <Icon name="search" size={15} color={colors.textMuted} />
          <Text variant="bodySmall" color={colors.textMuted} numberOfLines={1}>
            {activeName ? `Search in ${activeName}…` : 'Search products…'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* ── Category rail ── */}
        {categoriesQ.isLoading ? (
          <View style={[styles.rail, { paddingHorizontal: 8, paddingTop: 8 }]}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={56} style={{ marginBottom: spacing.sm, borderRadius: radius.md }} />
            ))}
          </View>
        ) : (
          <ScrollView style={styles.rail} showsVerticalScrollIndicator={false}>
            {rail.map(c => {
              const id = Number(c.id ?? c.categoryId);
              const on = id === activeId;
              return (
                <Pressable
                  key={String(id)}
                  onPress={() => {
                    if (id && id !== activeId) {
                      setActiveId(id);
                      setSort('popular');
                    }
                  }}
                  style={[styles.railItem, on && styles.railItemOn]}
                  accessibilityRole="button"
                  accessibilityLabel={`Browse ${c.name}`}
                >
                  {on ? <View style={styles.railSpine} /> : null}
                  <View style={[styles.railIm, on && styles.railImOn]}>
                    <Text style={styles.railEmoji}>{iconForCategory(c.name)}</Text>
                  </View>
                  <Text
                    variant="caption"
                    weight="800"
                    color={on ? colors.primaryDark : colors.textTertiary}
                    numberOfLines={2}
                    align="center"
                    style={styles.railLabel}
                  >
                    {titleCaseCategory(c.name)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ── Products pane ── */}
        <View style={styles.main}>
          <Text variant="body" weight="800" color={colors.textPrimary} numberOfLines={1}>
            {activeName || 'Products'}
          </Text>
          <Text variant="caption" weight="700" color={colors.textTertiary}>
            {loadingProducts ? 'Loading…' : `${products.length} product${products.length === 1 ? '' : 's'}`}
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

          {loadingProducts ? (
            <View style={styles.skeletonGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  height={190}
                  width="48%"
                  style={{ marginBottom: spacing.md, borderRadius: radius.lg }}
                />
              ))}
            </View>
          ) : products.length === 0 ? (
            <EmptyState
              icon="package"
              title="No products"
              subtitle={`Nothing in ${activeName || 'this category'} yet. Check back soon!`}
            />
          ) : (
            <FlatList
              data={products}
              keyExtractor={(p, i) => `p-${p.id ?? p.productId ?? i}`}
              numColumns={2}
              refreshing={productsQ.isFetching}
              onRefresh={productsQ.refetch}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              columnWrapperStyle={{ gap: spacing.sm }}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
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
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.tintSoft,
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
  body: { flex: 1, flexDirection: 'row' },
  rail: {
    width: 74,
    backgroundColor: '#F5EBDD',
    flexGrow: 0,
  },
  railItem: {
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  railItemOn: {
    backgroundColor: colors.background,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  railSpine: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3.5,
    borderRadius: 99,
    backgroundColor: colors.primary,
  },
  railIm: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.tintStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railImOn: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  railEmoji: { fontSize: 20, includeFontPadding: false },
  railLabel: { marginTop: 3, fontSize: 8.5, lineHeight: 10.5 },
  main: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },
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
