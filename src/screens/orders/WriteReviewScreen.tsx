import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Feather';
import {
  Badge,
  Button,
  Card,
  Input,
  LoadingScreen,
  StarRating,
  Text,
} from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { orderService } from '../../api/services';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { pickFirstImage } from '../../utils/image';
import { showToast } from '../../utils/toast';
import { haptics } from '../../utils/haptics';
import type { OrdersStackParamList } from '../../navigation/types';
import type { ReviewItem, SaleOrderItem } from '../../types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'WriteReview'>;

interface DraftReview {
  rating: number;
  title: string;
  message: string;
}

/**
 * Whether a sale-item already has a customer review attached.
 * Backend's `viewSubmitReviews` endpoint attaches `productReview` (or
 * leaves it null) per line — mirrors the web's `item.productReview`
 * check used by `Rythubidda-UI/src/pages/Orders.tsx`.
 */
function hasReview(item: SaleOrderItem): boolean {
  const r = item.productReview;
  return !!r && typeof r.rating === 'number' && r.rating > 0;
}

export const WriteReviewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { orderId } = route.params;

  const [items, setItems] = useState<SaleOrderItem[] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, DraftReview>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadItems = async () => {
    try {
      // The backend `viewSubmitReviews` endpoint returns ONE entry per
      // unique product on the order, with the existing customer review
      // (if any) attached as `productReview`. We use that field as the
      // single source of truth — items with a populated `productReview`
      // are read-only "Submitted" cards; items with `null` show the
      // editable rating + title + message form.
      const list = await orderService.reviewableItems(orderId);
      setItems(list ?? []);

      // Seed drafts only for items still pending review (preserve any
      // text the user typed on a previous session if it's still pending).
      setDrafts(prev => {
        const next: Record<number, DraftReview> = { ...prev };
        (list ?? []).forEach(it => {
          if (hasReview(it)) return;
          const key = it.id;
          if (key != null && !next[key]) {
            next[key] = { rating: 0, title: '', message: '' };
          }
        });
        return next;
      });
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const update = (key: number, patch: Partial<DraftReview>) => {
    setDrafts(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? { rating: 0, title: '', message: '' }), ...patch },
    }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (items == null) return;

    // Build the backend-shaped payload only for pending items.
    const payload: ReviewItem[] = [];
    for (const it of items) {
      if (hasReview(it)) continue;
      const key = it.id;
      if (key == null) continue;
      const draft = drafts[key];
      if (!draft || draft.rating <= 0 || !draft.message.trim()) continue;
      const review: ReviewItem = {
        saleOrderItemId: key,
        rating: String(draft.rating),
        message: draft.message.trim(),
      };
      const headline = draft.title.trim();
      if (headline) review.headline = headline;
      payload.push(review);
    }

    if (payload.length === 0) {
      showToast.error(
        'Please rate and write a review',
        'Tap the stars and add a short message for at least one item.',
      );
      return;
    }

    setSubmitting(true);
    try {
      await orderService.submitReviews(Number(orderId), payload);
      haptics.success();
      showToast.success('Thanks for your review!');

      // Clear the just-submitted drafts and refetch — the backend will
      // now return those items with `productReview` populated, which the
      // render path treats as a submitted (read-only) card.
      setDrafts(prev => {
        const next = { ...prev };
        payload.forEach(r => delete next[r.saleOrderItemId]);
        return next;
      });
      await loadItems();
    } catch (e: any) {
      haptics.error();
      showToast.error(
        'Could not submit reviews',
        e?.message ?? 'Please try again in a moment.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Split the list into already-reviewed (read-only) and pending (editable).
  const submittedItems = useMemo(
    () => (items ?? []).filter(hasReview),
    [items],
  );
  const pendingItems = useMemo(
    () => (items ?? []).filter(it => !hasReview(it)),
    [items],
  );

  if (items === null) return <LoadingScreen />;

  // No line items at all — defensive empty state.
  if (items.length === 0) {
    return (
      <Container edges={['top']}>
        <ScreenHeader title="Reviews" />
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="message-square" size={36} color={colors.primary} />
          </View>
          <Text variant="h5" align="center" weight="700">
            Nothing to review
          </Text>
          <Text
            variant="bodySmall"
            color={colors.textSecondary}
            align="center"
            weight="600"
            style={{ marginTop: 4 }}
          >
            This order doesn't have any items eligible for review yet.
          </Text>
          <Button
            title="Back to Order"
            onPress={() => navigation.goBack()}
            variant="primary"
            fullWidth
            size="lg"
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </Container>
    );
  }

  // Everything has been reviewed → view-only mode.
  const allDone = pendingItems.length === 0 && submittedItems.length > 0;
  const headerTitle = allDone
    ? 'Your Reviews'
    : submittedItems.length > 0
    ? 'Your Reviews'
    : 'Write a Review';

  return (
    <Container edges={['top']}>
      <ScreenHeader title={headerTitle} />
      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: 120 }}>
        {allDone ? (
          <View style={styles.successBanner}>
            <View style={styles.successIcon}>
              <Icon name="check-circle" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text variant="bodyBold" color={colors.textPrimary} weight="700">
                {submittedItems.length === 1
                  ? 'You reviewed this item'
                  : 'You reviewed these items'}
              </Text>
              <Text
                variant="caption"
                color={colors.textSecondary}
                weight="600"
                style={{ marginTop: 2 }}
              >
                Thanks for your feedback — it helps other shoppers and our farmers.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Submitted reviews — read-only confirmation cards (data comes
            directly from `item.productReview` populated by the backend) */}
        {submittedItems.map(it => {
          const review = it.productReview!;
          return (
            <Card
              key={`done-${it.id}`}
              style={[styles.cardSpacing, styles.submittedCard]}
            >
              <View style={styles.itemRow}>
                <FastImage
                  source={{ uri: pickFirstImage(it.image) }}
                  style={styles.image}
                  resizeMode={FastImage.resizeMode.cover}
                />
                <View style={{ flex: 1, paddingHorizontal: spacing.sm }}>
                  <Text variant="bodyBold" weight="700" numberOfLines={2}>
                    {it.productName || it.name}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary} weight="600">
                    Qty {it.qty}
                  </Text>
                </View>
                <Badge label="Submitted" variant="success" />
              </View>
              <View style={styles.submittedBody}>
                <StarRating rating={review.rating ?? 0} size={18} />
                {review.title ? (
                  <Text
                    variant="bodyBold"
                    weight="700"
                    color={colors.textPrimary}
                    style={{ marginTop: spacing.sm }}
                  >
                    {review.title}
                  </Text>
                ) : null}
                {review.review || review.comment || review.message ? (
                  <Text
                    variant="body"
                    weight="500"
                    color={colors.textSecondary}
                    style={{ marginTop: 4 }}
                  >
                    {review.review || review.comment || review.message}
                  </Text>
                ) : null}
              </View>
            </Card>
          );
        })}

        {/* Editable forms for items still needing a review */}
        {pendingItems.map(it => {
          const key = it.id!;
          const draft = drafts[key] || { rating: 0, title: '', message: '' };
          return (
            <Card key={`rv-${key}`} style={styles.cardSpacing}>
              <View style={styles.itemRow}>
                <FastImage
                  source={{ uri: pickFirstImage(it.image) }}
                  style={styles.image}
                  resizeMode={FastImage.resizeMode.cover}
                />
                <View style={{ flex: 1, paddingHorizontal: spacing.sm }}>
                  <Text variant="bodyBold" weight="700" numberOfLines={2}>
                    {it.productName || it.name}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary} weight="600">
                    Qty {it.qty}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'center', marginVertical: spacing.sm }}>
                <StarRating
                  rating={draft.rating}
                  size={28}
                  onChange={r => update(key, { rating: r })}
                />
              </View>
              <Input
                label="Title (optional)"
                placeholder="Summarize your review"
                value={draft.title}
                onChangeText={t => update(key, { title: t })}
              />
              <Input
                label="Your review"
                placeholder="What did you like or not like?"
                multiline
                numberOfLines={4}
                value={draft.message}
                onChangeText={t => update(key, { message: t })}
                style={{ minHeight: 96 }}
              />
            </Card>
          );
        })}

        {pendingItems.length > 0 ? (
          <Button
            title={`Submit ${pendingItems.length === 1 ? 'Review' : 'Reviews'}`}
            onPress={handleSubmit}
            loading={submitting}
            fullWidth
            size="lg"
          />
        ) : (
          <Button
            title="Done"
            onPress={() => navigation.goBack()}
            variant="primary"
            fullWidth
            size="lg"
          />
        )}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  image: {
    width: 56,
    height: 56,
    borderRadius: radius.base,
    backgroundColor: colors.palette.secondary[100],
  },
  cardSpacing: { marginBottom: spacing.base },
  submittedCard: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
  },
  submittedBody: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(42, 157, 143, 0.25)',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  successIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
});
