import React, { useEffect } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import FastImage from 'react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import {
  Button,
  Card,
  Divider,
  EmptyState,
  Price,
  SignInPrompt,
  Text,
} from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { useCartStore, useIsAuthenticated } from '../../store';
import { pickFirstImage } from '../../utils/image';
import { formatINR, toArray } from '../../utils/format';
import { showToast } from '../../utils/toast';
import type { ShoppingItem } from '../../types';

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isAuth = useIsAuthenticated();
  const { cart, loading, refresh, updateQty, removeItem } = useCartStore();

  useEffect(() => {
    if (isAuth) refresh();
  }, [isAuth, refresh]);

  if (!isAuth) {
    return (
      <Container edges={['top']}>
        <ScreenHeader title="My Cart" showBack={false} />
        <SignInPrompt
          icon="shopping-bag"
          title="Sign in to see your cart"
          subtitle="Your cart and checkout are saved to your account. Sign in or create an account to continue."
        />
      </Container>
    );
  }

  const items = toArray<ShoppingItem>(cart?.items);
  const subtotal = cart?.subtotal ?? items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = cart?.shippingCost ?? 0;
  const total = cart?.orderTotal ?? subtotal + shipping;

  const handleCheckout = () => {
    if (items.length === 0) return;
    navigation.navigate('Checkout');
  };

  const handleQtyChange = async (item: ShoppingItem, delta: number) => {
    const id = item.itemId ?? item.cartItemId;
    if (!id) return;
    const newQty = Math.max(1, Math.min(10, item.qty + delta));
    if (newQty === item.qty) return;
    try {
      await updateQty(id, newQty);
    } catch (e: any) {
      showToast.error('Could not update quantity', e?.message);
    }
  };

  const handleRemove = async (item: ShoppingItem) => {
    const id = item.itemId ?? item.cartItemId;
    if (!id) return;
    try {
      await removeItem(id);
      showToast.success('Removed from cart');
    } catch (e: any) {
      showToast.error('Could not remove item', e?.message);
    }
  };

  return (
    <Container edges={['top']}>
      <ScreenHeader title="My Cart" showBack={false} />
      {items.length === 0 ? (
        <EmptyState
          icon="shopping-bag"
          title="Your cart is empty"
          subtitle="Add fresh products to get started."
          actionLabel="Shop now"
          onAction={() => navigation.getParent()?.navigate('HomeTab')}
        />
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(it, i) => `ci-${it.itemId ?? it.cartItemId ?? i}`}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />
            }
            renderItem={({ item }) => (
              <CartLineItem
                item={item}
                onIncrement={() => handleQtyChange(item, 1)}
                onDecrement={() => handleQtyChange(item, -1)}
                onRemove={() => handleRemove(item)}
                onPress={() =>
                  item.productId &&
                  navigation.navigate('ProductDetail', { productId: item.productId })
                }
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            ListFooterComponent={
              <Card style={{ marginTop: spacing.base }}>
                <Text variant="h6" style={{ marginBottom: spacing.base }}>
                  Order Summary
                </Text>
                <Row label="Subtotal" value={formatINR(subtotal)} />
                <Row
                  label="Shipping"
                  value={shipping > 0 ? formatINR(shipping) : 'Calculated at checkout'}
                />
                <Divider spacing_={spacing.sm} />
                <Row label="Total" value={formatINR(total)} bold />
              </Card>
            }
          />
          <View style={styles.bottomBar}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.textSecondary}>
                Subtotal
              </Text>
              <Price amount={subtotal} size="md" />
            </View>
            <Button title="Checkout" onPress={handleCheckout} size="lg" style={{ flex: 1 }} />
          </View>
        </>
      )}
    </Container>
  );
};

const CartLineItem: React.FC<{
  item: ShoppingItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onPress: () => void;
}> = ({ item, onIncrement, onDecrement, onRemove, onPress }) => {
  const img = pickFirstImage(item.image, item.product?.image, item.product?.imageUrl);
  const name = item.name || item.product?.name || 'Product';
  return (
    <Card padded={false} style={styles.cartItem}>
      <Pressable onPress={onPress} style={styles.itemRow}>
        <FastImage source={{ uri: img }} style={styles.itemImage} resizeMode={FastImage.resizeMode.cover} />
        <View style={{ flex: 1, paddingHorizontal: spacing.sm }}>
          <Text variant="bodyBold" numberOfLines={2} color={colors.textPrimary}>
            {name}
          </Text>
          {item.qtyOptionLabel ? (
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
              {item.qtyOptionLabel}
            </Text>
          ) : null}
          <Price amount={item.price * item.qty} size="sm" />
        </View>
        <Pressable onPress={onRemove} hitSlop={10} style={styles.removeBtn}>
          <Icon name="trash-2" size={16} color={colors.error} />
        </Pressable>
      </Pressable>
      <View style={styles.qtyRow}>
        <View style={styles.stepper}>
          <Pressable onPress={onDecrement} style={styles.stepBtn} hitSlop={6}>
            <Icon name="minus" size={16} color={colors.primary} />
          </Pressable>
          <Text variant="bodyBold" style={styles.stepValue}>
            {item.qty}
          </Text>
          <Pressable onPress={onIncrement} style={styles.stepBtn} hitSlop={6}>
            <Icon name="plus" size={16} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    </Card>
  );
};

const Row: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <View style={styles.summaryRow}>
    <Text
      variant={bold ? 'bodyBold' : 'body'}
      color={bold ? colors.textPrimary : colors.textSecondary}
    >
      {label}
    </Text>
    <Text variant={bold ? 'h6' : 'bodyBold'} color={colors.textPrimary}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  list: { padding: spacing.base, paddingBottom: 120 },
  cartItem: { padding: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: radius.base,
    backgroundColor: colors.palette.secondary[100],
  },
  removeBtn: { padding: 6 },
  qtyRow: { alignItems: 'flex-end', marginTop: spacing.xs },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.palette.secondary[100],
    borderRadius: radius.full,
    paddingHorizontal: 4,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  stepValue: { minWidth: 28, textAlign: 'center', marginHorizontal: spacing.xs },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
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
    alignItems: 'center',
    gap: spacing.sm,
  },
});
