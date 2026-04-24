import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Feather';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { radius, shadows, spacing } from '../theme/spacing';
import {
  Badge,
  QuantityStepper,
  StarRating,
  Text,
  VariantPicker,
} from './common';
import { DEFAULT_IMAGE_PLACEHOLDER, pickFirstImage } from '../utils/image';
import { formatINR } from '../utils/format';
import { useCartLineFor, useCartStore } from '../store';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { showToast } from '../utils/toast';
import { haptics } from '../utils/haptics';
import { APP_CONFIG } from '../constants/config';
import type { Product, ProductQtyOption } from '../types';

interface Props {
  product: Product;
  onPress?: () => void;
  width?: number;
  compact?: boolean;
  showAddToCart?: boolean;
  hideBestSellerBadge?: boolean;
  hideNewArrivalBadge?: boolean;
}

/**
 * Modern product card — inspired by Zepto / Blinkit / web ProductCard.
 * - Discount pill top-right
 * - Ribbon (best seller / new) top-left
 * - Variant dropdown (opens bottom-sheet picker)
 * - Full-width Add button → morphs into +/- stepper on add
 * - Cart quantity is pulled from the global cart store so every card
 *   everywhere in the app stays in sync in real time.
 */
export const ProductCard: React.FC<Props> = ({
  product,
  onPress,
  width,
  compact = false,
  showAddToCart = true,
  hideBestSellerBadge = false,
  hideNewArrivalBadge = false,
}) => {
  const addItem = useCartStore(s => s.addItem);
  const updateQty = useCartStore(s => s.updateQty);
  const removeItem = useCartStore(s => s.removeItem);
  const requireAuth = useRequireAuth();

  // Sort qty options and derive a default selection.
  const options = useMemo<ProductQtyOption[]>(
    () => product.qtyOptions ?? [],
    [product.qtyOptions],
  );
  const [selectedOptId, setSelectedOptId] = useState<string | number | undefined>(
    options[0]?.id ?? options[0]?.qtyOptionId,
  );
  const selectedOpt = useMemo<ProductQtyOption | undefined>(
    () =>
      options.find(o => (o.id ?? o.qtyOptionId) === selectedOptId) ||
      options[0],
    [options, selectedOptId],
  );

  const displayPrice = selectedOpt?.price ?? product.price ?? 0;
  const displayMrp = selectedOpt?.mrp ?? product.mrp;
  const unit = selectedOpt?.name || selectedOpt?.label || product.unit;
  const hasDiscount = !!(displayMrp && displayMrp > displayPrice);
  const discountPercent = hasDiscount
    ? Math.round(((displayMrp! - displayPrice) / displayMrp!) * 100)
    : undefined;

  // Cart sync: look up the line for this specific product+variant
  const cartLine = useCartLineFor(
    product.id ?? product.productId,
    selectedOpt?.id ?? selectedOpt?.qtyOptionId,
  );
  const cartQty = cartLine?.qty ?? 0;

  const imageUri = pickFirstImage(
    product.image,
    product.imageUrl,
    product.images?.[0],
    product.gallery?.[0],
  );
  const rating = product.rating ?? 0;
  const outOfStock = product.inStock === false;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleAdd = async (e?: any) => {
    e?.stopPropagation?.();
    if (!requireAuth()) return;
    if (outOfStock || busy) return;
    const id = product.id ?? product.productId;
    if (!id) return;
    setBusy(true);
    haptics.success();
    try {
      await addItem({
        productId: id,
        qty: 1,
        price: displayPrice,
        qtyOptionId: selectedOpt?.id ?? selectedOpt?.qtyOptionId,
      });
      showToast.success('Added to cart');
    } catch (err: any) {
      showToast.error('Could not add to cart', err?.message);
    } finally {
      setBusy(false);
    }
  };

  const handleIncrement = async () => {
    if (!cartLine?.itemId && !cartLine?.cartItemId) return;
    const itemId = (cartLine.itemId ?? cartLine.cartItemId)!;
    try {
      setBusy(true);
      await updateQty(itemId, Math.min(APP_CONFIG.MAX_CART_ITEM_QTY, cartQty + 1));
    } catch (err: any) {
      showToast.error('Could not update', err?.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDecrement = async () => {
    if (!cartLine?.itemId && !cartLine?.cartItemId) return;
    const itemId = (cartLine.itemId ?? cartLine.cartItemId)!;
    try {
      setBusy(true);
      if (cartQty <= 1) {
        await removeItem(itemId);
      } else {
        await updateQty(itemId, cartQty - 1);
      }
    } catch (err: any) {
      showToast.error('Could not update', err?.message);
    } finally {
      setBusy(false);
    }
  };

  const renderRibbon = () => {
    if (product.isBestSeller && !hideBestSellerBadge) {
      return (
        <View style={[styles.ribbon, { backgroundColor: colors.secondary }]}>
          <Icon name="award" size={10} color={colors.primaryDark} />
          <Text variant="caption" color={colors.primaryDark} weight="700" style={{ marginLeft: 3 }}>
            Best Seller
          </Text>
        </View>
      );
    }
    if (product.isNewArrival && !hideNewArrivalBadge) {
      return (
        <View style={[styles.ribbon, { backgroundColor: colors.primary }]}>
          <Text variant="caption" color={colors.white} weight="700">
            New
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.pressed }}
      style={({ pressed }) => [
        styles.card,
        width ? { width } : null,
        pressed && { opacity: 0.96 },
      ]}
    >
      {/* Image block */}
      <View style={styles.imageWrap}>
        <FastImage
          source={{ uri: imgError ? DEFAULT_IMAGE_PLACEHOLDER : imageUri }}
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
          onError={() => setImgError(true)}
        />
        {renderRibbon()}
        {discountPercent ? (
          <View style={styles.discountPill}>
            <Text variant="caption" color={colors.white} weight="800">
              {discountPercent}% OFF
            </Text>
          </View>
        ) : null}
        {outOfStock ? (
          <View style={styles.oosOverlay}>
            <Text variant="bodyBold" color={colors.white}>
              Out of stock
            </Text>
          </View>
        ) : null}
      </View>

      {/* Body — flex 1 with space-between so Add button always sits at bottom */}
      <View style={styles.body}>
        <View style={styles.topBlock}>
          <Text
            variant="bodyBold"
            color={colors.textPrimary}
            numberOfLines={2}
            ellipsizeMode="tail"
            weight="700"
            style={styles.name}
          >
            {product.name}
          </Text>

          {rating > 0 && !compact ? (
            <View style={styles.ratingRow}>
              <StarRating rating={rating} size={12} />
              {product.totalReviews ? (
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  weight="600"
                  style={{ marginLeft: 4 }}
                >
                  ({product.totalReviews})
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Variant dropdown — sits immediately under the name with a tight gap */}
          {!compact && options.length > 1 ? (
            <Pressable
              onPress={e => {
                e.stopPropagation?.();
                setPickerOpen(true);
              }}
              style={styles.variantRow}
              android_ripple={{ color: colors.pressed }}
            >
              <Text
                variant="bodySmall"
                color={colors.textPrimary}
                weight="600"
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {(selectedOpt?.name || selectedOpt?.label) ?? ''}
                {displayPrice ? ` — ${formatINR(displayPrice)}` : ''}
                {hasDiscount ? ` (was ${formatINR(displayMrp!)})` : ''}
              </Text>
              <Icon name="chevron-down" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.bottomBlock}>
          {/* Price row */}
          <View style={styles.priceRow}>
            <Text variant="h5" color={colors.textPrimary} weight="800">
              {formatINR(displayPrice)}
            </Text>
            {hasDiscount ? (
              <Text
                variant="bodySmall"
                color={colors.textTertiary}
                weight="600"
                style={styles.mrp}
              >
                {formatINR(displayMrp!)}
              </Text>
            ) : null}
            {unit ? (
              <Text
                variant="caption"
                color={colors.textSecondary}
                weight="700"
                style={{ marginLeft: 6 }}
              >
                {unit}
              </Text>
            ) : null}
          </View>

          {/* Add button ↔ Quantity stepper */}
          {showAddToCart ? (
            cartQty > 0 ? (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}
                style={{ marginTop: spacing.sm }}
              >
                <QuantityStepper
                  qty={cartQty}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  loading={busy}
                  min={0}
                  max={APP_CONFIG.MAX_CART_ITEM_QTY}
                  size="md"
                  tone="primary"
                />
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}
              >
                <Pressable
                  onPress={handleAdd}
                  disabled={busy || outOfStock}
                  android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                  style={({ pressed }) => [
                    styles.addBtn,
                    outOfStock && styles.addBtnDisabled,
                    pressed && !outOfStock && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <Icon name="shopping-cart" size={14} color={colors.white} />
                  <Text
                    variant="button"
                    color={colors.white}
                    weight="700"
                    style={{ marginLeft: 6, letterSpacing: 0.3 }}
                  >
                    Add
                  </Text>
                </Pressable>
              </Animated.View>
            )
          ) : null}
        </View>
      </View>

      {/* Variant picker bottom-sheet */}
      {options.length > 1 ? (
        <VariantPicker
          visible={pickerOpen}
          options={options}
          selectedId={selectedOptId}
          title={product.name}
          onSelect={opt => {
            setSelectedOptId(opt.id ?? opt.qtyOptionId);
            haptics.tap();
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    // Fixed min-height keeps every card in a grid aligned regardless
    // of name length / number of variant rows.
    minHeight: 340,
    ...shadows.md,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.tintSoft,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  ribbon: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  discountPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.badgeDiscount,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    ...shadows.sm,
  },
  oosOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 18, 16, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Body fills remaining space so bottomBlock always pins to the bottom.
  body: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  topBlock: {},
  bottomBlock: {},
  // Reserve 2 lines of vertical space whether the name is short or long.
  // This is what keeps the price row + Add button aligned across cards.
  name: {
    minHeight: 40,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.base,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  mrp: {
    marginLeft: spacing.sm,
    textDecorationLine: 'line-through',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  addBtnDisabled: {
    backgroundColor: colors.disabled,
  },
});
