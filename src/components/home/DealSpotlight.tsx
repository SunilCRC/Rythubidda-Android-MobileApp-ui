import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Feather';
import { Text } from '../common';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { TodaysDeal } from '../../types';

/**
 * "DEAL OF THE DAY" spotlight (approved v3 board) — the flash-sale
 * card treatment: label chip, product, price + limit, live countdown
 * chips, one arrow action. Tapping opens the product quick-sheet with
 * the deal's variants pre-loaded; server still enforces pricing,
 * quantity caps and one-per-customer.
 */
interface Props {
  deal: TodaysDeal;
  onPress: (deal: TodaysDeal) => void;
}

export const DealSpotlight: React.FC<Props> = ({ deal, onPress }) => {
  const endMs = useMemo(
    () => Date.now() + (deal.remainingSeconds || 0) * 1000,
    [deal],
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, Math.floor((endMs - now) / 1000));
  if (remaining <= 0) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  const hh = pad(Math.floor(remaining / 3600));
  const mm = pad(Math.floor((remaining % 3600) / 60));
  const ss = pad(remaining % 60);

  const price = deal.variants && deal.variants.length > 0 ? deal.variants[0].price : deal.dealPrice;
  const unit = deal.variants && deal.variants.length > 0 ? deal.variants[0].label : deal.variantLabel;

  return (
    <Pressable
      onPress={() => onPress(deal)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}
      accessibilityRole="button"
      accessibilityLabel={`Deal of the day: ${deal.productName}`}
    >
      {deal.productImage ? (
        <FastImage source={{ uri: deal.productImage }} style={styles.img} resizeMode={FastImage.resizeMode.cover} />
      ) : (
        <View style={[styles.img, styles.imgFallback]}>
          <Icon name="zap" size={26} color={colors.primary} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.lbl}>
          <Icon name="zap" size={9} color="#B3541E" />
          <Text variant="caption" weight="800" color="#B3541E" style={styles.lblTxt}>
            DEAL OF THE DAY
          </Text>
        </View>
        <Text variant="bodySmall" weight="800" color={colors.textPrimary} numberOfLines={1} style={{ marginTop: 4 }}>
          {deal.productName}
        </Text>
        <Text variant="bodySmall" weight="800" color={colors.primaryDark} style={{ marginTop: 1 }}>
          ₹{price}
          <Text variant="caption" weight="600" color={colors.textMuted}>
            {unit ? `  · ${unit}` : ''}{deal.maxQtyPerCustomer > 0 ? ` · limit ${deal.maxQtyPerCustomer}` : ''}
          </Text>
        </Text>
        <View style={styles.timerRow}>
          <Text variant="caption" weight="700" color={colors.textMuted} style={{ fontSize: 9 }}>
            Ends in{' '}
          </Text>
          {[hh, mm, ss].map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 ? (
                <Text variant="caption" weight="800" color={colors.textPrimary}>:</Text>
              ) : null}
              <View style={styles.timerCell}>
                <Text variant="caption" weight="800" color={colors.white} style={{ fontSize: 10 }}>
                  {part}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>
      <View style={styles.go}>
        <Icon name="arrow-right" size={17} color={colors.white} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    backgroundColor: '#FFF7EA',
    borderWidth: 1,
    borderColor: '#EFD9B4',
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  img: {
    width: 72,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  imgFallback: { alignItems: 'center', justifyContent: 'center' },
  lbl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: '#FDE4CB',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lblTxt: { fontSize: 8, letterSpacing: 0.8 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 5 },
  timerCell: {
    backgroundColor: colors.textPrimary,
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  go: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
