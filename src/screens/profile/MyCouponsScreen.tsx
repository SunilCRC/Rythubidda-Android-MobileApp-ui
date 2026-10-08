import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { EmptyState, LoadingScreen, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { couponService } from '../../api/services/couponService';
import { useCartStore } from '../../store';
import type { MyCoupon } from '../../types';
import { CouponTimeLeft } from '../../components/checkout/CouponTimeLeft';

/**
 * "My Coupons" — every coupon the admin has given this customer with a
 * plain-language state. Applying happens on the checkout screen.
 */
export const MyCouponsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const cart = useCartStore(s => s.cart);
  const [coupons, setCoupons] = useState<MyCoupon[]>([]);
  const [firstOrder, setFirstOrder] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await couponService.mine(cart?.cartId);
      setCoupons(r.coupons);
      setFirstOrder(r.firstOrder);
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [cart?.cartId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const stateLine = (c: MyCoupon) => {
    switch (c.state) {
      case 'APPLIED':
        return { text: 'Applied to your cart', color: colors.success };
      case 'READY':
        return { text: 'Ready to use at checkout', color: colors.success };
      case 'ADD_MORE':
        return { text: `Add ₹${c.shortfall.toFixed(0)} more to your cart to use it`, color: colors.warning };
      default:
        return { text: 'Usable from your next order', color: colors.textSecondary };
    }
  };

  if (loading) return <LoadingScreen message="Loading your coupons..." />;

  return (
    <Container edges={['top']}>
      <ScreenHeader title="My Coupons" subtitle="Given to you by Rythu Bidda" showBack />
      {coupons.length === 0 ? (
        <EmptyState
          icon="tag"
          title="No coupons yet"
          subtitle="When we give you a coupon, it will show up here."
        />
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            firstOrder ? (
              <View style={styles.note}>
                <Text variant="caption" color={colors.textSecondary}>
                  Your first order gets the FIRST10 discount automatically. These coupons can be used from your
                  next order onward.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item: c }) => {
            const st = stateLine(c);
            return (
              <View style={styles.card}>
                <View style={styles.badge}>
                  <Icon name="tag" size={14} color={colors.white} />
                  <Text variant="caption" weight="800" color={colors.white}>
                    {c.code}
                  </Text>
                </View>
                <Text variant="h5" weight="800" color={colors.textPrimary} style={{ marginTop: spacing.xs }}>
                  ₹{c.amount.toFixed(0)} off
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {c.title ? `${c.title} · ` : ''}
                  Use on a cart of ₹{c.minCartValue.toFixed(0)} or more
                  {c.expiresAt ? ` · valid till ${c.expiresAt}` : ''}
                </Text>
                <CouponTimeLeft expiresAtMs={c.expiresAtMs} />
                <Text variant="caption" weight="700" color={st.color} style={{ marginTop: spacing.xs }}>
                  {st.text}
                </Text>
              </View>
            );
          }}
          ListFooterComponent={
            <Text
              variant="caption"
              weight="700"
              color={colors.primary}
              align="center"
              style={{ marginTop: spacing.md }}
              onPress={() => navigation.getParent()?.navigate('HomeTab')}
            >
              Continue shopping →
            </Text>
          }
        />
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  list: { padding: spacing.base, paddingBottom: spacing.xl * 2 },
  note: {
    backgroundColor: colors.tintSoft,
    borderRadius: radius.base,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.tintStrong,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.base,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
