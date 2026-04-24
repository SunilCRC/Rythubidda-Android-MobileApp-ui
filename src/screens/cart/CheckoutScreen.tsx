import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import RazorpayCheckout from 'react-native-razorpay';
import {
  Button,
  Card,
  Divider,
  EmptyState,
  LoadingScreen,
  Text,
} from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import {
  addressService,
  cartService,
  catalogService,
  paymentService,
} from '../../api/services';
import { useAuthStore, useCartStore } from '../../store';
import { showToast } from '../../utils/toast';
import { formatINR, toArray } from '../../utils/format';
import { APP_CONFIG } from '../../constants/config';
import type { CustomerAddress, PaymentMethod } from '../../types';

type PayOption = Exclude<PaymentMethod, 'COD'>;

export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { cart, refresh, clear } = useCartStore();
  const user = useAuthStore(s => s.user);

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressId, setAddressId] = useState<number | undefined>();
  const [shippingCost, setShippingCost] = useState<number | undefined>();
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [pincodeOk, setPincodeOk] = useState<boolean | undefined>();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [payMethod, setPayMethod] = useState<PayOption>('RAZORPAY');

  useEffect(() => {
    (async () => {
      try {
        const raw = await addressService.list();
        const list = toArray<CustomerAddress>(raw);
        setAddresses(list);
        if (list[0]?.customerAddressId) setAddressId(list[0].customerAddressId);
      } catch (e: any) {
        showToast.error('Failed to load addresses', e?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedAddress = addresses.find(a => a.customerAddressId === addressId);

  // Re-calculate shipping when cart or address changes
  useEffect(() => {
    const run = async () => {
      if (!cart?.cartId || !selectedAddress?.postcode) {
        setShippingCost(undefined);
        setFreeDelivery(false);
        return;
      }
      try {
        const pinValid = await catalogService.validatePincode(selectedAddress.postcode);
        setPincodeOk(!!pinValid?.isDeliverable);
        if (!pinValid?.isDeliverable) {
          setShippingCost(undefined);
          return;
        }
        const res = await cartService.calculateShipping(cart.cartId, selectedAddress.postcode);
        setShippingCost(res?.shippingCost ?? 0);
        setFreeDelivery(!!res?.isFreeDelivery);
      } catch (e: any) {
        setShippingCost(undefined);
      }
    };
    run();
  }, [cart?.cartId, selectedAddress?.postcode]);

  if (loading) return <LoadingScreen />;

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <Container edges={['top']}>
        <ScreenHeader title="Checkout" />
        <EmptyState
          icon="shopping-bag"
          title="Your cart is empty"
          subtitle="Add items to your cart to proceed."
          actionLabel="Go shopping"
          onAction={() => navigation.getParent()?.navigate('HomeTab')}
        />
      </Container>
    );
  }

  const subtotal = cart.subtotal || cart.items.reduce((s, i) => s + i.price * i.qty, 0);
  const effectiveShipping = freeDelivery || subtotal >= APP_CONFIG.MIN_ORDER_FREE_SHIPPING
    ? 0
    : shippingCost ?? 0;
  const total = subtotal + effectiveShipping;

  const startPayment = async () => {
    if (!addressId) {
      showToast.error('Please select a delivery address');
      return;
    }
    if (pincodeOk === false) {
      showToast.error('We do not deliver to this pincode yet');
      return;
    }
    setProcessing(true);
    try {
      // Link address to cart + review
      await cartService.reviewOrder({
        cartId: cart.cartId!,
        addressId,
      });

      if (payMethod === 'PAY_AFTER_DELIVERY') {
        await paymentService.createOrder(cart.cartId!, 'PAY_AFTER_DELIVERY');
        await clear();
        await refresh();
        navigation.replace('OrderSuccess', { orderId: cart.cartId });
        showToast.success('Order placed!');
        return;
      }

      const rzpConfig = await paymentService.createRazorpayOrder(cart.cartId!);
      const options = {
        description: 'Rythu Bidda Order',
        image: 'https://rythubidda.com/rythubidda-logo.png',
        currency: rzpConfig.currency || 'INR',
        key: rzpConfig.key_id,
        amount: rzpConfig.amount,
        name: 'Rythu Bidda',
        order_id: rzpConfig.id,
        prefill: {
          email: rzpConfig.customer_email || user?.email || '',
          contact: rzpConfig.customer_phone || user?.phone || '',
          name: rzpConfig.customer_name ||
            `${user?.firstname ?? user?.firstName ?? ''} ${user?.lastname ?? user?.lastName ?? ''}`.trim(),
        },
        theme: { color: colors.primary },
      } as const;

      try {
        const result: any = await RazorpayCheckout.open(options as any);
        await paymentService.verifyRazorpay({
          razorpay_order_id: result.razorpay_order_id,
          razorpay_payment_id: result.razorpay_payment_id,
          razorpay_signature: result.razorpay_signature,
          cartId: cart.cartId!,
        });
        await clear();
        await refresh();
        navigation.replace('OrderSuccess', { orderId: cart.cartId });
        showToast.success('Payment successful');
      } catch (err: any) {
        if (err?.code === 0 || err?.code === 'PAYMENT_CANCELLED') {
          await paymentService.cancelRazorpay(rzpConfig.id, cart.cartId!);
          showToast.info('Payment cancelled');
        } else {
          await paymentService.failRazorpay({
            razorpay_order_id: rzpConfig.id,
            cartId: cart.cartId!,
            error_code: err?.code,
            error_description: err?.description || err?.message,
          });
          showToast.error('Payment failed', err?.description || err?.message);
        }
      }
    } catch (e: any) {
      showToast.error('Checkout failed', e?.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Container edges={['top']}>
      <ScreenHeader title="Checkout" />
      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: 120 }}>
        {/* Address */}
        <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
          Delivery Address
        </Text>
        {addresses.length === 0 ? (
          <Card>
            <Text variant="body" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
              You haven't saved any addresses yet.
            </Text>
            <Button
              title="Add address"
              onPress={() => navigation.navigate('AddEditAddress')}
              variant="outline"
            />
          </Card>
        ) : (
          <>
            {addresses.map(a => (
              <Pressable
                key={`addr-${a.customerAddressId}`}
                onPress={() => setAddressId(a.customerAddressId)}
                style={[
                  styles.addressCard,
                  addressId === a.customerAddressId && styles.addressSelected,
                ]}
              >
                <View style={styles.radio}>
                  {addressId === a.customerAddressId ? (
                    <View style={styles.radioDot} />
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyBold" color={colors.textPrimary}>
                    {a.firstname} {a.lastname}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {a.address1}
                    {a.address2 ? `, ${a.address2}` : ''}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {a.city}, {a.state} - {a.postcode}
                  </Text>
                  <Text variant="caption" color={colors.textTertiary}>
                    {a.telephone}
                  </Text>
                </View>
              </Pressable>
            ))}
            <Pressable
              onPress={() => navigation.navigate('AddEditAddress')}
              style={styles.addAddress}
            >
              <Icon name="plus" size={16} color={colors.primary} />
              <Text variant="bodySmall" color={colors.primary} weight="700" style={{ marginLeft: 4 }}>
                Add new address
              </Text>
            </Pressable>
          </>
        )}

        {pincodeOk === false ? (
          <Card style={{ backgroundColor: '#fef2f2', marginTop: spacing.sm }} elevated={false}>
            <Text variant="bodySmall" color={colors.error}>
              We do not deliver to the selected pincode yet.
            </Text>
          </Card>
        ) : null}

        {/* Payment Method */}
        <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
          Payment Method
        </Text>
        <PaymentOption
          label="Pay online (UPI / Card / Wallet)"
          subtitle="Secure payment via Razorpay"
          icon="credit-card"
          selected={payMethod === 'RAZORPAY'}
          onPress={() => setPayMethod('RAZORPAY')}
        />
        <PaymentOption
          label="Pay on delivery"
          subtitle="Pay when you receive the order"
          icon="truck"
          selected={payMethod === 'PAY_AFTER_DELIVERY'}
          onPress={() => setPayMethod('PAY_AFTER_DELIVERY')}
        />

        {/* Summary */}
        <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
          Order Summary
        </Text>
        <Card>
          {cart.items.map((it, i) => (
            <View key={`sm-${it.itemId ?? i}`} style={styles.summaryLine}>
              <Text variant="bodySmall" color={colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>
                {(it.name || it.product?.name) ?? 'Item'} × {it.qty}
              </Text>
              <Text variant="bodySmall" color={colors.textPrimary}>
                {formatINR(it.price * it.qty)}
              </Text>
            </View>
          ))}
          <Divider spacing_={spacing.sm} />
          <SummaryRow label="Subtotal" value={formatINR(subtotal)} />
          <SummaryRow
            label="Shipping"
            value={
              effectiveShipping === 0
                ? freeDelivery || subtotal >= APP_CONFIG.MIN_ORDER_FREE_SHIPPING
                  ? 'FREE'
                  : formatINR(0)
                : formatINR(effectiveShipping)
            }
          />
          <Divider spacing_={spacing.sm} />
          <SummaryRow label="Total" value={formatINR(total)} bold />
        </Card>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={colors.textSecondary}>
            Total
          </Text>
          <Text variant="h5" color={colors.primaryDark}>
            {formatINR(total)}
          </Text>
        </View>
        <Button
          title={payMethod === 'RAZORPAY' ? 'Pay Now' : 'Place Order'}
          onPress={startPayment}
          size="lg"
          loading={processing}
          style={{ flex: 1.2 }}
          disabled={!addressId || pincodeOk === false}
        />
      </View>
    </Container>
  );
};

const PaymentOption: React.FC<{
  label: string;
  subtitle: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}> = ({ label, subtitle, icon, selected, onPress }) => (
  <Pressable
    onPress={onPress}
    style={[styles.payOpt, selected && styles.payOptSelected]}
  >
    <View style={styles.radio}>{selected ? <View style={styles.radioDot} /> : null}</View>
    <Icon name={icon} size={22} color={colors.primary} style={{ marginHorizontal: spacing.sm }} />
    <View style={{ flex: 1 }}>
      <Text variant="bodyBold" color={colors.textPrimary}>
        {label}
      </Text>
      <Text variant="caption" color={colors.textSecondary}>
        {subtitle}
      </Text>
    </View>
  </Pressable>
);

const SummaryRow: React.FC<{ label: string; value: string; bold?: boolean }> = ({
  label,
  value,
  bold,
}) => (
  <View style={styles.summaryLine}>
    <Text variant={bold ? 'bodyBold' : 'body'} color={colors.textSecondary}>
      {label}
    </Text>
    <Text variant={bold ? 'h6' : 'bodyBold'} color={colors.textPrimary}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  sectionLabel: { marginTop: spacing.base, marginBottom: spacing.sm, marginLeft: 2 },
  addressCard: {
    flexDirection: 'row',
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  addressSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.palette.primary[50],
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  addAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  payOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  payOptSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.palette.primary[50],
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
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
