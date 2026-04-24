import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { Card, Divider, SignInPrompt, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { useAuthStore, useIsAuthenticated } from '../../store';
import { formatPhone, getInitials } from '../../utils/format';
import { APP_CONFIG } from '../../constants/config';

interface MenuItem {
  icon: string;
  label: string;
  screen?: string;
  danger?: boolean;
  onPress?: () => void;
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isAuth = useIsAuthenticated();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  if (!isAuth) {
    return (
      <Container edges={['top']}>
        <ScreenHeader title="Profile" showBack={false} />
        <SignInPrompt
          icon="user"
          title="Sign in to Rythu Bidda"
          subtitle="Manage your profile, addresses, orders and more."
        />
      </Container>
    );
  }

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Account',
      items: [
        { icon: 'user', label: 'Edit Profile', screen: 'EditProfile' },
        { icon: 'lock', label: 'Change Password', screen: 'ChangePassword' },
        { icon: 'map-pin', label: 'My Addresses', screen: 'Addresses' },
      ],
    },
    {
      title: 'Orders & Support',
      items: [
        { icon: 'mail', label: 'Contact Us', screen: 'Contact' },
        { icon: 'info', label: 'About', screen: 'About' },
      ],
    },
    {
      title: 'Policies',
      items: [
        { icon: 'file-text', label: 'Terms & Conditions', screen: 'Terms' },
        { icon: 'shield', label: 'Privacy Policy', screen: 'Privacy' },
        { icon: 'rotate-ccw', label: 'Refund Policy', screen: 'RefundPolicy' },
        { icon: 'truck', label: 'Shipping Policy', screen: 'ShippingPolicy' },
      ],
    },
    {
      title: '',
      items: [{ icon: 'log-out', label: 'Log out', danger: true, onPress: confirmLogout }],
    },
  ];

  return (
    <Container edges={['top']}>
      <ScreenHeader title="Profile" showBack={false} />
      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing['3xl'] }}>
        {/* User card */}
        <Card>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text variant="h4" color={colors.white}>
                {getInitials(`${user?.firstname ?? user?.firstName ?? ''} ${user?.lastname ?? user?.lastName ?? ''}`)}
              </Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: spacing.base }}>
              <Text variant="h5" color={colors.textPrimary}>
                {(user?.firstname || user?.firstName) ?? ''} {(user?.lastname || user?.lastName) ?? ''}
              </Text>
              {user?.phone ? (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {formatPhone(user.phone)}
                </Text>
              ) : null}
              {user?.email ? (
                <Text variant="caption" color={colors.textTertiary}>
                  {user.email}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        {sections.map((section, i) => (
          <View key={`sec-${i}`} style={{ marginTop: spacing.lg }}>
            {section.title ? (
              <Text variant="label" color={colors.textSecondary} style={styles.sectionTitle}>
                {section.title}
              </Text>
            ) : null}
            <Card padded={false}>
              {section.items.map((item, idx) => (
                <View key={`it-${idx}`}>
                  <Pressable
                    onPress={() =>
                      item.onPress ? item.onPress() : navigation.navigate(item.screen!)
                    }
                    android_ripple={{ color: colors.pressed }}
                    style={styles.menuRow}
                  >
                    <Icon
                      name={item.icon}
                      size={20}
                      color={item.danger ? colors.error : colors.primary}
                    />
                    <Text
                      variant="body"
                      color={item.danger ? colors.error : colors.textPrimary}
                      weight="500"
                      style={{ flex: 1, marginLeft: spacing.base }}
                    >
                      {item.label}
                    </Text>
                    {!item.danger ? (
                      <Icon name="chevron-right" size={18} color={colors.textTertiary} />
                    ) : null}
                  </Pressable>
                  {idx < section.items.length - 1 ? <Divider spacing_={0} /> : null}
                </View>
              ))}
            </Card>
          </View>
        ))}

        <Text
          variant="caption"
          color={colors.textTertiary}
          align="center"
          style={{ marginTop: spacing['2xl'] }}
        >
          {APP_CONFIG.APP_NAME} · v1.0.0
        </Text>
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  userRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { marginBottom: spacing.sm, marginLeft: 2 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
});
