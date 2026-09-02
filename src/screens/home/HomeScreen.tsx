import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import FastImage from 'react-native-fast-image';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { catalogService, homeContentService } from '../../api/services';
import { Skeleton, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { HeroCarousel } from '../../components/HeroCarousel';
import { PromiseHeader } from '../../components/home/PromiseHeader';
import { SavingsStrip } from '../../components/home/SavingsStrip';
import { DealSpotlight } from '../../components/home/DealSpotlight';
import { FarmerStoryBanner } from '../../components/home/FarmerStoryBanner';
import { FloatingCartPill } from '../../components/home/FloatingCartPill';
import { ProductQuickSheet } from '../../components/ProductQuickSheet';
import { ReviewsCarousel } from '../../components/home/ReviewsCarousel';
import { ProductCard } from '../../components/ProductCard';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { useCartStore, useIsAuthenticated, useLocationStore } from '../../store';
import { toArray } from '../../utils/format';
import { hasProductImage } from '../../utils/image';
import { iconForCategory, titleCaseCategory } from '../../utils/categoryIcon';
import type { Category, GalleryImage, Product, TodaysDeal } from '../../types';

// Show ~2 cards per screen width — slight peek of the third to hint "scroll me".
const SCREEN_W = Dimensions.get('window').width;
// (grid tiles size themselves via styles.gridItem 48.5%)

// Farmer + Reviews duo row: each card takes half the row minus the gap.
const DUO_CARD_W = Math.floor((SCREEN_W - 16 * 2 - 10) / 2);

// Responsive brand-image width — bounded so it doesn't dominate small
// phones (320dp) or look tiny on tablets. The header reserves ~120dp
// for the menu + profile buttons + padding; the cow takes the rest up
// to a cap.
const BRAND_W = Math.max(120, Math.min(160, SCREEN_W * 0.42));
const BRAND_H = Math.round(BRAND_W * 0.4); // ~2.5 : 1 aspect

// Side-drawer geometry — capped so on tablets it doesn't take half the
// screen, and on small phones it leaves a visible backdrop strip the
// user can tap to dismiss.
const DRAWER_W = Math.min(320, SCREEN_W * 0.82);

// Must stay in sync with `tabBarStyle.height` in MainTabs.tsx. Used by
// the side-drawer + backdrop so the drawer panel ends ABOVE the bottom
// tab bar instead of overlapping it.
const TABBAR_HEIGHT = 64;

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

// CATEGORY_ICONS Feather cycle removed — was producing wrong icons
// (coffee cup for Cashew, droplet for Chilli, etc.). Replaced by
// `iconForCategory()` in utils/categoryIcon.ts which picks an emoji
// matching the actual category name.

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  // Safe-area insets — used by the side-drawer so its header sits
  // BELOW the status bar / notch instead of being painted under it.
  const insets = useSafeAreaInsets();

  // Jump from inside HomeStack (inside HomeTab) up to the bottom-tab
  // navigator and over to the ProfileTab. ProfileScreen itself decides
  // whether to show the SignInPrompt (guest) or the full profile (auth)
  // — we don't need to branch here.
  const openProfile = () =>
    navigation.getParent()?.navigate('ProfileTab');


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
  // Home dynamic content — all three endpoints were built for the web
  // shop and hide themselves (null / []) when nothing is configured.
  const deal = useQuery({
    queryKey: ['todaysDeal'],
    queryFn: homeContentService.getCurrentDeal,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // countdown-critical: follow admin edits
  });
  const farmer = useQuery({
    queryKey: ['todaysFarmer'],
    queryFn: homeContentService.getTodaysFarmer,
    staleTime: 5 * 60 * 1000,
  });
  const reviews = useQuery({
    queryKey: ['approvedReviews'],
    queryFn: homeContentService.getApprovedReviews,
    staleTime: 5 * 60 * 1000,
  });
  // FIRST10 strip — guests always see the pitch (they'd be eligible
  // after signing up); signed-in customers only while still eligible.
  const isAuthenticated = useIsAuthenticated();
  const firstOrder = useQuery({
    queryKey: ['firstOrderDiscount', isAuthenticated],
    queryFn: homeContentService.getFirstOrderDiscount,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
  const showFirstOrderStrip =
    !isAuthenticated || firstOrder.data?.eligible === true;

  // Live cart subtotal drives the savings strip's "You're saving ₹X".
  const cartSubtotal = useCartStore(s => s.cart?.subtotal ?? 0);

  // Location label for the promise-first header.
  const location = useLocationStore(s => s.location);
  const locationLabel = location?.pincode
    ? `${location.area || location.city || ''}${location.area || location.city ? ', ' : ''}${location.pincode}`
    : 'Set delivery location';

  // Product quick-sheet (v3): tiles and the deal spotlight open this
  // instead of jumping straight to the full detail screen.
  const [sheet, setSheet] = useState<{ productId?: number; deal?: TodaysDeal | null } | null>(null);

  const refreshing =
    gallery.isFetching || featured.isFetching || categories.isFetching;

  const onRefresh = useCallback(() => {
    gallery.refetch();
    featured.refetch();
    categories.refetch();
    deal.refetch();
    farmer.refetch();
    reviews.refetch();
  }, [gallery, featured, categories, deal, farmer, reviews]);

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

  return (
    <Container edges={['top']} background={colors.tintSoft}>
      {/* Match the status bar to the HEADER gradient's top stop so the
          safe-area strip above the header reads as part of the header
          (instead of flashing white from the body background). All three
          props are required — without `translucent={false}` Android can
          render the bar transparent over the gradient, which produces
          the wrong colour on phones with light system themes. */}
      <StatusBar
        backgroundColor={colors.tintSoft}
        barStyle="dark-content"
        translucent={false}
      />
      {/* ── v3 market-grade header (approved board) ──────────────────
           Promise line + location, bell/profile stroke icons, rotating
           search placeholder, photo category bubbles. The drawer still
           exists via the Shop tab for the complete list. */}
      <PromiseHeader
        categories={categoriesList}
        locationLabel={locationLabel}
        searchHints={[
          ...featuredList.slice(0, 8).map(p => p.name),
          ...categoriesList.slice(0, 5).map(c => titleCaseCategory(c.name)),
        ].filter(Boolean)}
        onLocationPress={() => {
          const root = navigation.getParent()?.getParent() ?? navigation.getParent();
          root?.navigate('Location', { screen: 'LocationPicker' });
        }}
        onSearchPress={() => navigation.navigate('Search')}
        onProfilePress={openProfile}
        onCategoryPress={c =>
          navigation.navigate('Category', {
            categoryId: Number(c.id ?? c.categoryId),
            name: c.name ?? '',
          })
        }
      />

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
        {/* Hero carousel — taller, with the gallery row's heading +
            description overlaid on a cream scrim (same as web). */}
        {gallery.isLoading ? (
          <Skeleton
            height={210}
            style={{
              marginHorizontal: spacing.base,
              marginTop: spacing.base,
              borderRadius: radius.xl,
            }}
          />
        ) : (
          <View style={styles.heroWrap}>
            {/* v3: hero is clean gallery + admin copy; the farmer gets
                his own editorial banner below instead of an overlay. */}
            <HeroCarousel
              images={galleryList}
              height={190}
              onShopPress={() => navigation.getParent()?.navigate('CategoriesTab')}
            />
          </View>
        )}

        {/* Savings strip — FIRST10 pitch / live "you're saving ₹X"
            (server still applies the actual discount at checkout).
            Hidden once the customer has used the offer. */}
        <SavingsStrip eligible={showFirstOrderStrip} cartSubtotal={cartSubtotal} />

        {/* DEAL OF THE DAY spotlight — tap opens the quick sheet with
            the deal's variants. Hides when no deal is live or this
            customer already used it (server decides). */}
        {deal.data ? (
          <DealSpotlight deal={deal.data} onPress={d => setSheet({ deal: d })} />
        ) : null}

        {/* Farmer + Reviews — SIDE BY SIDE in one row (user feedback):
            two half-width cards. Either one alone takes the full row. */}
        {farmer.data || (reviews.data && reviews.data.length > 0) ? (
          <View style={styles.duoRow}>
            {farmer.data ? (
              <View style={{ flex: 1 }}>
                <FarmerStoryBanner
                  compact
                  farmer={farmer.data}
                  onPress={f => navigation.navigate('FarmerStory', { farmer: f })}
                />
              </View>
            ) : null}
            {reviews.data && reviews.data.length > 0 ? (
              <View style={{ flex: 1 }}>
                <ReviewsCarousel
                  compact
                  reviews={reviews.data}
                  pageWidth={farmer.data ? DUO_CARD_W : SCREEN_W - 32}
                />
              </View>
            ) : null}
          </View>
        ) : null}


        {/* Best Sellers */}
        {bestSellers.length > 0 ? (
          <>
            <SectionHeader
              title="Best Sellers"
              subtitle="Most-loved by our customers"
              icon="award"
            />
            <HorizontalProducts
              products={bestSellers}
              onPress={id => setSheet({ productId: id })}
              hideBestSellerBadge
            />
          </>
        ) : null}

        {/* New Arrivals */}
        {newArrivals.length > 0 ? (
          <>
            <SectionHeader
              title="New Arrivals"
              subtitle="Fresh from our farmers"
              icon="zap"
            />
            <HorizontalProducts
              products={newArrivals}
              onPress={id => setSheet({ productId: id })}
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
                  onPress={() => setSheet({ productId: (p.id || p.productId)! })}
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


      {/* v3: floating cart pill — the primary cart entry (the Cart
          tab button is hidden; its stack remains for checkout). */}
      <FloatingCartPill onPress={() => navigation.getParent()?.navigate('CartTab')} />

      {/* v3: quick product sheet — variants, stepper, add, FIRST10
          whisper. Full detail page one tap away. */}
      <ProductQuickSheet
        visible={!!sheet}
        productId={sheet?.productId}
        deal={sheet?.deal}
        onClose={() => setSheet(null)}
        onViewDetails={id => navigation.navigate('ProductDetail', { productId: id })}
      />
    </Container>
  );
};

/**
 * Section header with a tinted icon well, the title, and an optional
 * trailing action ("See all"). The icon adds a small but consistent
 * visual rhythm across the screen — every section is identifiable at a
 * glance even before the user reads the title.
 */
const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  icon?: string;
  action?: () => void;
  actionLabel?: string;
}> = ({ title, subtitle, icon, action, actionLabel }) => (
  // Section header — bumped to h4 size + larger icon well + optional
  // subtitle line so each section reads as a confident "this is a
  // curated collection" header rather than generic chrome. Matches
  // Zepto/Blinkit/BigBasket visual weight.
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      {icon ? (
        <View style={styles.sectionIconWell}>
          <Icon name={icon} size={16} color={colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="h4" color={colors.textPrimary} weight="800">
          {title}
        </Text>
        {subtitle ? (
          <Text
            variant="caption"
            color={colors.textSecondary}
            weight="600"
            style={{ marginTop: 2 }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
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
// v3 shelves: ~2.5 tiles per screen width so the peek invites a swipe
// (Blinkit shelf rhythm) — tighter than the old 2-per-screen cards.
const SHELF_CARD_WIDTH = Math.max(128, Math.floor((SCREEN_W - 16 * 2 - 24) / 2.5));
const CARD_STRIDE = SHELF_CARD_WIDTH + spacing.md;

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
            width={SHELF_CARD_WIDTH}
            compact
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
    ...shadows.md,
    zIndex: 5,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  // Hamburger button — anchored top-left. Same circular footprint as the
  // profile button on the right, so the header reads as balanced.
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.tintMid,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  // Brand mark — responsive width (40-160dp depending on screen size)
  // so it scales gracefully from 320dp phones up to tablets.
  // `mixBlendMode: 'multiply'` knocks out the white background baked
  // into the source GIF: white × cream = cream (invisible), dark pixels
  // stay dark. On RN versions that don't support the prop it's silently
  // ignored and the original GIF (with its white bg) renders unchanged.
  brandImage: {
    width: BRAND_W,
    height: BRAND_H,
    mixBlendMode: 'multiply' as any,
  },
  // Profile pill — soft tinted background + brand-colour ring so it
  // reads as on-brand rather than a plain white circle.
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  // DeliverToPill + filled-gradient search CTA, side-by-side. The pill
  // stretches via flex:1 in the JSX; the search button is a fixed
  // 48×48 circle, vertically centred against the pill's natural height.
  //
  // IMPORTANT: do NOT use `alignItems: 'stretch'` here. Combined with
  // `height: '100%'` on the inner button it created a layout cycle that
  // blew the row up to fill the whole remaining screen height.
  deliverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  // Solid brand-coloured search CTA — primary action on the home screen.
  // Solid colour (not a gradient) so the white icon is guaranteed to
  // render visibly on every Android version + GPU driver combo.
  searchBtnWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },

  // ── Scroll area ────────────────────────────────────────────────────────
  scroll: { paddingBottom: spacing.xl },

  // Hero
  heroWrap: {
    paddingTop: spacing.base,
  },

  // Farmer + Reviews side-by-side row.
  duoRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
  },

  // Promo strip — extra top space so it floats clearly under the
  // hero rather than feeling stuck to it.
  promoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderRadius: radius.full,
    marginTop: spacing.base + spacing.xs,
    marginHorizontal: spacing.base,
    ...shadows.sm,
  },
  promoEmoji: { fontSize: 16, includeFontPadding: false },

  // Section header — bumped breathing room above each section so the
  // page reads as deliberate "curated collections" instead of a tight
  // flat list. Matches the rhythm Zepto / Blinkit / BigBasket use
  // between their homepage sections.
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl + spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIconWell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.tintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
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

  // Horizontal-product list padding — still used by Best Sellers and
  // New Arrivals carousels.
  hList: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
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
    marginBottom: spacing.sm,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
  },

  // Footer accent — tightened top padding so the home doesn't end with
  // a sea of whitespace.
  footerAccent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
    paddingHorizontal: spacing.base,
  },

  // ── Categories side-drawer ────────────────────────────────────────
  // Backdrop sits behind the drawer (semi-transparent dark wash).
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  // Tap-to-close: covers the visible area to the right of the drawer
  // (positioned with `left: DRAWER_W` in the JSX). Kept separate from
  // the backdrop so the opacity animation doesn't conflict with the
  // touchable area.
  drawerBackdropTouch: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
  },
  // The actual drawer panel — slides in from x = -DRAWER_W to x = 0.
  // `paddingTop` is set inline (insets.top + spacing.md) so the header
  // clears the status bar on every device.
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.surface,
    ...shadows.lg,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  drawerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  drawerTitleIconWell: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.tintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  drawerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerList: {
    paddingVertical: spacing.sm,
    // No longer needs the giant '2xl' bottom padding — the new
    // anchored footer below sits at the bottom, so the scroll
    // content can stop at a normal gap.
    paddingBottom: spacing.md,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  drawerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItemEmoji: {
    fontSize: 18,
    lineHeight: 22,
    includeFontPadding: false,
    textAlign: 'center',
  },
  // Pinned-to-bottom footer — replaces the empty dead space the
  // drawer used to show beneath the last category. Tappable so the
  // user has a clear "see everything" affordance even when the
  // category list is short.
  drawerFooter: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.base + spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.tintSoft,
  },
  drawerFooterCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
