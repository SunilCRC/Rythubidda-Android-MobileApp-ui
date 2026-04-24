import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { Button } from './Button';
import { Text } from './Text';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  icon?: string;
  title: string;
  subtitle: string;
}

/**
 * Shown in place of a tab's content when the user isn't signed in.
 * Tapping "Sign in" opens the auth modal.
 */
export const SignInPrompt: React.FC<Props> = ({
  icon = 'user',
  title,
  subtitle,
}) => {
  const navigation = useNavigation<any>();
  const openLogin = () => {
    navigation.getParent()?.navigate('Auth', { screen: 'Login' }) ??
      navigation.navigate('Auth', { screen: 'Login' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={36} color={colors.primary} />
      </View>
      <Text variant="h4" color={colors.textPrimary} align="center">
        {title}
      </Text>
      <Text
        variant="body"
        color={colors.textSecondary}
        align="center"
        style={styles.subtitle}
      >
        {subtitle}
      </Text>
      <View style={styles.actions}>
        <Button title="Sign In" onPress={openLogin} fullWidth size="lg" />
        <Button
          title="Create an account"
          variant="outline"
          fullWidth
          size="lg"
          style={{ marginTop: spacing.sm }}
          onPress={() =>
            navigation.getParent()?.navigate('Auth', { screen: 'Register' }) ??
            navigation.navigate('Auth', { screen: 'Register' })
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.palette.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  subtitle: { marginTop: spacing.xs, maxWidth: 300 },
  actions: { alignSelf: 'stretch', marginTop: spacing.xl },
});
