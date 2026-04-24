import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Text } from './Text';

interface Props {
  rating: number;
  size?: number;
  max?: number;
  onChange?: (rating: number) => void;
  showLabel?: boolean;
  labelColor?: string;
}

export const StarRating: React.FC<Props> = ({
  rating,
  size = 16,
  max = 5,
  onChange,
  showLabel,
  labelColor,
}) => {
  const readOnly = !onChange;
  return (
    <View style={styles.container}>
      {Array.from({ length: max }).map((_, i) => {
        const idx = i + 1;
        const isFilled = idx <= Math.round(rating);
        const isHalf = !isFilled && idx - 0.5 <= rating;
        const iconName = isFilled
          ? 'star'
          : isHalf
          ? 'star-half-full'
          : 'star-outline';
        const star = (
          <Icon
            name={iconName}
            size={size}
            color={isFilled || isHalf ? '#f59e0b' : colors.palette.neutral[300]}
          />
        );
        return readOnly ? (
          <View key={idx} style={styles.star}>
            {star}
          </View>
        ) : (
          <Pressable
            key={idx}
            onPress={() => onChange(idx)}
            hitSlop={6}
            style={styles.star}
          >
            {star}
          </Pressable>
        );
      })}
      {showLabel ? (
        <Text
          variant="bodySmall"
          color={labelColor || colors.textSecondary}
          style={styles.label}
        >
          {rating.toFixed(1)}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  star: { paddingHorizontal: 1 },
  label: { marginLeft: spacing.xs },
});
