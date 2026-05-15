import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { confirm } from '../../utils/confirm';
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
  /** Foreground colour for the icon (defaults to primary) */
  tint?: string;
  /** Soft tinted background behind the icon (icon-well) */
  tintBg?: string;
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

  const confirmLogout = async () => {
    const ok = await confirm({
      title: 'Log out of Rythu Bidda?',
      message: 'You can sign back in any time with your phone number.',
      confirmText: 'Log out',
      cancelText: 'Stay signed in',
      destructive: true,
      icon: 'log-out',
    });
    if (ok) logout();
  };

  // Per-item accent colours: each menu row gets its own hue so the list
  // doesn't read as a wall of brown. Backgrounds are soft pastels of the
  // matching tone so the icons pop without shouting.
  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          icon: 'user',
          label: 'Edit Profile',
          screen: 'EditProfile',
          tint: colors.primary,
          tintBg: colors.primaryMuted,
        },
        {
          icon: 'lock',
          label: 'Change Password',
          screen: 'ChangePassword',
          tint: colors.info,
          tintBg: colors.infoSoft,
        },
        {
          icon: 'map-pin',
          label: 'My Addresses',
          screen: 'Addresses',
          tint: colors.accent,
          tintBg: '#FFE6D6',
        },
      ],
    },
    {
      title: 'Orders & Support',
      items: [
        {
          icon: 'mail',
          label: 'Contact Us',
          screen: 'Contact',
          tint: colors.success,
          tintBg: colors.successSoft,
        },
        {
          icon: 'info',
          label: 'About',
          screen: 'About',
          tint: colors.secondaryDark,
          tintBg: colors.secondarySoft,
        },
      ],
    },
    {
      title: 'Policies',
      items: [
        {
          icon: 'file-text',
          label: 'Terms & Conditions',
          screen: 'Terms',
          tint: colors.primaryDark,
          tintBg: colors.tintMid,
        },
        {
          icon: 'shield',
          label: 'Privacy Policy',
          screen: 'Privacy',
          tint: colors.info,
          tintBg: colors.infoSoft,
        },
        {
          icon: 'rotate-ccw',
          label: 'Refund Policy',
          screen: 'RefundPolicy',
          tint: colors.warning,
          tintBg: colors.warningSoft,
        },
        {
          icon: 'truck',
          label: 'Shipping Policy',
          screen: 'ShippingPolicy',
          tint: colors.success,
          tintBg: colors.successSoft,
        },
      ],
    },
    {
      title: '',
      items: [
        {
          icon: 'log-out',
          label: 'Log out',
          danger: true,
          onPress: confirmLogout,
          tint: colors.error,
          tintBg: colors.errorSoft,
        },
      ],
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
              <Text
                variant="label"
                color={colors.black}
                weight="700"
                style={styles.sectionTitle}
              >
                {section.title.toUpperCase()}
              </Text>
            ) : null}
            <Card padded={false}>
              {section.items.map((item, idx) => {
                const tint = item.tint ?? colors.primary;
                const tintBg = item.tintBg ?? colors.primaryMuted;
                return (
                  <View key={`it-${idx}`}>
                    <Pressable
                      onPress={() =>
                        item.onPress ? item.onPress() : navigation.navigate(item.screen!)
                      }
                      android_ripple={{ color: colors.pressed }}
                      style={styles.menuRow}
                    >
                      <View style={[styles.iconWell, { backgroundColor: tintBg }]}>
                        <Icon name={item.icon} size={18} color={tint} />
                      </View>
                      <Text
                        variant="body"
                        color={item.danger ? colors.error : colors.black}
                        weight="600"
                        style={styles.menuLabel}
                      >
                        {item.label}
                      </Text>
                      {!item.danger ? (
                        <Icon name="chevron-right" size={18} color={colors.primary} />
                      ) : null}
                    </Pressable>
                    {idx < section.items.length - 1 ? (
                      <Divider spacing_={0} style={styles.rowDivider} />
                    ) : null}
                  </View>
                );
              })}
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
  sectionTitle: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    fontSize: 12,
    letterSpacing: 1.1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md + 2,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: 15.5,
  },
  // Indented divider so it lines up under the label, not the icon-well —
  // the icons remain visually grouped while the dividers feel cleaner.
  rowDivider: {
    marginLeft: spacing.base + 36 + spacing.md,
  },
});
