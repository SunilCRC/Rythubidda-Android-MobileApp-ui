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
import { forwardGeocode } from '../../utils/googleGeocode';
import { calculateShippingMobile } from '../../utils/mobileShipping';
import { formatKm } from '../../utils/format';
import { useAuthStore, useCartStore } from '../../store';
import { showToast } from '../../utils/toast';
import { formatINR, toArray } from '../../utils/format';
import { SHIPPING_CONFIG } from '../../constants/shipping';
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
  // Distance-based fields surfaced by the backend when the selected
  // address has lat/lng AND falls within delivery-center radius.
  // Mobile is google-only — if these are absent after a calculation,
  // we treat the address as out-of-range and block checkout.
  const [distanceKm, setDistanceKm] = useState<number | undefined>();
  const [centerName, setCenterName] = useState<string | undefined>();
  const [outOfRange, setOutOfRange] = useState(false);
  const [computingShipping, setComputingShipping] = useState(false);
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

  // Compute shipping ENTIRELY on the mobile side using Google-resolved
  // coordinates. The flow:
  //   1. Validate pincode (existing serviceability gate)
  //   2. Make sure the address has lat/lng — if missing, forward-geocode
  //      from its fields via Google and persist back to the backend
  //   3. Run the local Haversine + per-km calculator
  //
  // No backend `calculateShipping` call is needed for display — the math
  // is identical on both sides. Backend still sees the final cost when
  // we persist the cart at order time.
  useEffect(() => {
    const run = async () => {
      if (!cart?.cartId || !selectedAddress?.postcode) {
        setShippingCost(undefined);
        setFreeDelivery(false);
        setDistanceKm(undefined);
        setCenterName(undefined);
        setOutOfRange(false);
        return;
      }
      setComputingShipping(true);
      setOutOfRange(false);
      try {
        const pinValid = await catalogService.validatePincode(selectedAddress.postcode);
        setPincodeOk(!!pinValid?.isDeliverable);
        if (!pinValid?.isDeliverable) {
          setShippingCost(undefined);
          setDistanceKm(undefined);
          return;
        }

        // Resolve lat/lng — first from the address row, then via Google
        // forward-geocode if the row is missing them (legacy address, or
        // backend POST controller dropped them on save).
        let lat = selectedAddress.latitude;
        let lng = selectedAddress.longitude;

        if (typeof lat !== 'number' || typeof lng !== 'number') {
          const composite = [
            selectedAddress.address1,
            selectedAddress.address2,
            selectedAddress.city,
            selectedAddress.state,
            selectedAddress.postcode,
            'India',
          ]
            .filter(Boolean)
            .join(', ');
          const geo = await forwardGeocode(composite);
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('[checkout] geocode result:', geo.ok ? geo.address : geo);
          }
          if (geo.ok) {
            lat = geo.address.latitude;
            lng = geo.address.longitude;
            // Persist back so we don't have to re-geocode next time.
            // Best-effort — failure here doesn't block the user.
            if (selectedAddress.customerAddressId) {
              try {
                await addressService.update({
                  ...selectedAddress,
                  latitude: lat,
                  longitude: lng,
                });
                setAddresses(prev =>
                  prev.map(a =>
                    a.customerAddressId === selectedAddress.customerAddressId
                      ? { ...a, latitude: lat, longitude: lng }
                      : a,
                  ),
                );
              } catch {
                // ignore — coordinates are in memory; we'll just re-geocode
                // next checkout if the persist failed.
              }
            }
          } else {
            // Geocoding failed (key restrictions, no internet, no result).
            // Show clear error rather than silent "out of range".
            setShippingCost(undefined);
            setDistanceKm(undefined);
            setCenterName(undefined);
            setFreeDelivery(false);
            setOutOfRange(true);
            return;
          }
        }

        // Run the mobile-side calculation. Pure local math — no network.
        const items = toArray(cart?.items) as Array<{ price: number; qty: number }>;
        const cartSubtotal =
          cart?.subtotal ?? items.reduce((s, i) => s + i.price * i.qty, 0);
        const result = calculateShippingMobile(lat!, lng!, cartSubtotal);
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[checkout] shipping calc:', result);
        }

        if (!result.applicable) {
          setShippingCost(undefined);
          setDistanceKm(result.distanceKm);
          setCenterName(undefined);
          setFreeDelivery(false);
          setOutOfRange(true);
          return;
        }

        setShippingCost(result.cost);
        setFreeDelivery(result.isFree);
        setDistanceKm(result.distanceKm);
        setCenterName(SHIPPING_CONFIG.warehouseName);
        setOutOfRange(false);
      } catch (e: any) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[checkout] shipping calc failed:', e?.message);
        }
        setShippingCost(undefined);
        setDistanceKm(undefined);
        setCenterName(undefined);
        setOutOfRange(false);
      } finally {
        setComputingShipping(false);
      }
    };
    run();
    // `subtotal` is read inside but is derived from cart.items — listening
    // on cart.cartId is enough for our purposes (item changes refresh cart).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.cartId, selectedAddress?.postcode, selectedAddress?.customerAddressId, selectedAddress?.latitude, selectedAddress?.longitude]);

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
  const effectiveShipping = freeDelivery || subtotal >= SHIPPING_CONFIG.freeAboveCartAmount
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
    if (outOfRange) {
      showToast.error(
        'Out of delivery range',
        'Pick an address within our serviceable radius.',
      );
      return;
    }
    setProcessing(true);
    try {
      // Mirror the web's place-order sequence:
      //   1. updateCartAddress  → persists customerAddressId on the cart row
      //   2. calculateShipping  → persists zipCode + shippingCost on the cart
      // We deliberately do NOT call /cart/review-order here. That backend
      // endpoint requires `shippingCode` AND `shippingName` to already be set
      // on the cart (see ShoppingCartController#reviewOrder), and our
      // calculateShipping flow doesn't populate those columns. Calling it
      // therefore returns 400 "Shipping information is missing", which is
      // exactly what we were seeing. The web Checkout (Rythubidda-UI/src/
      // pages/Checkout.tsx) skips reviewOrder for the same reason.
      await paymentService.updateCartAddress(cart.cartId!, addressId);
      if (selectedAddress?.postcode) {
        // Re-confirm shipping at payment time. Send lat/lng so the
        // backend's persisted shippingCost reflects the distance-based
        // amount (not the legacy pincode fallback).
        await cartService.calculateShipping(cart.cartId!, selectedAddress.postcode, {
          lat: typeof selectedAddress.latitude === 'number' ? selectedAddress.latitude : undefined,
          lng: typeof selectedAddress.longitude === 'number' ? selectedAddress.longitude : undefined,
        });
      }

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

        {/* Out-of-range banner — fires when the address has lat/lng but
            falls outside the configured delivery radius (or the backend
            otherwise couldn't compute a distance). Mobile is google-only,
            so we block checkout in this case rather than fall through to
            pincode pricing. */}
        {pincodeOk !== false && outOfRange ? (
          <Card style={{ backgroundColor: '#fef2f2', marginTop: spacing.sm }} elevated={false}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Icon name="alert-circle" size={16} color={colors.error} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text variant="bodyBold" color={colors.error}>
                  Out of delivery range
                </Text>
                <Text variant="caption" color={colors.error} weight="600" style={{ marginTop: 2 }}>
                  This address is too far from our warehouse. Pick a closer
                  saved address, or add a new one within delivery range.
                </Text>
              </View>
            </View>
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
                ? freeDelivery || subtotal >= SHIPPING_CONFIG.freeAboveCartAmount
                  ? 'FREE'
                  : formatINR(0)
                : formatINR(effectiveShipping)
            }
            // When the backend returned distance info, show the
            // "12.4 km · HITEC City Warehouse" subtitle so the user
            // sees WHY their shipping cost is what it is.
            subtitle={
              typeof distanceKm === 'number' && centerName
                ? `${formatKm(distanceKm)} from ${centerName}`
                : undefined
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
          title={
            computingShipping
              ? 'Calculating…'
              : payMethod === 'RAZORPAY'
              ? 'Pay Now'
              : 'Place Order'
          }
          onPress={startPayment}
          size="lg"
          loading={processing}
          style={{ flex: 1.2 }}
          disabled={!addressId || pincodeOk === false || outOfRange || computingShipping}
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

const SummaryRow: React.FC<{
  label: string;
  value: string;
  bold?: boolean;
  /** Faint sub-line under the label — e.g. "12.4 km from Warehouse". */
  subtitle?: string;
}> = ({ label, value, bold, subtitle }) => (
  <View style={[styles.summaryLine, { alignItems: subtitle ? 'flex-start' : 'center' }]}>
    <View style={{ flex: 1 }}>
      <Text variant={bold ? 'bodyBold' : 'body'} color={colors.textSecondary}>
        {label}
      </Text>
      {subtitle ? (
        <Text variant="caption" weight="600" color={colors.textTertiary} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
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
