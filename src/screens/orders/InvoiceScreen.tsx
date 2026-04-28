import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Share from 'react-native-share';
import Icon from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import { orderService } from '../../api/services';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { formatDate, formatINR } from '../../utils/format';
import { showToast } from '../../utils/toast';
import { generateInvoicePdf } from '../../utils/invoicePdf';
import type { OrdersStackParamList } from '../../navigation/types';
import type { SaleOrderItem } from '../../types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'Invoice'>;

export const InvoiceScreen: React.FC<Props> = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [downloading, setDownloading] = useState(false);

  const {
    data: invoice,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['invoice', orderId],
    queryFn: () => orderService.invoice(orderId),
    retry: false,
  });

  // The invoice endpoint ships order metadata only — we still need to load
  // line items separately from `viewSaleItems` (the DB-backed list of items
  // for the order). Both calls run in parallel.
  const { data: fetchedItems } = useQuery({
    queryKey: ['orderItems', orderId],
    queryFn: () => orderService.saleItems(orderId),
    enabled: !!orderId,
    retry: false,
  });

  // ─────────────────────────────────────────────
  // Resolve every field through a fallback chain.
  // Backend response (post envelope-unwrap):
  //   { order: SaleOrder, invoiceNumber, orderId, orderDate, status }
  // The `order` SaleOrder carries totals, addresses, customer info, items.
  // ─────────────────────────────────────────────
  const order = invoice?.order;
  const items = useMemo<SaleOrderItem[]>(() => {
    if (Array.isArray(fetchedItems) && fetchedItems.length > 0) return fetchedItems;
    if (Array.isArray(invoice?.items) && invoice!.items!.length > 0) return invoice!.items!;
    if (Array.isArray(order?.saleItems) && order!.saleItems!.length > 0) return order!.saleItems!;
    if (Array.isArray(order?.items) && order!.items!.length > 0) return order!.items!;
    return [];
  }, [fetchedItems, invoice, order]);

  const ship = invoice?.shippingAddress ?? order?.shippingAddress ?? order?.address;
  const customerName =
    invoice?.customer?.firstname ??
    invoice?.customer?.firstName ??
    order?.customerFirstName ??
    '';
  const customerLast =
    invoice?.customer?.lastname ??
    invoice?.customer?.lastName ??
    order?.customerLastName ??
    '';
  const customerPhone = invoice?.customer?.phone ?? order?.customerPhone;
  const customerEmail = invoice?.customer?.email ?? order?.customerEmail;

  const subtotal = invoice?.subtotal ?? order?.subTotal ?? order?.subtotal;
  const shipping = invoice?.shippingCost ?? order?.shippingAmount ?? order?.shippingCost;
  const tax = invoice?.tax ?? order?.tax;
  const total = invoice?.total ?? order?.grandTotal ?? order?.orderTotal;
  const dspSubTotal = order?.dspSubTotal;
  const dspShipping = order?.dspShippingAmount;
  const dspTotal = order?.dspGrandTotal;

  const invoiceNumber =
    invoice?.invoiceNumber ?? order?.incrementId ?? order?.entityId ?? orderId;
  const invoiceDate =
    invoice?.invoiceDate ?? invoice?.orderDate ?? order?.createdAt;
  const paymentMethod = invoice?.paymentMethod ?? order?.paymentMethod;

  if (isLoading) return <LoadingScreen />;

  // The backend returns 404 for any order whose status isn't DELIVERED.
  // Surface a clear, actionable message instead of an infinite loader.
  if (isError || !invoice) {
    const status = (error as any)?.status;
    const isNotDelivered = status === 404;
    return (
      <Container edges={['top']}>
        <ScreenHeader title="Invoice" />
        <EmptyState
          icon={isNotDelivered ? 'clock' : 'alert-circle'}
          title={
            isNotDelivered
              ? 'Invoice not available yet'
              : 'Could not load invoice'
          }
          subtitle={
            isNotDelivered
              ? 'Invoices are generated once your order is delivered. Check back after delivery.'
              : (error as any)?.message ??
                'Something went wrong. Please try again in a moment.'
          }
          actionLabel="Back to Order"
          onAction={() => navigation.goBack()}
        />
      </Container>
    );
  }

  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const result = await generateInvoicePdf({
        invoiceNumber,
        invoiceDate,
        order,
        items,
      });
      if (!result) {
        showToast.error(
          'PDF support not installed',
          "Run 'npm install' and rebuild the app to enable invoice downloads.",
        );
        return;
      }

      const url =
        Platform.OS === 'android' && !result.filePath.startsWith('file://')
          ? `file://${result.filePath}`
          : result.filePath;

      // ─────────────────────────────────────────────────────────────────
      // On Android we republish the PDF into the public `Downloads` folder
      // via MediaStore (see invoicePdf.ts). When that succeeds the file is
      // directly visible in the user's Files app — exactly what they were
      // expecting. We confirm with a clear toast and then offer the share
      // sheet for users who want to forward the file by Email/WhatsApp/etc.
      // ─────────────────────────────────────────────────────────────────
      const savedToDownloads = !!result.publicPath;
      if (savedToDownloads) {
        showToast.success(
          'Saved to Downloads',
          `${result.fileName} is in your Downloads folder.`,
        );
      } else {
        showToast.success(
          'Invoice PDF ready',
          Platform.OS === 'android'
            ? 'Tap "Save to Files → Downloads" in the share sheet to keep a copy.'
            : 'Tap "Save to Files" in the share sheet to keep a copy.',
        );
      }

      try {
        await Share.open({
          title: `Invoice ${invoiceNumber}`,
          subject: `Rythu Bidda Invoice ${invoiceNumber}`,
          url,
          type: 'application/pdf',
          filename: result.fileName,
          failOnCancel: false,
        });
      } catch (shareErr: any) {
        // User backed out of the share sheet — that's fine, the file is
        // still on disk (and on Android, also in Downloads if MediaStore
        // succeeded). Only surface a toast for genuine errors.
        if (
          !savedToDownloads &&
          shareErr?.message &&
          shareErr.message !== 'User did not share'
        ) {
          showToast.info('PDF saved on device', result.filePath);
        }
      }
    } catch (err: any) {
      showToast.error('Could not generate PDF', err?.message ?? 'Please try again');
    } finally {
      setDownloading(false);
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
          <Text variant="h6">Invoice #{invoiceNumber}</Text>
          <Text variant="caption" color={colors.textTertiary}>
            Date: {formatDate(invoiceDate)}
          </Text>

          {(customerName || customerLast || customerPhone || customerEmail) ? (
            <View style={{ marginTop: spacing.base }}>
              <Text variant="label" color={colors.textSecondary}>
                Billed to
              </Text>
              <Text variant="bodyBold">
                {customerName} {customerLast}
              </Text>
              {customerPhone ? (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {customerPhone}
                </Text>
              ) : null}
              {customerEmail ? (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {customerEmail}
                </Text>
              ) : null}
            </View>
          ) : null}

          {ship ? (
            <View style={{ marginTop: spacing.base }}>
              <Text variant="label" color={colors.textSecondary}>
                Shipped to
              </Text>
              {ship.firstname || ship.lastname ? (
                <Text variant="bodyBold">
                  {ship.firstname} {ship.lastname}
                </Text>
              ) : null}
              <Text variant="bodySmall">
                {ship.address1}
                {ship.address2 ? `, ${ship.address2}` : ''}
              </Text>
              <Text variant="bodySmall">
                {ship.city}, {ship.state} - {ship.postcode}
              </Text>
              {ship.telephone ? (
                <Text variant="caption" color={colors.textTertiary}>
                  {ship.telephone}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Divider />
          <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
            Items ({items.length})
          </Text>
          {items.length === 0 ? (
            <Text variant="bodySmall" color={colors.textSecondary}>
              No items recorded for this invoice.
            </Text>
          ) : (
            items.map((it, i) => (
              <View key={`inv-${i}`} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall">{it.productName || it.name}</Text>
                  <Text variant="caption" color={colors.textTertiary}>
                    {it.qtyOptionLabel ? `${it.qtyOptionLabel} · ` : ''}
                    Qty {it.qty} × {formatINR(it.price)}
                  </Text>
                </View>
                <Text variant="bodyBold">
                  {formatINR(it.subtotal ?? it.price * it.qty)}
                </Text>
              </View>
            ))
          )}

          <Divider />
          <Row
            label="Subtotal"
            value={
              subtotal != null
                ? formatINR(subtotal)
                : dspSubTotal
                ? `₹${dspSubTotal}`
                : formatINR(0)
            }
          />
          <Row
            label="Shipping"
            value={
              shipping != null
                ? formatINR(shipping)
                : dspShipping
                ? `₹${dspShipping}`
                : formatINR(0)
            }
          />
          {tax ? <Row label="Tax" value={formatINR(tax)} /> : null}
          <Divider spacing_={spacing.xs} />
          <Row
            label="Total"
            value={
              total != null && Number.isFinite(total)
                ? formatINR(total)
                : dspTotal
                ? `₹${dspTotal}`
                : formatINR(0)
            }
            bold
          />
          {paymentMethod ? (
            <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.xs }}>
              Payment: {paymentMethod}
            </Text>
          ) : null}
        </Card>

        <Button
          title={downloading ? 'Generating PDF…' : 'Download PDF'}
          onPress={handleDownloadPdf}
          loading={downloading}
          variant="primary"
          fullWidth
          size="lg"
          leftIcon={<Icon name="download" size={16} color={colors.white} />}
          style={{ marginTop: spacing.xl }}
        />
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
