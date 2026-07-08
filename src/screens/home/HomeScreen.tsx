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
import { WelcomePromoModal } from '../../components/feedback/WelcomePromoModal';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { useUIStore } from '../../store';
import { toArray } from '../../utils/format';
import { hasProductImage } from '../../utils/image';
import { iconForCategory, titleCaseCategory } from '../../utils/categoryIcon';
import type { Category, GalleryImage, Product } from '../../types';

// Show ~2 cards per screen width — slight peek of the third to hint "scroll me".
const SCREEN_W = Dimensions.get('window').width;
const PRODUCT_CARD_WIDTH = Math.floor((SCREEN_W - 16 * 2 - 12) / 2);

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

  // ── Categories side-drawer state ─────────────────────────────────────
  // `mounted` controls whether the Modal is in the tree at all (so we
  // can run an exit animation before unmount); drawerX/backdropOpacity
  // drive the slide + fade transitions. useNativeDriver throughout so
  // the animation runs off the JS thread.
  //
  // The OPEN signal is driven by the global UI store — that way the
  // bottom-tab "Shop" button can trigger the drawer too, without us
  // needing to lift the animation logic out of this screen.
  const [drawerMounted, setDrawerMounted] = useState(false);
  const drawerX = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const globalDrawerOpen = useUIStore(s => s.categoriesDrawerOpen);
  const closeGlobalDrawer = useUIStore(s => s.closeCategoriesDrawer);
  const openGlobalDrawer = useUIStore(s => s.openCategoriesDrawer);

  const runOpenAnim = useCallback(() => {
    setDrawerMounted(true);
    Animated.parallel([
      Animated.timing(drawerX, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerX, backdropOpacity]);

  const runCloseAnim = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerX, {
        toValue: -DRAWER_W,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setDrawerMounted(false);
    });
  }, [drawerX, backdropOpacity]);

  // Bridge the global open/close signal to the local animation. When
  // anyone (the hamburger here, the Shop tab in MainTabs, future
  // triggers) flips the store flag we play the matching animation.
  useEffect(() => {
    if (globalDrawerOpen) runOpenAnim();
    else runCloseAnim();
  }, [globalDrawerOpen, runOpenAnim, runCloseAnim]);

  const openDrawer = openGlobalDrawer;
  const closeDrawer = closeGlobalDrawer;

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
      {/* ── Header band ──────────────────────────────────────────────────
           Richer 3-stop warm gradient (cream → tan → cream) for depth,
           with a subtle bottom accent strip. Brand mark on the left,
           profile pill top-right. Search lives in the row below as a
           filled brand-coloured CTA so it reads as the primary action. */}
      <LinearGradient
        colors={[colors.tintSoft, colors.tintMid, colors.tintSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBand}
      >
        <View style={styles.topBar}>
          {/* Hamburger menu — opens the categories side-drawer.
              Anchored top-left, conventional app pattern. */}
          <Pressable
            onPress={openDrawer}
            android_ripple={{ color: colors.pressed, borderless: true, radius: 22 }}
            style={({ pressed }) => [
              styles.menuBtn,
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open categories menu"
          >
            <Icon name="menu" size={22} color={colors.primary} />
          </Pressable>

          {/* Animated cow GIF — brand mark, centred between the menu
              and profile buttons by the topBar's space-between layout.
              `mixBlendMode: 'multiply'` knocks out the GIF's baked-in
              white background against the cream gradient. */}
          <FastImage
            source={require('../../assets/images/brand-logo.gif')}
            style={styles.brandImage}
            resizeMode={FastImage.resizeMode.contain}
          />

          {/* Profile pill — anchored top-right. Tapping jumps to the
              ProfileTab (which renders the sign-in prompt for guests
              or the full profile for authenticated users). */}
          <Pressable
            onPress={openProfile}
            android_ripple={{ color: colors.pressed, borderless: true, radius: 22 }}
            style={({ pressed }) => [
              styles.profileBtn,
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Icon name="user" size={20} color={colors.primary} />
          </Pressable>
        </View>

        {/* DeliverToPill + filled-gradient search CTA, side-by-side. The
            pill stretches to fill the available width; the search button
            uses the brand primary gradient so it pops as THE primary
            action on the home screen. */}
        <View style={styles.deliverRow}>
          <View style={{ flex: 1 }}>
            <DeliverToPill />
          </View>
          <Pressable
            onPress={() => navigation.navigate('Search')}
            android_ripple={{ color: colors.pressed, borderless: true, radius: 24 }}
            style={({ pressed }) => [
              styles.searchBtnWrap,
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Search products"
          >
            <Icon name="search" size={22} color={colors.white} />
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

        {/* (The inline "Shop by category" horizontal list used to live
            here. It's been replaced by the hamburger ☰ → side-drawer
            pattern — same data, less vertical scrolling on the home
            screen, full category list visible at once in the drawer.) */}

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
              onPress={goToProduct(navigation)}
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

      {/* ── Categories side-drawer ────────────────────────────────────
           Slides in from the left when the hamburger is tapped. The
           backdrop is a separate Animated.View so it can fade in
           independently. Tap the backdrop OR the X to dismiss. */}
      {drawerMounted ? (
        <Modal
          visible
          transparent
          animationType="none"
          onRequestClose={closeDrawer}
          // statusBarTranslucent INTENTIONALLY OMITTED — same crash
          // root-cause as the WelcomePromoModal: translucent Modal +
          // react-native-screens + new-architecture races the fragment
          // manager and throws "No view found for id…". The drawer
          // panel already pads `paddingTop: insets.top` so the header
          // clears the status bar correctly without it.
        >
          <View style={StyleSheet.absoluteFill}>
            <Animated.View
              pointerEvents={drawerMounted ? 'auto' : 'none'}
              style={[styles.drawerBackdrop, { opacity: backdropOpacity }]}
            />
            {/* Backdrop tap-to-close — covers the visible area to the
                right of the drawer. Using a separate Pressable instead
                of putting onPress on the backdrop View so the
                Animated.View opacity transitions don't interfere.
                Bottom inset matches the drawer so taps in the tab-bar
                area aren't swallowed (otherwise the user can't switch
                tabs while the drawer is open). */}
            <Pressable
              style={[
                styles.drawerBackdropTouch,
                {
                  left: DRAWER_W,
                  bottom: TABBAR_HEIGHT + insets.bottom,
                },
              ]}
              onPress={closeDrawer}
            />
            <Animated.View
              style={[
                styles.drawer,
                {
                  width: DRAWER_W,
                  // Push the header below the status bar / notch.
                  paddingTop: insets.top + spacing.md,
                  // CRITICAL: position the PANEL ITSELF above the tab
                  // bar — not just pad the content. Modal extends to
                  // the very bottom of the activity; the React
                  // Navigation tab bar (64dp) renders on top of the
                  // Modal. Without an explicit `bottom`, the drawer's
                  // white panel extends behind the tab bar and the two
                  // visually overlap. Setting bottom = tabBar + system
                  // gesture inset makes the panel END above the bar.
                  bottom: TABBAR_HEIGHT + insets.bottom,
                  transform: [{ translateX: drawerX }],
                },
              ]}
            >
              <View style={styles.drawerHeader}>
                <View style={styles.drawerTitleRow}>
                  <View style={styles.drawerTitleIconWell}>
                    <Icon name="grid" size={16} color={colors.primary} />
                  </View>
                  <Text variant="h5" color={colors.black} weight="800">
                    Categories
                  </Text>
                </View>
                <Pressable
                  onPress={closeDrawer}
                  hitSlop={10}
                  android_ripple={{ color: colors.pressed, borderless: true, radius: 18 }}
                  style={styles.drawerCloseBtn}
                  accessibilityLabel="Close categories"
                >
                  <Icon name="x" size={20} color={colors.black} />
                </Pressable>
              </View>
              {categories.isLoading ? (
                <View style={{ padding: spacing.base, flex: 1 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      height={48}
                      borderRadius={radius.md}
                      style={{ marginBottom: spacing.sm }}
                    />
                  ))}
                </View>
              ) : (
                <ScrollView
                  // flex:1 makes the list area FILL the available
                  // vertical space inside the drawer panel so the
                  // footer anchors at the bottom edge with no
                  // awkward dead gap (industry pattern — Zepto /
                  // Blinkit / Swiggy drawers always have a
                  // brand/footer strip pinned to the bottom).
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.drawerList}
                  showsVerticalScrollIndicator={false}
                >
                  {categoriesList.map((c, index) => {
                    const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                    // Category-accurate emoji instead of the old
                    // generic Feather cycle (shopping-bag, coffee,
                    // droplet) which produced confidently wrong
                    // icons (a coffee cup for Cashew, droplet for
                    // Chilli). See utils/categoryIcon.ts.
                    const emoji = iconForCategory(c.name);
                    const displayName = titleCaseCategory(c.name);
                    return (
                      <Pressable
                        key={`drawer-cat-${c.id ?? c.categoryId ?? index}`}
                        onPress={() => {
                          closeDrawer();
                          navigation.navigate('Category', {
                            categoryId: (c.id || c.categoryId)!,
                            name: displayName,
                          });
                        }}
                        android_ripple={{ color: colors.pressed }}
                        style={styles.drawerItem}
                      >
                        <View
                          style={[
                            styles.drawerItemIcon,
                            { backgroundColor: color.bg },
                          ]}
                        >
                          <Text style={styles.drawerItemEmoji}>{emoji}</Text>
                        </View>
                        <Text
                          variant="body"
                          color={colors.black}
                          weight="700"
                          style={{ flex: 1 }}
                          numberOfLines={1}
                        >
                          {displayName}
                        </Text>
                        <Icon
                          name="chevron-right"
                          size={16}
                          color={colors.primary}
                        />
                      </Pressable>
                    );
                  })}
                  {categoriesList.length === 0 ? (
                    <Text
                      variant="bodySmall"
                      color={colors.textTertiary}
                      align="center"
                      style={{ padding: spacing.lg }}
                    >
                      No categories yet. Pull down on Home to refresh.
                    </Text>
                  ) : null}
                </ScrollView>
              )}
              {/* Footer — anchors at bottom of drawer panel to remove
                  the awkward dead-space the empty bottom of the panel
                  used to show. Pattern matches Zepto / Blinkit /
                  Swiggy: a tappable "view all" CTA above a quiet brand
                  line. Lives OUTSIDE the ScrollView so it always
                  stays visible no matter how many categories load. */}
              <Pressable
                onPress={() => {
                  closeDrawer();
                  navigation.navigate('Shop' as any);
                }}
                android_ripple={{ color: colors.pressed }}
                style={styles.drawerFooter}
              >
                <View style={styles.drawerFooterCta}>
                  <Icon name="grid" size={16} color={colors.primary} />
                  <Text
                    variant="bodyBold"
                    color={colors.primary}
                    weight="700"
                    style={{ marginLeft: spacing.sm }}
                  >
                    View All Categories
                  </Text>
                </View>
                <Text
                  variant="caption"
                  color={colors.textTertiary}
                  weight="600"
                  align="center"
                  style={{ marginTop: 4 }}
                >
                  Rythu Bidda Naturals · Farm to your door
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </Modal>
      ) : null}

      {/* Welcome promo — shows once per app session right after the
          user lands on Home. Self-contained: handles its own visibility
          and animations. Will be wired to the backend in a future
          iteration to surface live offers / rewards. */}
      <WelcomePromoModal />
    </Container>
  );
};

function goToProduct(navigation: any) {
  return (productId: number) =>
    navigation.navigate('ProductDetail', { productId });
}

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
  promoIconWell: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
