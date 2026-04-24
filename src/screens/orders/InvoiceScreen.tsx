import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Share from 'react-native-share';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
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
import { spacing } from '../../theme/spacing';
import { formatDate, formatINR } from '../../utils/format';
import { showToast } from '../../utils/toast';
import type { OrdersStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'Invoice'>;

export const InvoiceScreen: React.FC<Props> = ({ route }) => {
  const { orderId } = route.params;
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', orderId],
    queryFn: () => orderService.invoice(orderId),
  });

  if (isLoading || !invoice) return <LoadingScreen />;

  const items = invoice.items || invoice.order?.items || [];
  const ship = invoice.shippingAddress || invoice.order?.address;

  const handleShare = async () => {
    try {
      const text = renderInvoiceText(invoice);
      await Share.open({
        title: `Invoice ${invoice.invoiceNumber ?? orderId}`,
        message: text,
        subject: `Rythu Bidda Invoice`,
        failOnCancel: false,
      });
    } catch (e: any) {
      if (e?.message !== 'User did not share') {
        showToast.error('Could not share');
      }
    }
  };

  return (
    <Container edges={['top']}>
      <ScreenHeader title="Invoice" />
      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing['3xl'] }}>
        <Card>
          <Text variant="h4" align="center" color={colors.primaryDark}>
            RYTHU BIDDA
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary} align="center">
            Farm-fresh products, delivered.
          </Text>
          <Divider />
          <Text variant="h6">Invoice #{invoice.invoiceNumber ?? orderId}</Text>
          <Text variant="caption" color={colors.textTertiary}>
            Date: {formatDate(invoice.invoiceDate || invoice.order?.createdAt)}
          </Text>

          {invoice.customer ? (
            <View style={{ marginTop: spacing.base }}>
              <Text variant="label" color={colors.textSecondary}>
                Billed to
              </Text>
              <Text variant="bodyBold">
                {invoice.customer.firstname || invoice.customer.firstName}{' '}
                {invoice.customer.lastname || invoice.customer.lastName}
              </Text>
              {invoice.customer.phone ? (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {invoice.customer.phone}
                </Text>
              ) : null}
              {invoice.customer.email ? (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {invoice.customer.email}
                </Text>
              ) : null}
            </View>
          ) : null}

          {ship ? (
            <View style={{ marginTop: spacing.base }}>
              <Text variant="label" color={colors.textSecondary}>
                Shipped to
              </Text>
              <Text variant="bodySmall">
                {ship.address1}
                {ship.address2 ? `, ${ship.address2}` : ''}
              </Text>
              <Text variant="bodySmall">
                {ship.city}, {ship.state} - {ship.postcode}
              </Text>
            </View>
          ) : null}

          <Divider />
          <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
            Items
          </Text>
          {items.map((it, i) => (
            <View key={`inv-${i}`} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall">{it.productName || it.name}</Text>
                <Text variant="caption" color={colors.textTertiary}>
                  {it.qtyOptionLabel ? `${it.qtyOptionLabel} · ` : ''}
                  Qty {it.qty} × {formatINR(it.price)}
                </Text>
              </View>
              <Text variant="bodyBold">{formatINR(it.subtotal ?? it.price * it.qty)}</Text>
            </View>
          ))}

          <Divider />
          <Row label="Subtotal" value={formatINR(invoice.subtotal ?? invoice.order?.subtotal)} />
          <Row
            label="Shipping"
            value={formatINR(invoice.shippingCost ?? invoice.order?.shippingCost)}
          />
          {(invoice.tax ?? invoice.order?.tax) ? (
            <Row label="Tax" value={formatINR(invoice.tax ?? invoice.order?.tax)} />
          ) : null}
          <Divider spacing_={spacing.xs} />
          <Row
            label="Total"
            value={formatINR(invoice.total ?? invoice.order?.orderTotal)}
            bold
          />
          {invoice.paymentMethod ? (
            <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.xs }}>
              Payment: {invoice.paymentMethod}
            </Text>
          ) : null}
        </Card>

        <Button
          title="Share Invoice"
          onPress={handleShare}
          variant="primary"
          fullWidth
          size="lg"
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </Container>
  );
};

function renderInvoiceText(inv: any): string {
  const lines: string[] = [];
  lines.push('RYTHU BIDDA — Invoice');
  lines.push('—'.repeat(20));
  lines.push(`Invoice #${inv.invoiceNumber ?? inv.order?.entityId ?? ''}`);
  lines.push(`Date: ${formatDate(inv.invoiceDate || inv.order?.createdAt)}`);
  lines.push('');
  const items = inv.items || inv.order?.items || [];
  items.forEach((it: any) => {
    lines.push(`• ${it.productName || it.name} × ${it.qty} = ${formatINR(it.subtotal ?? it.price * it.qty)}`);
  });
  lines.push('');
  lines.push(`Subtotal: ${formatINR(inv.subtotal ?? inv.order?.subtotal)}`);
  lines.push(`Shipping: ${formatINR(inv.shippingCost ?? inv.order?.shippingCost)}`);
  lines.push(`Total:    ${formatINR(inv.total ?? inv.order?.orderTotal)}`);
  lines.push('');
  lines.push('Thank you for shopping with Rythu Bidda!');
  return lines.join('\n');
}

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
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
});
