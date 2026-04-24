import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Text } from './Text';

interface Props {
  message?: string;
}

export const LoadingScreen: React.FC<Props> = ({ message }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={colors.primary} />
    {message ? (
      <Text
        variant="bodySmall"
        color={colors.textSecondary}
        style={{ marginTop: spacing.base }}
      >
        {message}
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
