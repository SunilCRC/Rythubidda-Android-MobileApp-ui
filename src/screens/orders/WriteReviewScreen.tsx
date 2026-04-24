import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import FastImage from 'react-native-fast-image';
import {
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
import type { OrdersStackParamList } from '../../navigation/types';
import type { SaleOrderItem } from '../../types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'WriteReview'>;

interface DraftReview {
  rating: number;
  title: string;
  message: string;
}

export const WriteReviewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [items, setItems] = useState<SaleOrderItem[] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, DraftReview>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    orderService
      .reviewableItems(orderId)
      .then(list => {
        setItems(list);
        const initial: Record<number, DraftReview> = {};
        list.forEach(it => {
          const key = it.productId ?? it.id;
          if (key != null) initial[key] = { rating: 0, title: '', message: '' };
        });
        setDrafts(initial);
      })
      .catch(() => setItems([]));
  }, [orderId]);

  const update = (key: number, patch: Partial<DraftReview>) => {
    setDrafts(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleSubmit = async () => {
    const payload = Object.entries(drafts)
      .filter(([_, d]) => d.rating > 0 && d.message.trim())
      .map(([productId, d]) => ({
        productId: Number(productId),
        orderId: Number(orderId),
        rating: d.rating,
        title: d.title,
        message: d.message,
      }));
    if (payload.length === 0) {
      showToast.error('Please rate and review at least one item');
      return;
    }
    setSubmitting(true);
    try {
      await orderService.submitReviews(payload);
      showToast.success('Thanks for your review!');
      navigation.goBack();
    } catch (e: any) {
      showToast.error('Could not submit reviews', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (items === null) return <LoadingScreen />;

  if (items.length === 0) {
    return (
      <Container edges={['top']}>
        <ScreenHeader title="Write a review" />
        <View style={{ padding: spacing.xl }}>
          <Text variant="body" color={colors.textSecondary} align="center">
            No items available to review.
          </Text>
        </View>
      </Container>
    );
  }

  return (
    <Container edges={['top']}>
      <ScreenHeader title="Write a review" />
      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: 120 }}>
        {items.map(it => {
          const key = (it.productId ?? it.id)!;
          const draft = drafts[key] || { rating: 0, title: '', message: '' };
          return (
            <Card key={`rv-${key}`} style={{ marginBottom: spacing.base }}>
              <View style={styles.itemRow}>
                <FastImage
                  source={{ uri: pickFirstImage(it.image) }}
                  style={styles.image}
                  resizeMode={FastImage.resizeMode.cover}
                />
                <View style={{ flex: 1, paddingHorizontal: spacing.sm }}>
                  <Text variant="bodyBold" numberOfLines={2}>
                    {it.productName || it.name}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary}>
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
        <Button
          title="Submit Reviews"
          onPress={handleSubmit}
          loading={submitting}
          fullWidth
          size="lg"
        />
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
});
