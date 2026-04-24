import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  spacing_?: number;
  style?: ViewStyle;
}

export const Divider: React.FC<Props> = ({ spacing_ = spacing.base, style }) => (
  <View style={[styles.line, { marginVertical: spacing_ }, style]} />
);

const styles = StyleSheet.create({
  line: { height: 1, backgroundColor: colors.divider },
});
