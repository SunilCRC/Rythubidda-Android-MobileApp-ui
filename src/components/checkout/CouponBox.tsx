import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Card, Text } from '../common';
import { CouponTimeLeft } from './CouponTimeLeft';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { couponService } from '../../api/services/couponService';
import { showToast } from '../../utils/toast';
import type { MyCoupon } from '../../types';

/**
 * Checkout "Coupons" card: the customer's coupons with their live state
 * against this cart, one-tap apply, a code box, and the applied coupon
 * with a Remove link. The server prices everything — after apply/remove
 * we call `onChanged` so the screen re-reads the cart.
 */
interface Props {
  cartId: string | number | undefined;
  /** Coupon code the server has attached to the cart (from cart.discountCode). */
  appliedCode: string | null;
  onChanged: () => Promise<void> | void;
}

export const CouponBox: React.FC<Props> = ({ cartId, appliedCode, onChanged }) => {
  const [coupons, setCoupons] = useState<MyCoupon[]>([]);
  const [firstOrder, setFirstOrder] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await couponService.mine(cartId);
      setCoupons(r.coupons);
      setFirstOrder(r.firstOrder);
    } catch {
      setCoupons([]);
    } finally {
      setLoaded(true);
    }
  }, [cartId]);

  // Eligibility depends on the subtotal, so reload whenever the cart or
  // the applied coupon changes.
  useEffect(() => {
    load();
  }, [load, appliedCode]);

  const apply = async (c: string) => {
    if (!cartId || !c.trim()) return;
    setBusy(c);
    try {
      await couponService.apply(cartId, c.trim().toUpperCase());
      await onChanged();
      setCode('');
      showToast.success(`Coupon ${c.trim().toUpperCase()} applied`);
    } catch (e: any) {
      showToast.error('Could not apply coupon', e?.message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!cartId) return;
    setBusy('__remove');
    try {
      await couponService.remove(cartId);
      await onChanged();
      showToast.success('Coupon removed');
    } catch (e: any) {
      showToast.error('Could not remove coupon', e?.message);
    } finally {
      setBusy(null);
    }
  };

  if (loaded && coupons.length === 0 && !appliedCode) return null;

  return (
    <>
      <Text variant="label" weight="800" color={colors.textPrimary} style={styles.sectionLabel}>
        Coupons
      </Text>
      <Card>
        {appliedCode ? (
          <View style={styles.applied}>
            <Icon name="check-circle" size={16} color={colors.success} />
            <Text variant="bodySmall" weight="700" color={colors.success} style={{ flex: 1 }}>
              {appliedCode} applied
            </Text>
            <Pressable onPress={remove} disabled={busy !== null} hitSlop={8}>
              {busy === '__remove' ? (
                <ActivityIndicator size="small" color={colors.textTertiary} />
              ) : (
                <Text variant="caption" weight="700" color={colors.textTertiary}>
                  Remove
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {firstOrder ? (
          <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
            Your first order gets the FIRST10 discount automatically — coupons can be used from your next order.
          </Text>
        ) : null}

        {coupons.map(c => {
          const isApplied = c.state === 'APPLIED';
          const canApply = c.state === 'READY';
          const hint =
            c.state === 'ADD_MORE'
              ? `Add ₹${c.shortfall.toFixed(0)} more to use this coupon`
              : c.state === 'NEXT_ORDER'
                ? 'Usable from your next order'
                : c.title || `Cart must be at least ₹${c.minCartValue.toFixed(0)}`;
          return (
            <View key={c.id} style={[styles.row, isApplied && styles.rowApplied]}>
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" weight="800" color={colors.textPrimary}>
                  {c.code} · ₹{c.amount.toFixed(0)} off
                </Text>
                <Text variant="caption" color={colors.textSecondary} numberOfLines={2}>
                  {hint}
                  {c.expiresAt ? ` · valid till ${c.expiresAt}` : ''}
                </Text>
                <CouponTimeLeft expiresAtMs={c.expiresAtMs} />
              </View>
              {isApplied ? (
                <Text variant="caption" weight="800" color={colors.success}>
                  Applied
                </Text>
              ) : (
                <Pressable
                  onPress={() => apply(c.code)}
                  disabled={!canApply || busy !== null}
                  style={[styles.applyBtn, (!canApply || busy !== null) && styles.applyBtnOff]}
                  accessibilityRole="button"
                >
                  {busy === c.code ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text variant="caption" weight="800" color={colors.white}>
                      Apply
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        })}

        <View style={styles.codeRow}>
          <TextInput
            value={code}
            onChangeText={t => setCode(t.toUpperCase())}
            placeholder="Have a code? Enter it"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            editable={busy === null}
            onSubmitEditing={() => apply(code)}
            returnKeyType="done"
          />
          <Pressable
            onPress={() => apply(code)}
            disabled={busy !== null || !code.trim()}
            style={[styles.codeBtn, (busy !== null || !code.trim()) && styles.applyBtnOff]}
            accessibilityRole="button"
          >
            <Text variant="caption" weight="800" color={colors.primaryDark}>
              Apply
            </Text>
          </Pressable>
        </View>
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  applied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowApplied: { borderStyle: 'solid', borderColor: colors.success, backgroundColor: colors.successSoft },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  applyBtnOff: { opacity: 0.45 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.base,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 14,
  },
  codeBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
});
