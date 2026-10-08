import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from './common';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { titleCaseCategory } from '../utils/categoryIcon';
import { categoryIdOf } from '../utils/categoryTree';
import type { Category } from '../types';

/**
 * "All · Regular Rices · Natural Rice" chip row shown inside a parent
 * category — the mobile equivalent of the website's expandable
 * sub-category rows. `selectedId === null` means "All" (the parent
 * itself, which the backend answers with the union of its children).
 * Renders nothing when the parent has no children.
 */
interface Props {
  children: Category[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export const SubcategoryChips: React.FC<Props> = ({
  children,
  selectedId,
  onSelect,
}) => {
  if (children.length === 0) return null;
  const chip = (label: string, id: number | null) => {
    const on = selectedId === id;
    return (
      <Pressable
        key={id === null ? 'all' : String(id)}
        onPress={() => onSelect(id)}
        style={[styles.chip, on && styles.chipOn]}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
      >
        <Text
          variant="caption"
          weight="800"
          color={on ? colors.white : colors.textSecondary}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  };
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroller}
    >
      {chip('All', null)}
      {children.map(c => chip(titleCaseCategory(c.name), categoryIdOf(c)))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroller: { flexGrow: 0, marginTop: spacing.sm },
  row: { gap: 6, paddingRight: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.tintStrong,
    backgroundColor: colors.tintSoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
