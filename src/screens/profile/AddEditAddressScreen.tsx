import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, LoadingScreen, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import { addressService } from '../../api/services';
import { useAuthStore, useLocationStore } from '../../store';
import { addressSchema, AddressInput } from '../../utils/validation';
import { showToast } from '../../utils/toast';
import {
  checkLocationPermission,
  openAppSettings,
  requestLocationPermission,
} from '../../utils/locationPermissions';
import { getCurrentLocation } from '../../utils/geolocation';
import { forwardGeocode, reverseGeocode } from '../../utils/googleGeocode';
import { haptics } from '../../utils/haptics';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AddEditAddress'>;

export const AddEditAddressScreen: React.FC<Props> = ({ route, navigation }) => {
  const addressId = route.params?.addressId;
  const isEdit = !!addressId;
  const user = useAuthStore(s => s.user);
  const setStoreLocation = useLocationStore(s => s.setLocation);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [pinCoords, setPinCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      firstname: user?.firstname || user?.firstName || '',
      lastname: user?.lastname || user?.lastName || '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postcode: '',
      telephone: user?.phone || '',
      email: user?.email || '',
      latitude: undefined,
      longitude: undefined,
    },
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const list = await addressService.list();
        const found = list.find(a => a.customerAddressId === addressId);
        if (found) {
          reset({
            firstname: found.firstname || '',
            lastname: found.lastname || '',
            address1: found.address1,
            address2: found.address2 || '',
            city: found.city,
            state: found.state,
            postcode: found.postcode,
            telephone: found.telephone,
            email: found.email || '',
            latitude: found.latitude,
            longitude: found.longitude,
          });
          if (
            typeof found.latitude === 'number' &&
            typeof found.longitude === 'number'
          ) {
            setPinCoords({
              latitude: found.latitude,
              longitude: found.longitude,
            });
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, addressId, reset]);

  /**
   * "Use current location" — auto-fills address1/city/state/postcode from
   * the device's GPS fix via Google Geocoding. Also captures lat/lng so
   * they're sent to the backend on save (and the home pill updates
   * immediately via the global location store).
   */
  const handleUseCurrentLocation = async () => {
    if (detectingLocation) return;
    setDetectingLocation(true);
    try {
      let status = await checkLocationPermission();
      if (status === 'denied') {
        status = await requestLocationPermission();
      }
      if (status === 'blocked') {
        Alert.alert(
          'Location blocked',
          "We can't access your location. Open Settings to enable it, or fill in the address manually below.",
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => openAppSettings() },
          ],
        );
        return;
      }
      if (status === 'unavailable') {
        showToast.info(
          'GPS not available',
          'Rebuild the app to enable detection. Fill the form manually for now.',
        );
        return;
      }
      if (status !== 'granted' && status !== 'limited') {
        showToast.info(
          'Location not granted',
          'You can fill the form manually.',
        );
        return;
      }

      const gps = await getCurrentLocation({ highAccuracy: true });
      if (!gps.ok) {
        const msg =
          gps.error === 'timeout'
            ? "Couldn't get a GPS fix. Make sure location is on and try again."
            : "Couldn't get your location.";
        showToast.error('Location error', msg);
        return;
      }

      await applyCoordinates(gps.coords.latitude, gps.coords.longitude);
    } catch {
      showToast.error('Could not detect location', 'Try again or enter manually.');
    } finally {
      setDetectingLocation(false);
    }
  };

  /**
   * Shared between initial GPS detect and pin-drag refinement: takes a
   * lat/lng, runs Google reverse-geocode, and pre-fills the form fields.
   */
  const applyCoordinates = async (lat: number, lng: number) => {
    const geo = await reverseGeocode(lat, lng);
    if (!geo.ok) {
      if (geo.error === 'key_missing') {
        showToast.error(
          'API key not in build',
          'Rebuild Android after setting GOOGLE_MAPS_API_KEY in .env.',
        );
      } else if (geo.error === 'key_rejected') {
        showToast.error(
          'Google rejected the key',
          'Check Cloud Console: enable Geocoding API + match SHA-1.',
        );
      } else {
        showToast.error(
          "Couldn't read address",
          'Try again, or fill the fields manually.',
        );
      }
      return;
    }
    const a = geo.address;
    const line1Parts = [a.road, a.area].filter(Boolean) as string[];
    if (line1Parts.length > 0) {
      setValue('address1', line1Parts.join(', '), { shouldValidate: true });
    }
    if (a.city) setValue('city', a.city, { shouldValidate: true });
    if (a.state) setValue('state', a.state, { shouldValidate: true });
    if (a.pincode) setValue('postcode', a.pincode, { shouldValidate: true });
    setValue('latitude', a.latitude);
    setValue('longitude', a.longitude);
    setPinCoords({ latitude: a.latitude, longitude: a.longitude });

    // Mirror to global delivery-location store so the home pill updates
    // without requiring an extra trip through the picker.
    await setStoreLocation({
      pincode: a.pincode,
      city: a.city,
      state: a.state,
      area: a.area,
      road: a.road,
      formatted: a.formatted,
      latitude: a.latitude,
      longitude: a.longitude,
      source: 'gps',
      capturedAt: new Date().toISOString(),
    });

    haptics.success();
    showToast.success(
      'Address pre-filled',
      `${a.area ?? a.city ?? ''} ${a.pincode}`.trim(),
    );
  };

  const onSubmit = async (data: AddressInput) => {
    setSubmitting(true);
    try {
      // Auto-geocode if the user filled the form manually (no GPS) and we
      // therefore don't have lat/lng yet. The backend uses these for
      // distance-based shipping — without them, that address falls back to
      // the legacy pincode pricing. Best-effort: if geocoding fails for
      // any reason (rate limit, no internet) we still save the address.
      let payload: AddressInput = data;
      if (
        typeof data.latitude !== 'number' ||
        typeof data.longitude !== 'number'
      ) {
        const composite = [
          data.address1,
          data.address2,
          data.city,
          data.state,
          data.postcode,
          'India',
        ]
          .filter(Boolean)
          .join(', ');
        const geo = await forwardGeocode(composite);
        if (geo.ok) {
          payload = {
            ...data,
            latitude: geo.address.latitude,
            longitude: geo.address.longitude,
          };
        }
        // No toast on geocode failure — the save still works, just with
        // legacy shipping pricing.
      }

      if (isEdit) {
        await addressService.update({ ...payload, customerAddressId: addressId });
      } else {
        await addressService.save(payload);
      }
      showToast.success(isEdit ? 'Address updated' : 'Address saved');
      navigation.goBack();
    } catch (e: any) {
      showToast.error('Save failed', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <Container>
      <ScreenHeader title={isEdit ? 'Edit address' : 'Add address'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Use current location — auto-fills the form from a GPS fix */}
          <Pressable
            onPress={handleUseCurrentLocation}
            disabled={detectingLocation}
            style={({ pressed }) => [
              styles.useLocationBtn,
              pressed && { opacity: 0.9 },
              detectingLocation && { opacity: 0.7 },
            ]}
            android_ripple={{ color: colors.pressed }}
            accessibilityRole="button"
            accessibilityLabel="Use current location to pre-fill address"
          >
            <View style={styles.useLocationIcon}>
              <Icon name="navigation" size={16} color={colors.white} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text variant="bodyBold" weight="700" color={colors.textPrimary}>
                {detectingLocation ? 'Detecting…' : 'Use current location'}
              </Text>
              <Text
                variant="caption"
                weight="600"
                color={colors.textSecondary}
                style={{ marginTop: 1 }}
              >
                Auto-fill street, city, state and pincode from GPS.
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.textTertiary} />
          </Pressable>

          {/* Map preview — only after we have coordinates. Drag the pin to
              refine the lat/lng + re-fetch the address. */}
          {pinCoords ? (
            <LocationMapPreview
              latitude={pinCoords.latitude}
              longitude={pinCoords.longitude}
              draggable
              onCoordinateChange={c => {
                setPinCoords(c);
                void applyCoordinates(c.latitude, c.longitude);
              }}
              style={{ marginBottom: spacing.lg }}
            />
          ) : null}

          <View style={styles.row}>
            <Controller
              control={control}
              name="firstname"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="First name"
                  value={value}
                  onChangeText={onChange}
                  error={errors.firstname?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
            <View style={{ width: spacing.md }} />
            <Controller
              control={control}
              name="lastname"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Last name"
                  value={value}
                  onChangeText={onChange}
                  error={errors.lastname?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
          </View>
          <Controller
            control={control}
            name="address1"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Address line 1"
                placeholder="House no, street"
                value={value}
                onChangeText={onChange}
                error={errors.address1?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="address2"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Address line 2 (optional)"
                placeholder="Landmark, area"
                value={value}
                onChangeText={onChange}
                error={errors.address2?.message}
              />
            )}
          />
          <View style={styles.row}>
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="City"
                  value={value}
                  onChangeText={onChange}
                  error={errors.city?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
            <View style={{ width: spacing.md }} />
            <Controller
              control={control}
              name="state"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="State"
                  value={value}
                  onChangeText={onChange}
                  error={errors.state?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
          </View>
          <View style={styles.row}>
            <Controller
              control={control}
              name="postcode"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Pincode"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={value}
                  onChangeText={onChange}
                  error={errors.postcode?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
            <View style={{ width: spacing.md }} />
            <Controller
              control={control}
              name="telephone"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Phone"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={value}
                  onChangeText={onChange}
                  error={errors.telephone?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
          </View>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Email (optional)"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
              />
            )}
          />
          <Button
            title={isEdit ? 'Update address' : 'Save address'}
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl },
  row: { flexDirection: 'row' },
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.tintSoft,
    borderWidth: 1,
    borderColor: colors.tintMid,
    marginBottom: spacing.lg,
  },
  useLocationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
