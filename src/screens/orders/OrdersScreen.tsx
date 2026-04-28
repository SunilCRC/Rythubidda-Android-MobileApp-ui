import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {
  Badge,
  Card,
  EmptyState,
  SignInPrompt,
  Skeleton,
  Text,
} from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { orderService } from '../../api/services';
import { useIsAuthenticated } from '../../store';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { formatDate, formatINR, formatOrderNumber, toArray } from '../../utils/format';
import type { SaleOrder } from '../../types';

export const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isAuth = useIsAuthenticated();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.list(),
    enabled: isAuth,
  });

  const orders = toArray<SaleOrder>(data);

  if (!isAuth) {
    return (
      <Container edges={['top']}>
        <ScreenHeader title="My Orders" showBack={false} />
        <SignInPrompt
          icon="package"
          title="Sign in to see your orders"
          subtitle="Track your past purchases, invoices and reviews. Sign in to continue."
        />
      </Container>
    );
  }

  return (
    <Container edges={['top']}>
      <ScreenHeader title="My Orders" showBack={false} />
      {isLoading ? (
        <View style={{ padding: spacing.base }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={120} style={{ marginBottom: spacing.sm, borderRadius: radius.lg }} />
          ))}
        </View>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="package"
          title="No orders yet"
          subtitle="Your placed orders will appear here."
          actionLabel="Start shopping"
          onAction={() => navigation.getParent()?.navigate('HomeTab')}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o, i) => `o-${o.entityId ?? o.orderId ?? i}`}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={refetch}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() =>
                navigation.navigate('OrderDetail', {
                  orderId: (item.entityId || item.orderId)!,
                })
              }
            />
          )}
        />
      )}
    </Container>
  );
};

const OrderCard: React.FC<{ order: SaleOrder; onPress: () => void }> = ({ order, onPress }) => {
  // Backend `/api/v1/shop/orders` returns `SaleOrder` rows with these fields,
  // not the names the mobile previously assumed:
  //   • items count → `totalItemCount` (the list endpoint doesn't include the
  //     full `items` array — that's only returned by the detail endpoint)
  //   • total      → `grandTotal` (raw double) or `dspGrandTotal` (preformatted string).
  // We fall back through every plausible alias so older / newer responses both work.
  const itemCount =
    order.totalItemCount ??
    (Array.isArray(order.items) ? order.items.length : 0) ??
    0;
  const total =
    order.grandTotal ??
    order.orderTotal ??
    (order.dspGrandTotal ? Number(order.dspGrandTotal) : undefined);

  return (
    <Card onPress={onPress}>
      <View style={styles.headerRow}>
        <Text variant="bodyBold" color={colors.textPrimary}>
          Order {formatOrderNumber(order)}
        </Text>
        <Badge
          label={(order.status || 'PENDING').toUpperCase()}
          variant={badgeVariant(order.status)}
        />
      </View>
      <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
        Placed on {formatDate(order.createdAt)}
      </Text>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Icon name="package" size={14} color={colors.textSecondary} />
          <Text variant="bodySmall" color={colors.textSecondary} style={{ marginLeft: 4 }}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <Text variant="bodyBold" color={colors.primaryDark}>
          {order.dspGrandTotal && !Number.isFinite(total)
            ? `₹${order.dspGrandTotal}`
            : formatINR(total)}
        </Text>
      </View>
    </Card>
  );
};

function badgeVariant(status?: string): 'success' | 'warning' | 'error' | 'neutral' | 'primary' {
  switch ((status || '').toUpperCase()) {
    case 'DELIVERED':
      return 'success';
    case 'SHIPPED':
    case 'PROCESSING':
      return 'primary';
    case 'CANCELLED':
      return 'error';
    case 'PENDING':
      return 'warning';
    default:
      return 'neutral';
  }
}

const styles = StyleSheet.create({
  list: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
});
