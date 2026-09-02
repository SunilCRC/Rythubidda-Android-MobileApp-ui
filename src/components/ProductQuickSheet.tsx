import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Feather';
import { useQuery } from '@tanstack/react-query';
import { Skeleton, Text } from './common';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { catalogService, homeContentService } from '../api/services';
import { pickFirstImage } from '../utils/image';
import { useCartStore, useIsAuthenticated } from '../store';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { showToast } from '../utils/toast';
import { haptics } from '../utils/haptics';
import type { TodaysDeal } from '../types';

/**
 * Zepto-style product QUICK SHEET (approved v3 board): tap a tile →
 * this sheet slides up → pick a variant, set quantity, add — swipe
 * away and keep browsing. The full ProductDetail screen stays for
 * deep readers via "View full details".
 *
 * Two modes:
 *   • product mode — fetches /product/{id} for fresh options/price
 *   • deal mode    — options come from the deal's variants; their
 *     cart ids ride in the reserved namespace the backend prices
 *     from the deal (qtyOptionId = BASE + variant id). Quantity is
 *     clamped to the deal's per-customer limit; the server enforces
 *     everything again anyway.
 */
export const DEAL_VARIANT_OPTION_BASE = 1_000_000;

interface SheetOption {
  qtyOptionId?: number;
  label: string;
  price: number;
  mrp?: number;
  isDeal?: boolean;
}

interface Props {
  visible: boolean;
  productId?: number;
  deal?: TodaysDeal | null;
  onClose: () => void;
  onViewDetails: (productId: number) => void;
}

export const ProductQuickSheet: React.FC<Props> = ({
  visible,
  productId,
  deal,
  onClose,
  onViewDetails,
}) => {
  const addItem = useCartStore(s => s.addItem);
  const requireAuth = useRequireAuth();
  const isAuthenticated = useIsAuthenticated();
  const [qty, setQty] = useState(1);
  const [optIdx, setOptIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const resolvedProductId = deal ? deal.productId : productId;

  const detail = useQuery({
    queryKey: ['productQuick', resolvedProductId],
    queryFn: () => catalogService.getProduct(resolvedProductId!),
    enabled: visible && !deal && !!resolvedProductId,
    staleTime: 60 * 1000,
  });

  const firstOrder = useQuery({
    queryKey: ['firstOrderDiscount'],
    queryFn: homeContentService.getFirstOrderDiscount,
    enabled: visible && isAuthenticated,
    staleTime: 30 * 1000,
  });

  // Reset selection each time the sheet opens for a new subject.
  useEffect(() => {
    if (visible) {
      setQty(1);
      setOptIdx(0);
    }
  }, [visible, resolvedProductId]);

  const options: SheetOption[] = useMemo(() => {
    if (deal) {
      const variants = deal.variants ?? [];
      if (variants.length > 0) {
        return variants.map(v => ({
          qtyOptionId: DEAL_VARIANT_OPTION_BASE + v.id,
          label: v.label,
          price: v.price,
          isDeal: true,
        }));
      }
      return [{
        qtyOptionId: deal.qtyOptionId ?? undefined,
        label: (deal.variantLabel || '').trim() || 'Deal price',
        price: deal.dealPrice,
        isDeal: true,
      }];
    }
    const p = detail.data;
    const opts = p?.qtyOptions ?? [];
    if (opts.length > 0) {
      return opts.map(o => ({
        qtyOptionId: (o.id ?? o.qtyOptionId) as number | undefined,
        label: o.name || o.label || o.value || '',
        price: o.price ?? p?.price ?? 0,
        mrp: o.mrp,
      }));
    }
    if (p) {
      return [{ qtyOptionId: undefined, label: p.unit ? String(p.unit) : 'Standard', price: p.price ?? 0, mrp: p.mrp }];
    }
    return [];
  }, [deal, detail.data]);

  const selected = options[Math.min(optIdx, Math.max(0, options.length - 1))];
  const name = deal ? deal.productName : detail.data?.name ?? '';
  const image = deal
    ? deal.productImage
    : pickFirstImage(detail.data?.image, detail.data?.imageUrl, detail.data?.images?.[0]);
  const maxQty = deal && deal.maxQtyPerCustomer > 0 ? deal.maxQtyPerCustomer : 30;
  const lineTotal = (selected?.price ?? 0) * qty;
  // Out-of-stock guard — the sheet is the primary add path, so it
  // must enforce stock exactly like the product card does.
  const outOfStock = !deal && detail.data?.inStock === false;
  const eligible = !isAuthenticated || firstOrder.data?.eligible === true;
  const whisperSaving = Math.round(lineTotal * 0.10);

  const handleAdd = async () => {
    if (outOfStock) return;
    if (!requireAuth()) return;
    if (!resolvedProductId || !selected || busy) return;
    setBusy(true);
    haptics.success();
    try {
      await addItem({
        productId: resolvedProductId,
        qty,
        price: selected.price,
        qtyOptionId: selected.qtyOptionId,
      });
      showToast.success(deal ? 'Deal added to cart' : 'Added to cart');
      onClose();
    } catch (err: any) {
      showToast.error('Could not add to cart', err?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <View style={styles.top}>
          {image ? (
            <FastImage source={{ uri: image }} style={styles.ph} resizeMode={FastImage.resizeMode.cover} />
          ) : (
            <View style={[styles.ph, styles.phFallback]}>
              <Icon name="image" size={22} color={colors.textTertiary} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            {!deal && detail.isLoading ? (
              <>
                <Skeleton height={20} width="80%" />
                <Skeleton height={14} width="55%" style={{ marginTop: 8 }} />
              </>
            ) : (
              <>
                <Text variant="h5" weight="800" color={colors.textPrimary} numberOfLines={2}>
                  {name}
                </Text>
                {deal ? (
                  <View style={styles.dealTag}>
                    <Icon name="zap" size={10} color="#B3541E" />
                    <Text variant="caption" weight="800" color="#B3541E" style={{ fontSize: 8.5, letterSpacing: 0.6 }}>
                      DEAL OF THE DAY
                      {deal.maxQtyPerCustomer > 0 ? `  ·  LIMIT ${deal.maxQtyPerCustomer}` : ''}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityLabel="Close">
            <Icon name="x" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {options.length > 0 ? (
          <View style={styles.vars}>
            {options.slice(0, 3).map((o, i) => {
              const on = i === optIdx;
              return (
                <Pressable
                  key={`${o.qtyOptionId ?? 'std'}-${i}`}
                  onPress={() => setOptIdx(i)}
                  style={[styles.varCard, on && styles.varOn]}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${o.label} at ₹${o.price}`}
                >
                  {o.isDeal ? (
                    <View style={styles.saveRibbon}>
                      <Text variant="caption" weight="800" color={colors.white} style={{ fontSize: 7.5 }}>
                        DEAL PRICE
                      </Text>
                    </View>
                  ) : null}
                  <Text variant="bodySmall" weight="800" color={colors.textPrimary} numberOfLines={1}>
                    {o.label}
                  </Text>
                  <Text variant="caption" weight="800" color={colors.primaryDark}>
                    ₹{o.price}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.buyRow}>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => setQty(q => Math.max(1, q - 1))}
              hitSlop={8}
              accessibilityLabel="Decrease quantity"
            >
              <Icon name="minus" size={16} color={colors.primary} />
            </Pressable>
            <Text variant="body" weight="800" color={colors.textPrimary} style={{ minWidth: 20, textAlign: 'center' }}>
              {qty}
            </Text>
            <Pressable
              onPress={() => setQty(q => Math.min(maxQty, q + 1))}
              hitSlop={8}
              accessibilityLabel="Increase quantity"
            >
              <Icon name="plus" size={16} color={colors.primary} />
            </Pressable>
          </View>
          <Pressable
            onPress={handleAdd}
            disabled={busy || !selected || outOfStock}
            style={({ pressed }) => [
              styles.buyBtn,
              outOfStock && styles.buyBtnDisabled,
              (pressed || busy) && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={outOfStock ? 'Out of stock' : 'Add to cart'}
          >
            <Text variant="bodySmall" weight="800" color={colors.white}>
              {outOfStock ? 'Out of stock' : busy ? 'Adding…' : 'Add to Cart'}
            </Text>
            {!outOfStock ? (
              <Text variant="bodySmall" weight="800" color={colors.white}>
                ₹{lineTotal}
              </Text>
            ) : null}
          </Pressable>
        </View>

        {eligible && whisperSaving > 0 ? (
          <Text variant="caption" weight="800" color="#14735F" align="center" style={styles.whisper}>
            {isAuthenticated
              ? `FIRST10 auto-applies at checkout · you'll save ₹${whisperSaving} more`
              : 'New here? Get 10% OFF your first order at checkout'}
          </Text>
        ) : null}

        {/* Full-details link is for CATALOG products only — the deal
            sheet hides it (user feedback): the detail page shows the
            regular price, which would contradict the deal price. */}
        {resolvedProductId && !deal ? (
          <Pressable
            onPress={() => {
              onClose();
              onViewDetails(resolvedProductId);
            }}
            hitSlop={6}
            accessibilityRole="button"
          >
            <Text variant="caption" weight="800" color={colors.primary} align="center" style={{ marginTop: 8 }}>
              View full details →
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(23,16,8,0.5)' },
  sheet: {
    backgroundColor: '#FFFDF8',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing.base,
    paddingTop: 10,
    paddingBottom: spacing.lg,
  },
  grab: {
    width: 40,
    height: 4,
    borderRadius: 99,
    backgroundColor: '#E3D5C0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  top: { flexDirection: 'row', gap: spacing.md },
  ph: {
    width: 88,
    height: 98,
    borderRadius: radius.lg,
    backgroundColor: colors.tintSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phFallback: { alignItems: 'center', justifyContent: 'center' },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.tintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FDE4CB',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  vars: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  varCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 13,
    paddingVertical: 9,
    alignItems: 'center',
  },
  varOn: { borderColor: colors.primary, backgroundColor: '#FBF3EA' },
  saveRibbon: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#2A9D8F',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  buyRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.base, alignItems: 'center' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  buyBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 13,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
  },
  buyBtnDisabled: {
    backgroundColor: colors.disabled,
    justifyContent: 'center',
  },
  whisper: { marginTop: 10, fontSize: 9.5 },
});
