import React from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Card, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

/**
 * Mirrors `Rythubidda-UI/src/pages/Contact.tsx` — same store location,
 * same phone, same email, same address, same working hours. Native map
 * preview replaces the website's Google Maps iframe so we don't pay a
 * WebView startup cost.
 *
 * Tapping any card runs a sensible Linking action:
 *   • Phone   → `tel:`     (native dialer)
 *   • Email   → `mailto:`  (email client)
 *   • Address → Google Maps app (or browser fallback)
 *   • Hours   → no-op
 */

// Real store coords (RYTHUBIDDA CEREALS PRIVATE LIMITED, Kukatpally).
// Parsed from the embed URL the website uses:
//   ...!3d17.493024299754435!2d78.4090645746292...
//   (!3d = lat, !2d = lng)
const STORE = {
  name: 'RYTHUBIDDA CEREALS PRIVATE LIMITED',
  latitude: 17.493024299754435,
  longitude: 78.4090645746292,
  phone: '+91-7569596175',
  email: 'rythubiddacereals@gmail.com',
  address: [
    'Plot 580, H.NO.6-580,',
    'Vivekananda Nagar Colony,',
    'Kukatpally, Hyderabad - 500072',
    'Telangana, India',
  ],
  hours: [
    { days: 'Monday – Saturday', time: '8:00 AM – 8:00 PM' },
    { days: 'Sunday', time: '9:00 AM – 6:00 PM' },
  ],
};

function openMaps() {
  // Universal Google Maps URL — opens the Maps app on Android, falls
  // back to the browser if Maps is uninstalled. Works on iOS too.
  const url = `https://www.google.com/maps/search/?api=1&query=${STORE.latitude},${STORE.longitude}`;
  Linking.openURL(url).catch(() => {});
}

function openTel(phone: string) {
  // Strip everything except digits + leading '+'. Some dialers refuse
  // dashes / spaces.
  const cleaned = phone.replace(/[^\d+]/g, '');
  Linking.openURL(`tel:${cleaned}`).catch(() => {});
}

function openMail(email: string) {
  Linking.openURL(`mailto:${email}`).catch(() => {});
}

export const ContactScreen: React.FC = () => {
  return (
    <Container edges={['top']}>
      <ScreenHeader title="Contact Us" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero copy ─────────────────────────────────────────────── */}
        <Text variant="h4" weight="800" color={colors.textPrimary}>
          We'd love to hear from you
        </Text>
        <Text
          variant="body"
          weight="600"
          color={colors.textPrimary}
          style={{ marginTop: 6, marginBottom: spacing.lg }}
        >
          For any questions about products, orders, or partnerships, reach out
          using the options below.
        </Text>

        {/* ── Our Location ──────────────────────────────────────────── */}
        <SectionLabel>Our Location</SectionLabel>
        <Pressable
          onPress={openMaps}
          style={({ pressed }) => [pressed && { opacity: 0.92 }]}
          android_ripple={{ color: colors.pressed }}
        >
          <LocationMapPreview
            latitude={STORE.latitude}
            longitude={STORE.longitude}
            draggable={false}
            height={200}
            style={{ marginBottom: spacing.sm }}
          />
        </Pressable>
        <Pressable onPress={openMaps} hitSlop={6} style={styles.openInMaps}>
          <Icon name="navigation" size={14} color={colors.primary} />
          <Text
            variant="bodySmall"
            weight="700"
            color={colors.primary}
            style={{ marginLeft: spacing.xs }}
          >
            Open in {Platform.OS === 'ios' ? 'Maps' : 'Google Maps'}
          </Text>
        </Pressable>

        {/* ── Contact Information ───────────────────────────────────── */}
        <SectionLabel style={{ marginTop: spacing.xl }}>
          Contact Information
        </SectionLabel>

        <ContactCard
          icon="phone"
          label="Phone"
          value={STORE.phone}
          onPress={() => openTel(STORE.phone)}
        />
        <ContactCard
          icon="mail"
          label="Email"
          value={STORE.email}
          onPress={() => openMail(STORE.email)}
        />
        <ContactCard
          icon="map-pin"
          label="Address"
          valueLines={STORE.address}
          onPress={openMaps}
        />

        {/* Working hours — informational card, no action */}
        <Card style={styles.hoursCard}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Icon name="clock" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.base }}>
              <Text
                variant="caption"
                weight="700"
                color={colors.textTertiary}
              >
                Working Hours
              </Text>
              {STORE.hours.map(h => (
                <View key={h.days} style={{ marginTop: 4 }}>
                  <Text
                    variant="bodySmall"
                    weight="700"
                    color={colors.textPrimary}
                  >
                    {h.days}
                  </Text>
                  <Text
                    variant="bodySmall"
                    weight="600"
                    color={colors.textSecondary}
                  >
                    {h.time}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>
    </Container>
  );
};

// ─── Small reusable bits ───────────────────────────────────────────────

const SectionLabel: React.FC<{
  children: React.ReactNode;
  style?: any;
}> = ({ children, style }) => (
  <Text
    variant="label"
    weight="800"
    color={colors.textPrimary}
    style={[styles.sectionLabel, style]}
  >
    {children}
  </Text>
);

const ContactCard: React.FC<{
  icon: string;
  label: string;
  value?: string;
  valueLines?: string[];
  onPress: () => void;
}> = ({ icon, label, value, valueLines, onPress }) => (
  <Pressable
    onPress={onPress}
    android_ripple={{ color: colors.pressed }}
    style={({ pressed }) => [pressed && { opacity: 0.92 }]}
  >
    <Card style={{ marginBottom: spacing.sm }}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Icon name={icon} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.base }}>
          <Text variant="caption" weight="700" color={colors.textTertiary}>
            {label}
          </Text>
          {value ? (
            <Text variant="body" weight="700" color={colors.textPrimary}>
              {value}
            </Text>
          ) : null}
          {valueLines ? (
            <View style={{ marginTop: 2 }}>
              {valueLines.map((line, i) => (
                <Text
                  key={i}
                  variant="bodySmall"
                  weight={i === 0 ? '700' : '600'}
                  color={colors.textPrimary}
                >
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        <Icon name="external-link" size={16} color={colors.textTertiary} />
      </View>
    </Card>
  </Pressable>
);

const styles = StyleSheet.create({
  scroll: { padding: spacing.base },
  sectionLabel: { marginBottom: spacing.sm, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.tintSoft,
    borderWidth: 1,
    borderColor: colors.tintMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openInMaps: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.tintSoft,
  },
  hoursCard: {
    marginBottom: spacing.sm,
  },
});
