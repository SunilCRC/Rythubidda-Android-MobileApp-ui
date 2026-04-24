import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { Text } from '../common/Text';

interface Props {
  title: string;
  subtitle?: string | React.ReactNode;
  icon?: string;          // Feather icon name, renders inside a tinted well
  showBack?: boolean;
  onBack?: () => void;
  illustration?: React.ReactNode; // optional custom artwork (overrides icon)
  align?: 'left' | 'center';
}

/**
 * Shared header block for auth screens. Renders an optional back button,
 * an optional circular icon well with a warm tinted bg, a bold title,
 * and a semibold subtitle. Used by Login, Register, OTP, Forgot &
 * Reset password screens to keep tone consistent.
 */
export const AuthHeader: React.FC<Props> = ({
  title,
  subtitle,
  icon,
  showBack = false,
  onBack,
  illustration,
  align = 'left',
}) => {
  const nav = useNavigation<any>();
  const handleBack = () => {
    if (onBack) onBack();
    else if (nav.canGoBack()) nav.goBack();
  };

  const centered = align === 'center';
  return (
    <View style={styles.wrap}>
      {showBack ? (
        <Pressable
          onPress={handleBack}
          hitSlop={10}
          android_ripple={{ color: colors.pressed, borderless: true, radius: 24 }}
          style={styles.back}
        >
          <Icon name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
      ) : null}

      {illustration ? (
        <View style={[styles.artWrap, centered && { alignSelf: 'center' }]}>
          {illustration}
        </View>
      ) : icon ? (
        <View style={[styles.iconWell, centered && { alignSelf: 'center' }]}>
          <Icon name={icon} size={32} color={colors.primary} />
        </View>
      ) : null}

      <Text
        variant="h3"
        weight="800"
        color={colors.textPrimary}
        align={centered ? 'center' : undefined}
        style={styles.title}
      >
        {title}
      </Text>
      {typeof subtitle === 'string' ? (
        <Text
          variant="bodySmall"
          weight="600"
          color={colors.textSecondary}
          align={centered ? 'center' : undefined}
          style={styles.subtitle}
        >
          {subtitle}
        </Text>
      ) : subtitle ? (
        <View style={styles.subtitle}>{subtitle}</View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  iconWell: {
    width: 84,
    height: 84,
    borderRadius: radius.full,
    backgroundColor: colors.tintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  artWrap: {
    marginBottom: spacing.base,
  },
  title: { letterSpacing: -0.3 },
  subtitle: { marginTop: 4 },
});
