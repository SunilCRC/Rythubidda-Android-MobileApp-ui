import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Card, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { APP_CONFIG } from '../../constants/config';

export const ContactScreen: React.FC = () => {
  const open = (url: string) => Linking.openURL(url).catch(() => {});
  return (
    <Container edges={['top']}>
      <ScreenHeader title="Contact Us" />
      <ScrollView contentContainerStyle={{ padding: spacing.base }}>
        <Text variant="h5" style={{ marginBottom: spacing.sm }}>
          We'd love to hear from you
        </Text>
        <Text variant="body" color={colors.textSecondary} style={{ marginBottom: spacing.lg }}>
          For any questions about products, orders, or partnerships, reach out using the options
          below.
        </Text>

        <ContactCard
          icon="mail"
          label="Email"
          value={APP_CONFIG.SUPPORT_EMAIL}
          onPress={() => open(`mailto:${APP_CONFIG.SUPPORT_EMAIL}`)}
        />
        <ContactCard
          icon="globe"
          label="Website"
          value={APP_CONFIG.WEB_URL}
          onPress={() => open(APP_CONFIG.WEB_URL)}
        />
      </ScrollView>
    </Container>
  );
};

const ContactCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  onPress: () => void;
}> = ({ icon, label, value, onPress }) => (
  <Pressable onPress={onPress}>
    <Card style={{ marginBottom: spacing.sm }}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Icon name={icon} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.base }}>
          <Text variant="caption" color={colors.textTertiary}>
            {label}
          </Text>
          <Text variant="body" color={colors.textPrimary}>
            {value}
          </Text>
        </View>
        <Icon name="external-link" size={16} color={colors.textTertiary} />
      </View>
    </Card>
  </Pressable>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.palette.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
