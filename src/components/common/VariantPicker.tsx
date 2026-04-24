import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { formatINR } from '../../utils/format';
import { Text } from './Text';
import type { ProductQtyOption } from '../../types';

interface Props {
  visible: boolean;
  options: ProductQtyOption[];
  selectedId?: string | number;
  onSelect: (option: ProductQtyOption) => void;
  onClose: () => void;
  title?: string;
}

/**
 * Bottom sheet for choosing a product variant (weight/pack).
 * We use Modal's built-in slide animation — more reliable than
 * wrapping in Reanimated (which can fight with Modal mount/unmount).
 */
export const VariantPicker: React.FC<Props> = ({
  visible,
  options,
  selectedId,
  onSelect,
  onClose,
  title = 'Choose pack size',
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
    statusBarTranslucent
  >
    <View style={styles.backdrop}>
      {/* Tap-outside to close */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text variant="h5" color={colors.textPrimary} style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <ScrollView
          style={{ maxHeight: 420 }}
          contentContainerStyle={{ paddingBottom: spacing.sm }}
          showsVerticalScrollIndicator={false}
        >
          {options.map(opt => {
            const id = opt.id ?? opt.qtyOptionId;
            // Loose compare so number 965 === string "965"
            const selected =
              id != null &&
              selectedId != null &&
              String(id) === String(selectedId);
            const label = opt.name || opt.label || opt.value || '—';
            const price = opt.price ?? 0;
            const mrp = opt.mrp;
            const hasDiscount = mrp != null && mrp > price;
            return (
              <Pressable
                key={`opt-${id}`}
                onPress={() => {
                  onSelect(opt);
                  onClose();
                }}
                style={[styles.row, selected && styles.rowSelected]}
                android_ripple={{ color: colors.pressed }}
              >
                <View
                  style={[
                    styles.radio,
                    selected && { backgroundColor: colors.surface },
                  ]}
                >
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyBold" color={colors.textPrimary}>
                    {label}
                  </Text>
                  {hasDiscount ? (
                    <Text
                      variant="caption"
                      color={colors.success}
                      style={{ marginTop: 2 }}
                    >
                      Save {formatINR(mrp! - price)}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="bodyBold" color={colors.cta}>
                    {formatINR(price)}
                  </Text>
                  {hasDiscount ? (
                    <Text
                      variant="caption"
                      color={colors.textMuted}
                      style={{ textDecorationLine: 'line-through' }}
                    >
                      {formatINR(mrp)}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          android_ripple={{ color: colors.pressed }}
          hitSlop={8}
        >
          <Icon name="x" size={16} color={colors.textSecondary} />
          <Text
            variant="bodySmall"
            color={colors.textSecondary}
            style={{ marginLeft: 4 }}
          >
            Close
          </Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.backdrop,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.palette.neutral[300],
    marginBottom: spacing.base,
  },
  title: { marginBottom: spacing.base, paddingHorizontal: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.base,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  rowSelected: {
    backgroundColor: colors.palette.primary[50],
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    borderRadius: radius.base,
  },
});
