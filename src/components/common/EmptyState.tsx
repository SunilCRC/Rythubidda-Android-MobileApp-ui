import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Button } from './Button';
import { Text } from './Text';

interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<Props> = ({
  icon = 'inbox',
  title,
  subtitle,
  actionLabel,
  onAction,
}) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <Icon name={icon} size={40} color={colors.primary} />
    </View>
    <Text variant="h5" color={colors.textPrimary} align="center">
      {title}
    </Text>
    {subtitle ? (
      <Text
        variant="bodySmall"
        color={colors.textSecondary}
        align="center"
        style={styles.subtitle}
      >
        {subtitle}
      </Text>
    ) : null}
    {actionLabel && onAction ? (
      <Button
        title={actionLabel}
        onPress={onAction}
        variant="primary"
        style={{ marginTop: spacing.lg }}
      />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.palette.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  subtitle: { marginTop: spacing.xs, maxWidth: 280 },
});
