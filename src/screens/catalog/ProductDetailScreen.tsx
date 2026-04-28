import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  ViewToken,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import FastImage from 'react-native-fast-image';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { catalogService } from '../../api/services';
import {
  AccordionItem,
  Button,
  Card,
  LoadingScreen,
  QuantityStepper,
  StarRating,
  Text,
} from '../../components/common';
import { Container } from '../../components/layout/Container';
import { StickyBottomBar } from '../../components/layout/StickyBottomBar';
import { ProductCard } from '../../components/ProductCard';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { DEFAULT_IMAGE_PLACEHOLDER, pickFirstImage } from '../../utils/image';
import { useCartLineFor, useCartStore } from '../../store';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { formatDate, formatINR } from '../../utils/format';
import { showToast } from '../../utils/toast';
import { haptics } from '../../utils/haptics';
import { APP_CONFIG } from '../../constants/config';
import type { HomeStackParamList } from '../../navigation/types';
import type { Product } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ProductDetail'>;

const { width: SCREEN_W } = Dimensions.get('window');

const HIGHLIGHTS: Array<{ icon: string; label: string }> = [
  { icon: 'feather', label: 'Farm Fresh' },
  { icon: 'sun', label: 'Naturally Grown' },
  { icon: 'shield', label: 'No Preservatives' },
  { icon: 'map-pin', label: 'Locally Sourced' },
];

export const ProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { productId } = route.params;
  const addItem = useCartStore(s => s.addItem);
  const updateQty = useCartStore(s => s.updateQty);
  const removeItem = useCartStore(s => s.removeItem);
  const requireAuth = useRequireAuth();
  const insets = useSafeAreaInsets();

  // The hero tint is light (#FDF4EC), so dark status-bar icons read best.
  // We force this only while this screen is focused to avoid affecting
  // other screens.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent', true);
        StatusBar.setTranslucent(true);
      }
      return () => {
        if (Platform.OS === 'android') {
          StatusBar.setTranslucent(false);
          StatusBar.setBackgroundColor(colors.background, true);
        }
        StatusBar.setBarStyle('dark-content', true);
      };
    }, []),
  );

  const [selectedOptionId, setSelectedOptionId] = useState<
    string | number | undefined
  >();
  const [activeImage, setActiveImage] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [imageFailed, setImageFailed] = useState<Record<number, boolean>>({});

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => catalogService.getProduct(productId),
  });

  const images = useMemo(() => {
    if (!product) return [];
    const list = [
      ...(product.images || []),
      ...(product.gallery || []),
      product.image,
      product.imageUrl,
    ].filter((v, i, arr) => !!v && arr.indexOf(v) === i) as string[];
    return list.length > 0 ? list : [''];
  }, [product]);

  const { data: related } = useQuery({
    queryKey: ['relatedProducts', product?.categoryId],
    queryFn: () =>
      product?.categoryId
        ? catalogService.getProductsByCategory(product.categoryId)
        : Promise.resolve([]),
    enabled: !!product?.categoryId,
  });

  const onImageViewable = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveImage(viewableItems[0].index);
      }
    },
  ).current;

  // ────────────────────────────────────────────────────────────────
  // All derived values + hooks live ABOVE the early return so React
  // sees the same number of hook calls on every render (crucial —
  // otherwise you hit "Rendered more hooks than previous render").
  // ────────────────────────────────────────────────────────────────
  const selectedOption = useMemo(() => {
    const opts = product?.qtyOptions;
    if (!opts || opts.length === 0) return undefined;
    return opts.find(o => (o.id ?? o.qtyOptionId) === selectedOptionId) ?? opts[0];
  }, [product, selectedOptionId]);

  const effectivePrice = selectedOption?.price ?? product?.price ?? 0;
  const effectiveMrp = selectedOption?.mrp ?? product?.mrp;
  const hasDiscount = !!(effectiveMrp && effectiveMrp > effectivePrice);
  const discountPercent = hasDiscount
    ? Math.round(((effectiveMrp! - effectivePrice) / effectiveMrp!) * 100)
    : undefined;
  const unit = selectedOption?.name ?? selectedOption?.label ?? product?.unit;
  const outOfStock = product?.inStock === false;

  // Cart line for the current variant — safe to pass undefined ids.
  const cartLine = useCartLineFor(
    product?.id ?? product?.productId,
    selectedOption?.id ?? selectedOption?.qtyOptionId,
  );
  const cartQty = cartLine?.qty ?? 0;

  const handleAddToCart = useCallback(async () => {
    if (adding || !product) return;
    haptics.select();
    if (!requireAuth()) return;

    const id = product.id ?? product.productId;
    if (!id || !effectivePrice) {
      showToast.error('Unable to add — missing product info');
      return;
    }
    setAdding(true);
    try {
      await addItem({
        productId: id,
        qty: 1,
        price: effectivePrice,
        qtyOptionId: selectedOption?.id ?? selectedOption?.qtyOptionId,
      });
      haptics.success();
      showToast.success('Added to cart');
    } catch (e: any) {
      haptics.error();
      showToast.error('Could not add to cart', e?.message ?? 'Please try again');
    } finally {
      setAdding(false);
    }
  }, [adding, addItem, effectivePrice, product, requireAuth, selectedOption]);

  // Now we can safely bail out — all hooks have been called.
  if (isLoading || !product) return <LoadingScreen />;

  const handleIncrement = async () => {
    const itemId = cartLine?.itemId ?? cartLine?.cartItemId;
    if (!itemId || adding) return;
    setAdding(true);
    try {
      await updateQty(
        itemId,
        Math.min(APP_CONFIG.MAX_CART_ITEM_QTY, cartQty + 1),
      );
    } catch (err: any) {
      showToast.error('Could not update', err?.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDecrement = async () => {
    const itemId = cartLine?.itemId ?? cartLine?.cartItemId;
    if (!itemId || adding) return;
    setAdding(true);
    try {
      if (cartQty <= 1) await removeItem(itemId);
      else await updateQty(itemId, cartQty - 1);
    } catch (err: any) {
      showToast.error('Could not update', err?.message);
    } finally {
      setAdding(false);
    }
  };

  const totalPrice = effectivePrice * Math.max(cartQty, 1);

  const relatedWithImages = (related ?? [])
    .filter(
      p => (p.id ?? p.productId) !== (product.id ?? product.productId),
    )
    .slice(0, 12);

  return (
    <Container edges={[]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Hero: carousel with floating chrome ===== */}
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, i) => `img-${i}-${item}`}
            onViewableItemsChanged={onImageViewable}
            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
            renderItem={({ item, index }) => (
              <FastImage
                source={{
                  uri: imageFailed[index]
                    ? DEFAULT_IMAGE_PLACEHOLDER
                    : pickFirstImage(item),
                }}
                style={styles.heroImage}
                resizeMode={FastImage.resizeMode.contain}
                onError={() =>
                  setImageFailed(prev => ({ ...prev, [index]: true }))
                }
              />
            )}
          />

          {/* Floating back + wishlist — sits below the status bar */}
          <View style={[styles.floatingTop, { top: insets.top + spacing.sm }]}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.iconBubble}
              android_ripple={{ color: colors.pressed, borderless: true, radius: 22 }}
              hitSlop={6}
            >
              <Icon name="arrow-left" size={20} color={colors.textPrimary} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Pressable
                onPress={() => {
                  setWishlisted(w => !w);
                  haptics.tap();
                }}
                style={styles.iconBubble}
                android_ripple={{ color: colors.pressed, borderless: true, radius: 22 }}
                hitSlop={6}
              >
                <Icon
                  name="heart"
                  size={20}
                  color={wishlisted ? colors.error : colors.textPrimary}
                />
              </Pressable>
              <Pressable
                onPress={() => haptics.tap()}
                style={styles.iconBubble}
                android_ripple={{ color: colors.pressed, borderless: true, radius: 22 }}
                hitSlop={6}
              >
                <Icon name="share-2" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Discount pill */}
          {discountPercent ? (
            <View
              style={[
                styles.heroDiscount,
                { top: insets.top + spacing.sm + 56 },
              ]}
            >
              <Text variant="caption" weight="800" color={colors.white}>
                {discountPercent}% OFF
              </Text>
            </View>
          ) : null}

          {/* Dots */}
          {images.length > 1 ? (
            <View style={styles.dotRow}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeImage && styles.dotActive,
                    i === activeImage && { width: 20 },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* ===== Info card (overlaps hero bottom) ===== */}
        <View style={styles.infoCard}>
          <Text
            variant="h3"
            weight="800"
            color={colors.textPrimary}
            style={{ letterSpacing: -0.3 }}
          >
            {product.name}
          </Text>
          {product.shortDescription ? (
            <Text
              variant="bodySmall"
              weight="600"
              color={colors.textSecondary}
              style={{ marginTop: 4 }}
            >
              {product.shortDescription}
            </Text>
          ) : null}

          {/* Rating + In-stock */}
          <View style={styles.rowSpace}>
            {product.rating && product.rating > 0 ? (
              <View style={styles.rating}>
                <StarRating rating={product.rating} size={14} showLabel />
                <Text
                  variant="bodySmall"
                  weight="600"
                  color={colors.textSecondary}
                  style={{ marginLeft: 6 }}
                >
                  ({product.totalReviews ?? product.reviews?.length ?? 0} reviews)
                </Text>
              </View>
            ) : (
              <View />
            )}
            {!outOfStock ? (
              <View style={styles.inStockPill}>
                <Icon name="check-circle" size={12} color={colors.success} />
                <Text
                  variant="caption"
                  weight="700"
                  color={colors.success}
                  style={{ marginLeft: 4 }}
                >
                  In Stock
                </Text>
              </View>
            ) : (
              <View style={[styles.inStockPill, { backgroundColor: colors.errorSoft }]}>
                <Icon name="alert-circle" size={12} color={colors.error} />
                <Text
                  variant="caption"
                  weight="700"
                  color={colors.error}
                  style={{ marginLeft: 4 }}
                >
                  Out of Stock
                </Text>
              </View>
            )}
          </View>

          {/* Price row — single inline row: ₹X  ~~₹Y~~  N% OFF  /  per unit */}
          <View style={styles.priceRow}>
            <Text
              variant="h2"
              weight="800"
              color={colors.primary}
              numberOfLines={1}
            >
              {formatINR(effectivePrice)}
            </Text>
            {hasDiscount ? (
              <Text
                variant="bodyBold"
                weight="600"
                color={colors.textTertiary}
                style={styles.mrp}
                numberOfLines={1}
              >
                {formatINR(effectiveMrp!)}
              </Text>
            ) : null}
            {hasDiscount ? (
              <Text
                variant="bodyBold"
                weight="800"
                color={colors.success}
                style={styles.discountText}
                numberOfLines={1}
              >
                {discountPercent}% OFF
              </Text>
            ) : null}
            {unit ? (
              <>
                <Text
                  variant="bodySmall"
                  weight="700"
                  color={colors.textTertiary}
                  style={styles.priceSep}
                >
                  /
                </Text>
                <Text
                  variant="bodySmall"
                  weight="600"
                  color={colors.textSecondary}
                  numberOfLines={1}
                >
                  per {unit}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        {/* ===== Variant pills ===== */}
        {product.qtyOptions && product.qtyOptions.length > 1 ? (
          <View style={styles.section}>
            <Text
              variant="h6"
              weight="700"
              color={colors.textPrimary}
              style={{ marginBottom: spacing.sm }}
            >
              Select Pack Size
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: spacing.base }}
            >
              {product.qtyOptions.map(opt => {
                const id = opt.id ?? opt.qtyOptionId!;
                const selected =
                  (selectedOption?.id ?? selectedOption?.qtyOptionId) === id;
                const label = opt.name || opt.label || opt.value || '';
                return (
                  <Pressable
                    key={`opt-${id}`}
                    onPress={() => {
                      if (outOfStock) return;
                      setSelectedOptionId(id);
                      haptics.tap();
                    }}
                    disabled={outOfStock}
                    style={[
                      styles.variantPill,
                      selected
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.surface, borderColor: colors.primary },
                      outOfStock && styles.variantPillDisabled,
                    ]}
                  >
                    <Text
                      variant="bodyBold"
                      weight="800"
                      color={selected ? colors.white : colors.primary}
                    >
                      {label}
                    </Text>
                    {opt.price != null ? (
                      <Text
                        variant="caption"
                        weight="700"
                        color={selected ? colors.white : colors.textSecondary}
                        style={{ marginTop: 2 }}
                      >
                        {formatINR(opt.price)}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* ===== Highlights ===== */}
        <View style={styles.section}>
          <Text
            variant="h6"
            weight="700"
            color={colors.textPrimary}
            style={{ marginBottom: spacing.sm }}
          >
            Product Highlights
          </Text>
          <View style={styles.highlightsRow}>
            {HIGHLIGHTS.map(h => (
              <View key={h.label} style={styles.highlightChip}>
                <View style={styles.highlightIcon}>
                  <Icon name={h.icon} size={16} color={colors.primary} />
                </View>
                <Text
                  variant="caption"
                  weight="700"
                  color={colors.textPrimary}
                  align="center"
                  style={{ marginTop: 4 }}
                >
                  {h.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ===== Details accordions ===== */}
        <View style={styles.section}>
          {product.description ? (
            <AccordionItem
              title="Description"
              icon="file-text"
              defaultOpen
            >
              <Text variant="body" weight="500" color={colors.textSecondary}>
                {product.description}
              </Text>
            </AccordionItem>
          ) : null}
          <AccordionItem title="Storage Instructions" icon="archive">
            <Text variant="body" weight="500" color={colors.textSecondary}>
              Store in a cool, dry place away from direct sunlight. Transfer to an
              airtight container after opening. Keeps best for up to 6 months when
              stored properly.
            </Text>
          </AccordionItem>
          <AccordionItem title="Farmer / Source Info" icon="map">
            <Text variant="body" weight="500" color={colors.textSecondary}>
              Sourced directly from small farms across South India. Every batch is
              quality-checked before being packed and shipped to your door.
            </Text>
          </AccordionItem>
        </View>

        {/* ===== Reviews ===== */}
        {product.reviews && product.reviews.length > 0 ? (
          <View style={styles.section}>
            <Text
              variant="h6"
              weight="700"
              color={colors.textPrimary}
              style={{ marginBottom: spacing.sm }}
            >
              Customer Reviews
            </Text>
            {product.reviews.slice(0, 5).map((r, i) => (
              <Card
                key={`r-${r.id ?? i}`}
                elevated={false}
                style={{ marginBottom: spacing.sm }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBold" weight="700" color={colors.textPrimary}>
                      {r.customerName || 'Customer'}
                    </Text>
                    <StarRating rating={r.rating} size={12} />
                  </View>
                  <Text
                    variant="caption"
                    weight="600"
                    color={colors.textTertiary}
                  >
                    {formatDate(r.createdAt)}
                  </Text>
                </View>
                {r.title ? (
                  <Text
                    variant="bodyBold"
                    weight="700"
                    color={colors.textPrimary}
                    style={{ marginTop: spacing.xs }}
                  >
                    {r.title}
                  </Text>
                ) : null}
                {r.comment || r.message ? (
                  <Text
                    variant="bodySmall"
                    weight="500"
                    color={colors.textSecondary}
                    style={{ marginTop: 2 }}
                  >
                    {r.comment || r.message}
                  </Text>
                ) : null}
              </Card>
            ))}
          </View>
        ) : null}

        {/* ===== Related products ===== */}
        {relatedWithImages.length > 0 ? (
          <View style={[styles.section, { paddingBottom: spacing.xl }]}>
            <Text
              variant="h6"
              weight="700"
              color={colors.textPrimary}
              style={{ marginBottom: spacing.sm }}
            >
              You May Also Like
            </Text>
            <FlatList
              data={relatedWithImages}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(p: Product, i) =>
                `rel-${p.id ?? p.productId ?? i}`
              }
              contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.base }}
              renderItem={({ item }) => (
                <View style={{ width: 180 }}>
                  <ProductCard
                    product={item}
                    width={180}
                    onPress={() =>
                      navigation.push('ProductDetail', {
                        productId: (item.id || item.productId)!,
                      })
                    }
                  />
                </View>
              )}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* ===== Sticky bottom CTA ===== */}
      <StickyBottomBar>
        <View style={styles.stickyInner}>
          <View style={styles.stickyPriceCol}>
            <Text variant="caption" weight="700" color={colors.textTertiary}>
              {cartQty > 0 ? 'Total' : 'Price'}
            </Text>
            <Text
              variant="h4"
              weight="800"
              color={colors.textPrimary}
              numberOfLines={1}
              style={{ marginTop: 2 }}
            >
              {formatINR(totalPrice)}
            </Text>
          </View>
          {cartQty > 0 ? (
            <View style={styles.stickyCtaCol}>
              <QuantityStepper
                qty={cartQty}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                loading={adding}
                min={0}
                max={APP_CONFIG.MAX_CART_ITEM_QTY}
                size="lg"
                tone="primary"
              />
            </View>
          ) : (
            <Button
              title={outOfStock ? 'Out of Stock' : 'Add to Cart'}
              onPress={handleAddToCart}
              loading={adding}
              disabled={outOfStock}
              size="lg"
              leftIcon={
                outOfStock ? undefined : (
                  <Icon name="shopping-cart" size={16} color={colors.white} />
                )
              }
              style={styles.stickyCtaCol}
            />
          )}
        </View>
      </StickyBottomBar>
    </Container>
  );
};

const HERO_H = SCREEN_W * 0.9;

const styles = StyleSheet.create({
  hero: {
    width: SCREEN_W,
    height: HERO_H,
    backgroundColor: colors.tintSoft,
    position: 'relative',
  },
  heroImage: {
    width: SCREEN_W,
    height: HERO_H,
    backgroundColor: colors.tintSoft,
  },
  floatingTop: {
    position: 'absolute',
    // `top` is provided dynamically via safe-area inset to avoid status-bar overlap.
    left: spacing.base,
    right: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  heroDiscount: {
    position: 'absolute',
    // `top` provided dynamically — sits below the floating chrome.
    right: spacing.base,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    ...shadows.sm,
  },
  dotRow: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.palette.neutral[300],
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  infoCard: {
    marginTop: -spacing.xl,
    marginHorizontal: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
  },
  rowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  rating: { flexDirection: 'row', alignItems: 'center' },
  inStockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    columnGap: spacing.sm,
  },
  mrp: {
    textDecorationLine: 'line-through',
  },
  discountText: {},
  priceSep: { marginHorizontal: 2 },
  section: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
  },
  variantPill: {
    minWidth: 76,
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    marginRight: spacing.sm,
  },
  variantPillDisabled: {
    opacity: 0.4,
  },
  highlightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  highlightChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.tintSoft,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
  },
  highlightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  stickyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  stickyPriceCol: { flex: 1, justifyContent: 'center' },
  stickyCtaCol: { flex: 1.4 },
});
