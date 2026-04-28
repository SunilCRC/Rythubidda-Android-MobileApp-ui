import React, { useMemo } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Feather';
import {
  Badge,
  Button,
  Card,
  Divider,
  LoadingScreen,
  Text,
} from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { orderService } from '../../api/services';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { formatDate, formatINR, formatOrderNumber } from '../../utils/format';
import { pickFirstImage } from '../../utils/image';
import { showToast } from '../../utils/toast';
import type { OrdersStackParamList } from '../../navigation/types';

// Customer support number used to handle cancellation requests.
// Centralised here so future updates only need to change one place.
const SUPPORT_PHONE_DISPLAY = '+91 75695 96175';
const SUPPORT_PHONE_TEL = '+917569596175';

type Props = NativeStackScreenProps<OrdersStackParamList, 'OrderDetail'>;

export const OrderDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.detail(orderId),
  });
  const { data: items } = useQuery({
    queryKey: ['orderItems', orderId],
    queryFn: () => orderService.saleItems(orderId),
    enabled: !!orderId,
  });

  const canCancel = useMemo(
    () => ['PENDING', 'PROCESSING'].includes((order?.status || '').toUpperCase()),
    [order?.status],
  );
  // The backend `/api/v1/shop/invoice/{orderId}` endpoint serves invoices
  // ONLY for orders whose status is exactly `DELIVERED` — every other state
  // returns 404. So the same gate applies to both "Write a Review" and
  // "View Invoice" actions; we surface them only after delivery.
  const canReview = useMemo(
    () => (order?.status || '').toUpperCase() === 'DELIVERED',
    [order?.status],
  );
  const canViewInvoice = canReview;

  if (isLoading || !order) return <LoadingScreen />;

  // Backend field names differ from the older mobile assumptions; resolve
  // every numeric / address field through a fallback chain so the UI works
  // regardless of which response shape the server returns. Backend uses
  // `subTotal` / `grandTotal` / `shippingAmount` / `shippingAddress`;
  // older code paths used `subtotal` / `orderTotal` / `shippingCost` / `address`.
  const subtotalValue = order.subTotal ?? order.subtotal;
  const shippingValue = order.shippingAmount ?? order.shippingCost;
  const grandTotalValue =
    order.grandTotal ??
    order.orderTotal ??
    (order.dspGrandTotal ? Number(order.dspGrandTotal) : undefined);
  const shippingAddress = order.shippingAddress ?? order.address;
  const renderedItems = items && items.length > 0 ? items : order.items ?? [];
  const itemsCount =
    renderedItems.length || order.totalItemCount || 0;

  // Cancellation now goes through customer support — surfaces a quick
  // confirmation, then dials the support number so the user can speak
  // to a human (and we avoid any half-cancelled order edge cases).
  const handleCallToCancel = () => {
    Alert.alert(
      'Call to cancel',
      `To cancel this order, please call our support team at ${SUPPORT_PHONE_DISPLAY}. We're happy to help.`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Call now',
          onPress: async () => {
            try {
              const url = `tel:${SUPPORT_PHONE_TEL}`;
              const supported = await Linking.canOpenURL(url);
              if (!supported) {
                showToast.error(
                  'Could not start call',
                  `Please dial ${SUPPORT_PHONE_DISPLAY} manually.`,
                );
                return;
              }
              await Linking.openURL(url);
            } catch (err: any) {
              showToast.error(
                'Could not start call',
                err?.message ?? `Please dial ${SUPPORT_PHONE_DISPLAY}.`,
              );
            }
          },
        },
      ],
    );
  };

  return (
    <Container edges={['top']}>
      <ScreenHeader
        title={`Order ${formatOrderNumber(order)}`}
        right={
          canViewInvoice ? (
            <Icon
              name="file-text"
              size={22}
              color={colors.primary}
              onPress={() => navigation.navigate('Invoice', { orderId })}
            />
          ) : null
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing['3xl'] }}>
        <Card>
          <View style={styles.headerRow}>
            <View>
              <Text variant="caption" color={colors.textTertiary}>
                Order placed
              </Text>
              <Text variant="bodyBold" color={colors.textPrimary}>
                {formatDate(order.createdAt)}
              </Text>
            </View>
            <Badge label={(order.status || 'PENDING').toUpperCase()} variant="primary" />
          </View>
          <Divider spacing_={spacing.sm} />
          <Text variant="caption" color={colors.textTertiary}>
            Total
          </Text>
          <Text variant="h4" color={colors.primaryDark}>
            {grandTotalValue != null && Number.isFinite(grandTotalValue)
              ? formatINR(grandTotalValue)
              : order.dspGrandTotal
              ? `₹${order.dspGrandTotal}`
              : formatINR(0)}
          </Text>
        </Card>

        {/* Items */}
        <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
          Items ({itemsCount})
        </Text>
        <Card padded={false}>
          {renderedItems.length === 0 ? (
            <View style={styles.emptyItems}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                Loading items…
              </Text>
            </View>
          ) : (
            renderedItems.map((it, i) => (
              <View key={`oi-${it.id ?? i}`}>
                <View style={styles.itemRow}>
                  <FastImage
                    source={{ uri: pickFirstImage(it.image) }}
                    style={styles.itemImage}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                  <View style={{ flex: 1, paddingHorizontal: spacing.sm }}>
                    <Text variant="bodyBold" numberOfLines={2}>
                      {it.productName || it.name}
                    </Text>
                    {it.qtyOptionLabel ? (
                      <Text variant="caption" color={colors.textSecondary}>
                        {it.qtyOptionLabel}
                      </Text>
                    ) : null}
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      Qty: {it.qty}
                    </Text>
                  </View>
                  <Text variant="bodyBold" color={colors.primaryDark}>
                    {formatINR(it.subtotal ?? it.price * it.qty)}
                  </Text>
                </View>
                {i < renderedItems.length - 1 ? <Divider spacing_={0} /> : null}
              </View>
            ))
          )}
        </Card>

        {/* Delivery address */}
        {shippingAddress ? (
          <>
            <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
              Delivery to
            </Text>
            <Card>
              <Text variant="bodyBold">
                {shippingAddress.firstname} {shippingAddress.lastname}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {shippingAddress.address1}
                {shippingAddress.address2 ? `, ${shippingAddress.address2}` : ''}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postcode}
              </Text>
              <Text variant="caption" color={colors.textTertiary}>
                {shippingAddress.telephone}
              </Text>
            </Card>
          </>
        ) : null}

        {/* Summary */}
        <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
          Bill Summary
        </Text>
        <Card>
          <Row
            label="Subtotal"
            value={
              subtotalValue != null
                ? formatINR(subtotalValue)
                : order.dspSubTotal
                ? `₹${order.dspSubTotal}`
                : formatINR(0)
            }
          />
          <Row
            label="Shipping"
            value={
              shippingValue != null
                ? formatINR(shippingValue)
                : order.dspShippingAmount
                ? `₹${order.dspShippingAmount}`
                : formatINR(0)
            }
          />
          {order.tax ? <Row label="Tax" value={formatINR(order.tax)} /> : null}
          <Divider spacing_={spacing.sm} />
          <Row
            label="Total"
            value={
              grandTotalValue != null && Number.isFinite(grandTotalValue)
                ? formatINR(grandTotalValue)
                : order.dspGrandTotal
                ? `₹${order.dspGrandTotal}`
                : formatINR(0)
            }
            bold
          />
          {order.paymentMethod ? (
            <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.xs }}>
              Paid via {order.paymentMethod}
            </Text>
          ) : null}
        </Card>

        <View style={styles.actions}>
          {canReview ? (
            <Button
              title="Write a Review"
              onPress={() => navigation.navigate('WriteReview', { orderId })}
              variant="primary"
              fullWidth
              size="lg"
            />
          ) : null}
          {canViewInvoice ? (
            <Button
              title="View Invoice"
              onPress={() => navigation.navigate('Invoice', { orderId })}
              variant="outline"
              fullWidth
              size="lg"
              style={{ marginTop: spacing.sm }}
            />
          ) : null}
          {canCancel ? (
            <View style={styles.cancelHint}>
              <View style={styles.cancelHintIcon}>
                <Icon name="phone-call" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text variant="bodyBold" color={colors.textPrimary}>
                  Need to cancel this order?
                </Text>
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={{ marginTop: 2 }}
                >
                  Call our support team to cancel — we'll take care of it for you.
                </Text>
              </View>
            </View>
          ) : null}
          {canCancel ? (
            <Button
              title={`Call to Cancel · ${SUPPORT_PHONE_DISPLAY}`}
              onPress={handleCallToCancel}
              variant="outline"
              fullWidth
              size="lg"
              leftIcon={<Icon name="phone" size={16} color={colors.primary} />}
              style={{ marginTop: spacing.sm }}
            />
          ) : null}
        </View>
      </ScrollView>
    </Container>
  );
};

const Row: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <View style={styles.summaryRow}>
    <Text variant={bold ? 'bodyBold' : 'body'} color={bold ? colors.textPrimary : colors.textSecondary}>
      {label}
    </Text>
    <Text variant={bold ? 'h6' : 'bodyBold'} color={colors.textPrimary}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: radius.base,
    backgroundColor: colors.palette.secondary[100],
  },
  emptyItems: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  cancelHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.tintSoft,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginTop: spacing.sm,
  },
  cancelHintIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  actions: { marginTop: spacing.xl },
});
