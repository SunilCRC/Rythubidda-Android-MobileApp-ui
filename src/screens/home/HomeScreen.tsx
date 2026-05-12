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
import FastImage from 'react-native-fast-image';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { catalogService } from '../../api/services';
import { Skeleton, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { DeliverToPill } from '../../components/DeliverToPill';
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
    navigation.getParent()?.getParent()?.navigate('Auth', { screen: 'Login' });

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
      {/* ── Sophisticated header band ────────────────────────────────────
           Soft cream gradient backdrop carrying the logo, greeting, and
           sign-in / avatar pill. Sets a premium tone before the user even
           scrolls. */}
      <LinearGradient
        colors={[colors.tintSoft, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerBand}
      >
        <View style={styles.topBar}>
          {/* Greeting + sign-in (guest only). Takes remaining horizontal
              space so the brand image on the right has a solid anchor. */}
          <View style={styles.greetCol}>
            <Text variant="caption" weight="700" color={colors.textTertiary}>
              {greet} ✨
            </Text>
            <Text
              variant="h4"
              weight="800"
              color={colors.textPrimary}
              numberOfLines={1}
            >
              {isAuth ? `Hi, ${firstName}` : 'Welcome'}
            </Text>
            <Text
              variant="caption"
              weight="600"
              color={colors.textSecondary}
              numberOfLines={1}
              style={{ marginTop: 2 }}
            >
              {isAuth
                ? 'Fresh harvest, farmer-first.'
                : 'Sign in for fresh deliveries.'}
            </Text>

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
                    weight="800"
                    style={{ marginLeft: 4 }}
                  >
                    Sign In
                  </Text>
                </LinearGradient>
              </Pressable>
            ) : null}
          </View>

          {/* Animated cow GIF — playful brand mark on the right.
              FastImage uses Glide on Android / SDWebImage on iOS, both
              of which decode and loop GIFs natively. No extra deps. */}
          <FastImage
            source={require('../../assets/images/cow-animation.gif')}
            style={styles.brandImage}
            resizeMode={FastImage.resizeMode.contain}
          />
        </View>

        {/* Deliver-to pill — Zepto / Swiggy / Blinkit pattern */}
        <View style={styles.deliverToWrap}>
          <DeliverToPill />
        </View>

        {/* Premium search bar */}
        <View style={styles.searchBarWrap}>
          <Pressable
            onPress={() => navigation.navigate('Search')}
            style={({ pressed }) => [
              styles.searchBar,
              pressed && { opacity: 0.92 },
            ]}
            android_ripple={{ color: colors.pressed }}
          >
            <View style={styles.searchIconWell}>
              <Icon name="search" size={16} color={colors.primary} />
            </View>
            <Text
              variant="body"
              weight="600"
              color={colors.textSecondary}
              style={{ flex: 1, marginLeft: spacing.sm }}
              numberOfLines={1}
            >
              Search rice, jaggery, spices…
            </Text>
            <View style={styles.searchDivider} />
            <View style={styles.micBtn}>
              <Icon name="mic" size={14} color={colors.primary} />
            </View>
          </Pressable>
        </View>
      </LinearGradient>

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
        {/* Hero carousel */}
        {gallery.isLoading ? (
          <Skeleton
            height={188}
            style={{
              marginHorizontal: spacing.base,
              marginTop: spacing.base,
              borderRadius: radius.xl,
            }}
          />
        ) : (
          <View style={styles.heroWrap}>
            <HeroCarousel images={galleryList} height={188} />
          </View>
        )}

        {/* Free shipping promo — wider, more prominent gradient strip */}
        <LinearGradient
          colors={colors.gradients.harvest}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.promoStrip}
        >
          <View style={styles.promoIconWell}>
            <Icon name="truck" size={14} color={colors.primaryDark} />
          </View>
          <Text
            variant="bodySmall"
            color={colors.primaryDark}
            weight="700"
            style={{ marginLeft: spacing.sm, flex: 1 }}
            numberOfLines={1}
          >
            FREE delivery on orders above ₹1,000
          </Text>
          <Icon name="arrow-right" size={14} color={colors.primaryDark} />
        </LinearGradient>

        {/* Categories */}
        <SectionHeader
          title="Shop by category"
          icon="grid"
          action={() => navigation.navigate('CategoriesTab')}
          actionLabel="See all"
        />
        {categories.isLoading ? (
          <View style={styles.hRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={{ marginRight: spacing.base }}>
                <Skeleton
                  width={68}
                  height={68}
                  borderRadius={34}
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
                  <View style={[styles.catIcon, { backgroundColor: color.bg }]}>
                    <Icon name={iconName} size={26} color={color.icon} />
                  </View>
                  <Text
                    variant="caption"
                    color={colors.textPrimary}
                    align="center"
                    numberOfLines={2}
                    weight="700"
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
            <SectionHeader title="Best Sellers" icon="award" />
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
            <SectionHeader title="New Arrivals" icon="zap" />
            <HorizontalProducts
              products={newArrivals}
              onPress={goToProduct(navigation)}
              hideNewArrivalBadge
            />
          </>
        ) : null}

        {/* Featured grid */}
        <SectionHeader title="Featured for you" icon="star" />
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

        {/* Brand footer accent */}
        <View style={styles.footerAccent}>
          <Text
            variant="caption"
            weight="700"
            color={colors.textTertiary}
            align="center"
          >
            🌾  Farm-fresh, farmer-first  🌾
          </Text>
        </View>

        <View style={{ height: spacing['2xl'] }} />
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

/**
 * Section header with a tinted icon well, the title, and an optional
 * trailing action ("See all"). The icon adds a small but consistent
 * visual rhythm across the screen — every section is identifiable at a
 * glance even before the user reads the title.
 */
const SectionHeader: React.FC<{
  title: string;
  icon?: string;
  action?: () => void;
  actionLabel?: string;
}> = ({ title, icon, action, actionLabel }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      {icon ? (
        <View style={styles.sectionIconWell}>
          <Icon name={icon} size={14} color={colors.primary} />
        </View>
      ) : null}
      <Text variant="h5" color={colors.textPrimary} weight="800">
        {title}
      </Text>
    </View>
    {action && actionLabel ? (
      <Pressable
        onPress={action}
        hitSlop={6}
        android_ripple={{ color: colors.pressed, borderless: true, radius: 24 }}
      >
        <View style={styles.sectionActionPill}>
          <Text variant="caption" color={colors.primary} weight="800">
            {actionLabel}
          </Text>
          <Icon name="chevron-right" size={12} color={colors.primary} />
        </View>
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
  // ── Header band ───────────────────────────────────────────────────────
  headerBand: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.tintMid,
    ...shadows.sm,
    zIndex: 5,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  greetCol: { flex: 1, paddingRight: spacing.sm },
  // Large brand image on the right — sized to read as a brand mark, not
  // a profile picture. Matches the visual prominence used by Country
  // Delight, Otipy, and other Indian agri brands on their home headers.
  brandImage: {
    width: 150,
    height: 80,
  },
  signInBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  signInInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
  },
  deliverToWrap: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
  },
  searchBarWrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  searchIconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.sm,
  },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },

  // ── Scroll area ────────────────────────────────────────────────────────
  scroll: { paddingBottom: spacing.xl },

  // Hero
  heroWrap: {
    paddingTop: spacing.base,
  },

  // Promo strip
  promoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderRadius: radius.full,
    marginTop: spacing.base,
    marginHorizontal: spacing.base,
    ...shadows.sm,
  },
  promoIconWell: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIconWell: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.tintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  sectionActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tintSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 2,
  },

  // Categories
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
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...shadows.sm,
  },

  // Featured grid
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

  // Footer accent
  footerAccent: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.base,
    paddingHorizontal: spacing.base,
  },
});
