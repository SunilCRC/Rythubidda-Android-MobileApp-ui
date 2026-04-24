import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import FastImage from 'react-native-fast-image';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { catalogService } from '../../api/services';
import {
  Button,
  Card,
  Divider,
  LoadingScreen,
  Price,
  StarRating,
  Text,
} from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { pickFirstImage, DEFAULT_IMAGE_PLACEHOLDER } from '../../utils/image';
import { useCartStore } from '../../store';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { formatDate } from '../../utils/format';
import { showToast } from '../../utils/toast';
import { haptics } from '../../utils/haptics';
import { APP_CONFIG } from '../../constants/config';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ProductDetail'>;

const { width: SCREEN_W } = Dimensions.get('window');

export const ProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { productId } = route.params;
  const addItem = useCartStore(s => s.addItem);
  const requireAuth = useRequireAuth();
  const [qty, setQty] = useState(1);
  const [selectedOptionId, setSelectedOptionId] = useState<string | number | undefined>();
  const [activeImage, setActiveImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [imageFailed, setImageFailed] = useState<Record<number, boolean>>({});

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => catalogService.getProduct(productId),
  });

  const images = useMemo(() => {
    if (!product) return [];
    const list = [
      product.image,
      product.imageUrl,
      ...(product.gallery || []),
      ...(product.images || []),
    ].filter(Boolean) as string[];
    return list.length > 0 ? list : [''];
  }, [product]);

  if (isLoading || !product) return <LoadingScreen />;

  const selectedOption =
    product.qtyOptions?.find(o => (o.id ?? o.qtyOptionId) === selectedOptionId) ||
    product.qtyOptions?.[0];
  const effectivePrice = selectedOption?.price ?? product.price;
  const effectiveMrp = selectedOption?.mrp ?? product.mrp;

  const handleAddToCart = async (): Promise<boolean> => {
    if (adding) return false;
    haptics.select();
    if (!requireAuth()) return false;

    const id = product.id ?? product.productId;
    if (!id || !effectivePrice) {
      showToast.error('Unable to add — missing product info');
      return false;
    }

    setAdding(true);
    try {
      await addItem({
        productId: id,
        qty,
        price: effectivePrice,
        qtyOptionId: selectedOption?.id ?? selectedOption?.qtyOptionId,
      });
      haptics.success();
      showToast.success('Added to cart');
      return true;
    } catch (e: any) {
      haptics.error();
      showToast.error('Could not add to cart', e?.message ?? 'Please try again');
      return false;
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    const ok = await handleAddToCart();
    if (ok) navigation.getParent()?.navigate('CartTab', { screen: 'CartMain' });
  };

  return (
    <Container edges={['top']}>
      <ScreenHeader title="Product details" />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Image gallery */}
        <View>
          <FastImage
            source={{
              uri: imageFailed[activeImage]
                ? DEFAULT_IMAGE_PLACEHOLDER
                : pickFirstImage(images[activeImage]),
            }}
            style={styles.mainImage}
            resizeMode={FastImage.resizeMode.contain}
            onError={() =>
              setImageFailed(prev => ({ ...prev, [activeImage]: true }))
            }
          />
          {images.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbs}
            >
              {images.map((img, i) => (
                <Pressable
                  key={i}
                  onPress={() => setActiveImage(i)}
                  style={[
                    styles.thumb,
                    i === activeImage && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                >
                  <FastImage
                    source={{ uri: pickFirstImage(img) }}
                    style={styles.thumbImage}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>

        {/* Title, rating, price */}
        <View style={styles.section}>
          <Text variant="h4" color={colors.textPrimary}>
            {product.name}
          </Text>
          {product.rating && product.rating > 0 ? (
            <View style={styles.rating}>
              <StarRating rating={product.rating} size={14} showLabel />
              <Text variant="bodySmall" color={colors.textSecondary} style={{ marginLeft: spacing.sm }}>
                {product.totalReviews ?? product.reviews?.length ?? 0} reviews
              </Text>
            </View>
          ) : null}
          <View style={{ marginTop: spacing.sm }}>
            <Price amount={effectivePrice} mrp={effectiveMrp ?? undefined} size="lg" />
            {selectedOption?.name || product.unit ? (
              <Text
                variant="bodySmall"
                color={colors.textSecondary}
                style={{ marginTop: 4 }}
              >
                per {selectedOption?.name || product.unit}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Quantity options */}
        {product.qtyOptions && product.qtyOptions.length > 0 ? (
          <View style={styles.section}>
            <Text variant="bodyBold" color={colors.textPrimary} style={{ marginBottom: spacing.sm }}>
              Select Size / Variant
            </Text>
            <View style={styles.options}>
              {product.qtyOptions.map(opt => {
                const id = opt.id ?? opt.qtyOptionId!;
                const selected = (selectedOption?.id ?? selectedOption?.qtyOptionId) === id;
                const label = opt.name || opt.label || opt.value || '';
                const hasDiscount = opt.mrp && opt.price && opt.mrp > opt.price;
                return (
                  <Pressable
                    key={`opt-${id}`}
                    onPress={() => setSelectedOptionId(id)}
                    style={[
                      styles.option,
                      selected && {
                        borderColor: colors.primary,
                        backgroundColor: colors.palette.primary[50],
                      },
                    ]}
                  >
                    <Text
                      variant="bodySmall"
                      color={selected ? colors.primaryDark : colors.textPrimary}
                      weight={selected ? '700' : '600'}
                    >
                      {label}
                    </Text>
                    {opt.price != null ? (
                      <Text
                        variant="caption"
                        color={selected ? colors.primaryDark : colors.textSecondary}
                        style={{ marginTop: 2 }}
                      >
                        ₹{opt.price}
                        {hasDiscount ? (
                          <Text variant="caption" color={colors.textMuted}>
                            {'  '}
                            <Text
                              variant="caption"
                              color={colors.textMuted}
                              style={{ textDecorationLine: 'line-through' }}
                            >
                              ₹{opt.mrp}
                            </Text>
                          </Text>
                        ) : null}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Quantity stepper */}
        <View style={[styles.section, styles.qtyRow]}>
          <Text variant="bodyBold">Quantity</Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => setQty(q => Math.max(1, q - 1))}
              style={styles.stepBtn}
              disabled={qty <= 1}
              hitSlop={6}
            >
              <Icon name="minus" size={18} color={qty <= 1 ? colors.disabled : colors.primary} />
            </Pressable>
            <Text variant="h6" color={colors.textPrimary} style={styles.stepValue}>
              {qty}
            </Text>
            <Pressable
              onPress={() => setQty(q => Math.min(APP_CONFIG.MAX_CART_ITEM_QTY, q + 1))}
              style={styles.stepBtn}
              disabled={qty >= APP_CONFIG.MAX_CART_ITEM_QTY}
              hitSlop={6}
            >
              <Icon
                name="plus"
                size={18}
                color={qty >= APP_CONFIG.MAX_CART_ITEM_QTY ? colors.disabled : colors.primary}
              />
            </Pressable>
          </View>
        </View>

        <Divider />

        {/* Description */}
        {product.description ? (
          <View style={styles.section}>
            <Text variant="h6" color={colors.textPrimary} style={{ marginBottom: spacing.sm }}>
              About this product
            </Text>
            <Text variant="body" color={colors.textSecondary}>
              {product.description}
            </Text>
          </View>
        ) : null}

        {/* Reviews */}
        {product.reviews && product.reviews.length > 0 ? (
          <View style={styles.section}>
            <Text variant="h6" color={colors.textPrimary} style={{ marginBottom: spacing.base }}>
              Customer Reviews
            </Text>
            {product.reviews.slice(0, 5).map((r, i) => (
              <Card key={`r-${r.id ?? i}`} elevated={false} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBold" color={colors.textPrimary}>
                      {r.customerName || 'Customer'}
                    </Text>
                    <StarRating rating={r.rating} size={12} />
                  </View>
                  <Text variant="caption" color={colors.textTertiary}>
                    {formatDate(r.createdAt)}
                  </Text>
                </View>
                {r.title ? (
                  <Text variant="bodyBold" style={{ marginTop: spacing.xs }}>
                    {r.title}
                  </Text>
                ) : null}
                {r.comment || r.message ? (
                  <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                    {r.comment || r.message}
                  </Text>
                ) : null}
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <Button
          title="Add to Cart"
          onPress={handleAddToCart}
          variant="outline"
          loading={adding}
          style={{ flex: 1, marginRight: spacing.sm }}
          size="lg"
        />
        <Button
          title="Buy Now"
          onPress={handleBuyNow}
          variant="cta"
          loading={adding}
          style={{ flex: 1 }}
          size="lg"
        />
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  mainImage: {
    width: SCREEN_W,
    height: SCREEN_W * 0.85,
    backgroundColor: colors.palette.secondary[100],
  },
  thumbs: { padding: spacing.base, gap: spacing.sm },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.base,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  thumbImage: { width: '100%', height: '100%' },
  section: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  rating: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.base,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.palette.secondary[100],
    borderRadius: radius.full,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  stepValue: { minWidth: 32, textAlign: 'center', marginHorizontal: spacing.xs },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    flexDirection: 'row',
  },
});
