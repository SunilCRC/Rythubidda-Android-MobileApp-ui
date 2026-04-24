import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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

type Props = NativeStackScreenProps<OrdersStackParamList, 'OrderDetail'>;

export const OrderDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { data: order, isLoading, refetch } = useQuery({
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
  const canReview = useMemo(
    () => (order?.status || '').toUpperCase() === 'DELIVERED',
    [order?.status],
  );

  if (isLoading || !order) return <LoadingScreen />;

  const handleCancel = async () => {
    try {
      await orderService.cancel(orderId);
      showToast.success('Order cancelled');
      refetch();
    } catch (e: any) {
      showToast.error('Could not cancel', e?.message);
    }
  };

  return (
    <Container edges={['top']}>
      <ScreenHeader
        title={`Order ${formatOrderNumber(order)}`}
        right={
          <Icon
            name="file-text"
            size={22}
            color={colors.primary}
            onPress={() => navigation.navigate('Invoice', { orderId })}
          />
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
            {formatINR(order.orderTotal)}
          </Text>
        </Card>

        {/* Items */}
        <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
          Items ({items?.length || order.items?.length || 0})
        </Text>
        <Card padded={false}>
          {(items || order.items || []).map((it, i) => (
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
              {i < (items?.length ?? order.items?.length ?? 0) - 1 ? <Divider spacing_={0} /> : null}
            </View>
          ))}
        </Card>

        {/* Delivery address */}
        {order.address ? (
          <>
            <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
              Delivery to
            </Text>
            <Card>
              <Text variant="bodyBold">
                {order.address.firstname} {order.address.lastname}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {order.address.address1}
                {order.address.address2 ? `, ${order.address.address2}` : ''}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {order.address.city}, {order.address.state} - {order.address.postcode}
              </Text>
              <Text variant="caption" color={colors.textTertiary}>
                {order.address.telephone}
              </Text>
            </Card>
          </>
        ) : null}

        {/* Summary */}
        <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
          Bill Summary
        </Text>
        <Card>
          <Row label="Subtotal" value={formatINR(order.subtotal)} />
          <Row label="Shipping" value={formatINR(order.shippingCost)} />
          {order.tax ? <Row label="Tax" value={formatINR(order.tax)} /> : null}
          <Divider spacing_={spacing.sm} />
          <Row label="Total" value={formatINR(order.orderTotal)} bold />
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
          <Button
            title="View Invoice"
            onPress={() => navigation.navigate('Invoice', { orderId })}
            variant="outline"
            fullWidth
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
          {canCancel ? (
            <Button
              title="Cancel Order"
              onPress={handleCancel}
              variant="ghost"
              fullWidth
              size="lg"
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  actions: { marginTop: spacing.xl },
});
