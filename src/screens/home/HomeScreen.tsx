import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { catalogService } from '../../api/services';
import { Skeleton, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { HeroCarousel } from '../../components/HeroCarousel';
import { ProductCard } from '../../components/ProductCard';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { useAuthStore, useIsAuthenticated } from '../../store';
import { toArray } from '../../utils/format';
import { hasProductImage } from '../../utils/image';
import type { Category, GalleryImage, Product } from '../../types';

// Show ~2 cards per screen width — slight peek of the third to hint "scroll me".
const SCREEN_W = Dimensions.get('window').width;
const PRODUCT_CARD_WIDTH = Math.floor((SCREEN_W - 16 * 2 - 12) / 2);

// Curated background palette for category chips — cycled deterministically
// so the same category gets the same color every render.
const CATEGORY_COLORS: Array<{ bg: string; icon: string }> = [
  { bg: colors.palette.primary[50], icon: colors.primary },
  { bg: colors.palette.secondary[50], icon: colors.secondaryDark },
  { bg: '#FFF1E8', icon: colors.accentDark },
  { bg: '#E8F4FF', icon: colors.info },
  { bg: '#F3ECFF', icon: '#7E4FE0' },
  { bg: '#FFE8EE', icon: '#D4486E' },
];

const CATEGORY_ICONS = [
  'shopping-bag',
  'coffee',
  'droplet',
  'package',
  'gift',
  'star',
  'heart',
  'feather',
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore(s => s.user);
  const isAuth = useIsAuthenticated();

  const openLogin = () =>
    navigation
      .getParent()
      ?.getParent()
      ?.navigate('Auth', { screen: 'Login' });

  const gallery = useQuery({
    queryKey: ['gallery'],
    queryFn: catalogService.getGallery,
    staleTime: 5 * 60 * 1000,
  });
  const featured = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: catalogService.getFeaturedProducts,
    staleTime: 5 * 60 * 1000,
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: catalogService.getCategories,
    staleTime: 10 * 60 * 1000,
  });

  const refreshing =
    gallery.isFetching || featured.isFetching || categories.isFetching;

  const onRefresh = useCallback(() => {
    gallery.refetch();
    featured.refetch();
    categories.refetch();
  }, [gallery, featured, categories]);

  // Show only products that have real images coming from the backend.
  const featuredList = useMemo(
    () => toArray<Product>(featured.data).filter(hasProductImage),
    [featured.data],
  );
  const categoriesList = useMemo(
    () => toArray<Category>(categories.data),
    [categories.data],
  );
  const galleryList = useMemo(
    () => toArray<GalleryImage>(gallery.data),
    [gallery.data],
  );
  const bestSellers = useMemo(
    () => featuredList.filter(p => p.isBestSeller),
    [featuredList],
  );
  const newArrivals = useMemo(
    () => featuredList.filter(p => p.isNewArrival),
    [featuredList],
  );

  const greet = greeting();
  const firstName = user?.firstname || user?.firstName || 'there';

  return (
    <Container edges={['top']} background={colors.background}>
      {/* Sticky top bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={colors.textTertiary}>
            {greet}
          </Text>
          <Text
            variant="h5"
            color={colors.textPrimary}
            weight="700"
            numberOfLines={1}
          >
            {isAuth ? `Hi, ${firstName} 👋` : 'Welcome to Rythu Bidda'}
          </Text>
        </View>
        {!isAuth ? (
          <Pressable
            onPress={openLogin}
            android_ripple={{ color: colors.pressed }}
            style={styles.signInBtn}
            hitSlop={6}
          >
            <LinearGradient
              colors={colors.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.signInInner}
            >
              <Icon name="log-in" size={12} color={colors.white} />
              <Text
                variant="caption"
                color={colors.white}
                weight="700"
                style={{ marginLeft: 4 }}
              >
                Sign In
              </Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Prominent search bar */}
        <Pressable
          onPress={() => navigation.navigate('Search')}
          style={styles.searchBar}
          android_ripple={{ color: colors.pressed }}
        >
          <Icon name="search" size={18} color={colors.textTertiary} />
          <Text
            variant="body"
            color={colors.textTertiary}
            style={{ flex: 1, marginLeft: spacing.sm }}
          >
            Search for rice, jaggery, spices…
          </Text>
          <View style={styles.searchDivider} />
          <Icon name="mic" size={16} color={colors.primary} />
        </Pressable>

        {/* Hero */}
        {gallery.isLoading ? (
          <Skeleton
            height={180}
            style={{
              marginHorizontal: spacing.base,
              marginTop: spacing.base,
              borderRadius: radius.xl,
            }}
          />
        ) : (
          <HeroCarousel images={galleryList} height={180} />
        )}

        {/* Free shipping strip */}
        <LinearGradient
          colors={colors.gradients.harvest}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.promoStrip}
        >
          <Icon name="truck" size={15} color={colors.primaryDark} />
          <Text
            variant="bodySmall"
            color={colors.primaryDark}
            weight="600"
            style={{ marginLeft: 6 }}
          >
            Free delivery on orders above ₹1,000
          </Text>
        </LinearGradient>

        {/* Categories */}
        <SectionHeader
          title="Shop by category"
          action={() => navigation.navigate('CategoriesTab')}
          actionLabel="See all"
        />
        {categories.isLoading ? (
          <View style={styles.hRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={{ marginRight: spacing.base }}>
                <Skeleton
                  width={64}
                  height={64}
                  borderRadius={32}
                  style={{ marginBottom: 6 }}
                />
                <Skeleton width={60} height={10} borderRadius={5} />
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={categoriesList}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(c, i) => `cat-${c.id ?? c.categoryId ?? i}`}
            contentContainerStyle={styles.hList}
            renderItem={({ item, index }) => {
              const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
              const iconName =
                CATEGORY_ICONS[index % CATEGORY_ICONS.length] || 'circle';
              return (
                <Pressable
                  onPress={() =>
                    navigation.navigate('Category', {
                      categoryId: (item.id || item.categoryId)!,
                      name: item.name,
                    })
                  }
                  style={styles.catItem}
                  android_ripple={{ color: colors.pressed, borderless: true, radius: 40 }}
                >
                  <View
                    style={[styles.catIcon, { backgroundColor: color.bg }]}
                  >
                    <Icon name={iconName} size={24} color={color.icon} />
                  </View>
                  <Text
                    variant="caption"
                    color={colors.textPrimary}
                    align="center"
                    numberOfLines={2}
                    weight="600"
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}

        {/* Best Sellers */}
        {bestSellers.length > 0 ? (
          <>
            <SectionHeader title="🏆 Best Sellers" />
            <HorizontalProducts
              products={bestSellers}
              onPress={goToProduct(navigation)}
              hideBestSellerBadge
            />
          </>
        ) : null}

        {/* New Arrivals */}
        {newArrivals.length > 0 ? (
          <>
            <SectionHeader title="✨ New Arrivals" />
            <HorizontalProducts
              products={newArrivals}
              onPress={goToProduct(navigation)}
              hideNewArrivalBadge
            />
          </>
        ) : null}

        {/* Featured grid */}
        <SectionHeader title="Featured for you" />
        {featured.isLoading ? (
          <View style={styles.skeletonGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                width="48%"
                height={240}
                borderRadius={radius.xl}
                style={{ marginBottom: spacing.base }}
              />
            ))}
          </View>
        ) : featuredList.length > 0 ? (
          <View style={styles.grid}>
            {featuredList.map((p, i) => (
              <View
                key={`feat-${p.id ?? p.productId ?? i}`}
                style={styles.gridItem}
              >
                <ProductCard
                  product={p}
                  onPress={() =>
                    navigation.navigate('ProductDetail', {
                      productId: (p.id || p.productId)!,
                    })
                  }
                />
              </View>
            ))}
          </View>
        ) : (
          <Text
            variant="bodySmall"
            color={colors.textTertiary}
            align="center"
            style={{ padding: spacing.xl }}
          >
            Nothing here yet. Pull down to refresh.
          </Text>
        )}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </Container>
  );
};

function goToProduct(navigation: any) {
  return (productId: number) =>
    navigation.navigate('ProductDetail', { productId });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const SectionHeader: React.FC<{
  title: string;
  action?: () => void;
  actionLabel?: string;
}> = ({ title, action, actionLabel }) => (
  <View style={styles.sectionHeader}>
    <Text variant="h5" color={colors.textPrimary} weight="700">
      {title}
    </Text>
    {action && actionLabel ? (
      <Pressable onPress={action} hitSlop={6}>
        <Text variant="bodySmall" color={colors.primary} weight="700">
          {actionLabel}
        </Text>
      </Pressable>
    ) : null}
  </View>
);

const AUTO_SCROLL_INTERVAL_MS = 3500;
const CARD_STRIDE = PRODUCT_CARD_WIDTH + spacing.md;

const HorizontalProducts: React.FC<{
  products: Product[];
  onPress: (id: number) => void;
  hideBestSellerBadge?: boolean;
  hideNewArrivalBadge?: boolean;
  autoScroll?: boolean;
}> = ({
  products,
  onPress,
  hideBestSellerBadge,
  hideNewArrivalBadge,
  autoScroll = true,
}) => {
  const listRef = useRef<FlatList<Product>>(null);
  const indexRef = useRef(0);
  const userTouchingRef = useRef(false);

  useEffect(() => {
    if (!autoScroll || products.length < 3) return;
    const timer = setInterval(() => {
      if (userTouchingRef.current) return;
      // Advance by 2 cards at a time (matches "2 per row" rhythm).
      const next = (indexRef.current + 2) % products.length;
      indexRef.current = next;
      try {
        listRef.current?.scrollToOffset({
          offset: next * CARD_STRIDE,
          animated: true,
        });
      } catch {
        // ignore — list may not be laid out yet
      }
    }, AUTO_SCROLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [autoScroll, products.length]);

  return (
    <FlatList
      ref={listRef}
      data={products}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(p, i) => `p-${p.id ?? p.productId ?? i}`}
      contentContainerStyle={styles.hList}
      snapToInterval={CARD_STRIDE}
      decelerationRate="fast"
      onScrollBeginDrag={() => {
        userTouchingRef.current = true;
      }}
      onScrollEndDrag={() => {
        // Resume auto-scroll a few seconds after user releases
        setTimeout(() => {
          userTouchingRef.current = false;
        }, 2000);
      }}
      onMomentumScrollEnd={e => {
        indexRef.current = Math.round(
          e.nativeEvent.contentOffset.x / CARD_STRIDE,
        );
      }}
      renderItem={({ item }) => (
        <View style={{ marginRight: spacing.md }}>
          <ProductCard
            product={item}
            width={PRODUCT_CARD_WIDTH}
            onPress={() => onPress((item.id || item.productId)!)}
            hideBestSellerBadge={hideBestSellerBadge}
            hideNewArrivalBadge={hideNewArrivalBadge}
          />
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  signInBtn: {
    borderRadius: 999,
    overflow: 'hidden',
    ...shadows.sm,
  },
  signInInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 7,
  },
  scroll: { paddingBottom: spacing.xl },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  searchDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.sm,
  },
  promoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  hRow: { flexDirection: 'row', paddingHorizontal: spacing.base },
  hList: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  catItem: {
    width: 78,
    alignItems: 'center',
    marginRight: spacing.base,
  },
  catIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
  },
  gridItem: {
    width: '48.5%',
    marginBottom: spacing.base,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
  },
});
