import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { STORAGE_KEYS } from '../../constants/storage';
import {
  checkLocationPermission,
  requestLocationPermission,
} from '../../utils/locationPermissions';
import { showToast } from '../../utils/toast';
import type { LocationStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<LocationStackParamList, 'PermissionPrimer'>;

/**
 * Pre-permission rationale shown before the OS dialog.
 *
 * Best practice (Apple HIG + Material) — explain *why* you want the
 * permission so users don't reflexively deny. Dismissible — users can
 * always proceed with manual pincode entry instead.
 *
 * Routed via `RootNavigator > Location > PermissionPrimer`. After we
 * either get a yes/no from the OS, we replace this screen with the
 * picker (so back-navigating doesn't loop the user back to a primer
 * they've already seen).
 */
export const PermissionPrimerScreen: React.FC<Props> = ({ navigation }) => {
  const [requesting, setRequesting] = useState(false);

  const markSeen = () =>
    AsyncStorage.setItem(STORAGE_KEYS.LOCATION_PRIMER_SEEN, '1').catch(() => {});

  const handleAllow = async () => {
    setRequesting(true);
    try {
      const status = await requestLocationPermission();
      await markSeen();
      if (status === 'granted' || status === 'limited') {
        navigation.replace('LocationPicker', { autoDetect: true });
      } else if (status === 'unavailable') {
        showToast.info(
          'Native module not linked',
          'Rebuild the app to enable GPS detection. You can still enter pincode manually.',
        );
        navigation.replace('LocationPicker', undefined);
      } else {
        // denied / blocked — fall through to picker so user can type pincode
        navigation.replace('LocationPicker', undefined);
      }
    } catch {
      navigation.replace('LocationPicker', undefined);
    } finally {
      setRequesting(false);
    }
  };

  const handleSkip = async () => {
    await markSeen();
    navigation.replace('LocationPicker', undefined);
  };

  return (
    <Container>
      <View style={styles.body}>
        <View style={styles.iconWell}>
          <Icon name="map-pin" size={48} color={colors.primary} />
        </View>

        <Text variant="h3" weight="800" align="center" color={colors.textPrimary}>
          Find your delivery location
        </Text>
        <Text
          variant="body"
          weight="500"
          align="center"
          color={colors.textSecondary}
          style={styles.subtitle}
        >
          We use your location only to detect serviceable pincodes and pre-fill
          your delivery address. You can always type the pincode manually
          instead.
        </Text>

        <View style={styles.bullets}>
          <Bullet
            icon="zap"
            label="One-tap address detection"
            sub="No need to type pincode, city, state."
          />
          <Bullet
            icon="shield"
            label="Used only when you're shopping"
            sub="We never track your location in the background."
          />
          <Bullet
            icon="lock"
            label="Stays on your device"
            sub="Your location isn't shared with third parties."
          />
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Allow Location"
          onPress={handleAllow}
          loading={requesting}
          fullWidth
          size="lg"
          leftIcon={<Icon name="map-pin" size={16} color={colors.white} />}
        />
        <Button
          title="Maybe later — enter pincode manually"
          onPress={handleSkip}
          variant="ghost"
          fullWidth
          size="lg"
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </Container>
  );
};

const Bullet: React.FC<{ icon: string; label: string; sub: string }> = ({
  icon,
  label,
  sub,
}) => (
  <View style={styles.bullet}>
    <View style={styles.bulletIcon}>
      <Icon name={icon} size={14} color={colors.primary} />
    </View>
    <View style={{ flex: 1, marginLeft: spacing.sm }}>
      <Text variant="bodyBold" weight="700" color={colors.textPrimary}>
        {label}
      </Text>
      <Text
        variant="caption"
        weight="600"
        color={colors.textSecondary}
        style={{ marginTop: 1 }}
      >
        {sub}
      </Text>
    </View>
  </View>
);

/**
 * Helper used by callers that want to decide whether to route through
 * this screen at all. Returns false if (a) we've shown it before, or
 * (b) permission is already granted.
 */
export async function shouldShowPermissionPrimer(): Promise<boolean> {
  try {
    const seen = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_PRIMER_SEEN);
    if (seen === '1') return false;
  } catch {
    // ignore
  }
  const status = await checkLocationPermission();
  return status !== 'granted' && status !== 'limited';
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    alignItems: 'center',
  },
  iconWell: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.tintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  subtitle: {
    marginTop: spacing.sm,
    maxWidth: 320,
  },
  bullets: {
    width: '100%',
    marginTop: spacing['2xl'],
    gap: spacing.base,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.tintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
});

// keep imports tidy if `radius` ever stops being used directly
void radius;
