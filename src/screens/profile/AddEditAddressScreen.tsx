import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  Card,
  Input,
  LoadingScreen,
  Text,
} from '../../components/common';
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
import { reverseGeocode, type ResolvedAddress } from '../../utils/googleGeocode';
import {
  autocomplete as gAutocomplete,
  createSessionToken,
  placeDetails,
  type PlaceSuggestion,
} from '../../utils/googlePlaces';
import { haptics } from '../../utils/haptics';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { fonts, fontSizes } from '../../theme/typography';
import { SHIPPING_CONFIG } from '../../constants/shipping';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AddEditAddress'>;

const AUTOCOMPLETE_DEBOUNCE_MS = 300;

/**
 * Map-first address form — Zepto / Swiggy / Blinkit pattern.
 *
 *   ┌──────────────────────────┐
 *   │  Map with draggable pin  │  ← drag to refine; auto-detects on mount
 *   └──────────────────────────┘
 *   🔍 Search address ...        ← Google Places autocomplete
 *   ┌──────────────────────────┐
 *   │ 📍 Detected location:    │
 *   │ Kukatpally, Hyderabad,   │  ← city/state/pincode AUTO-FILLED
 *   │ Telangana - 500072       │     not editable
 *   └──────────────────────────┘
 *   First name | Last name
 *   Flat / House no
 *   Landmark (optional)
 *   Phone
 *   [ Save address ]
 */
export const AddEditAddressScreen: React.FC<Props> = ({ route, navigation }) => {
  const addressId = route.params?.addressId;
  const isEdit = !!addressId;
  const user = useAuthStore(s => s.user);
  const setStoreLocation = useLocationStore(s => s.setLocation);

  // Map / location state
  const [pinCoords, setPinCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [resolved, setResolved] = useState<ResolvedAddress | null>(null);
  const [resolving, setResolving] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const sessionTokenRef = useRef<string>(createSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Form — only the manual-input fields. city/state/pincode/lat/lng come
  // from `resolved` + `pinCoords` and are merged into the payload at save.
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      firstname: user?.firstname || user?.firstName || '',
      lastname: user?.lastname || user?.lastName || '',
      address1: '',
      address2: '',
      telephone: user?.phone || '',
    },
  });

  // ────────────────────────────────────────────────────────────────────
  //  Init — edit mode loads existing row; create mode auto-detects GPS
  // ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isEdit) {
        try {
          const list = await addressService.list();
          const found = list.find(a => a.customerAddressId === addressId);
          if (found && !cancelled) {
            reset({
              firstname: found.firstname || '',
              lastname: found.lastname || '',
              address1: found.address1 || '',
              address2: found.address2 || '',
              telephone: found.telephone || '',
            });
            if (typeof found.latitude === 'number' && typeof found.longitude === 'number') {
              setPinCoords({ latitude: found.latitude, longitude: found.longitude });
              // Synthesise a ResolvedAddress from saved fields so the
              // "Detected location" card has something to show immediately.
              setResolved({
                pincode: found.postcode,
                city: found.city,
                state: found.state,
                area: undefined,
                road: undefined,
                formatted: `${found.address1}${found.address2 ? `, ${found.address2}` : ''}, ${found.city}, ${found.state} - ${found.postcode}`,
                latitude: found.latitude,
                longitude: found.longitude,
              });
            } else {
              // Edit row with no coords — geocode them now
              await detectFromGps(false);
            }
          }
        } finally {
          if (!cancelled) setInitializing(false);
        }
      } else {
        // Add mode — try GPS first, fall back to warehouse default
        await detectFromGps(true);
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, addressId]);

  // ────────────────────────────────────────────────────────────────────
  //  GPS detection
  // ────────────────────────────────────────────────────────────────────
  const detectFromGps = async (silent: boolean) => {
    try {
      let status = await checkLocationPermission();
      if (status === 'denied') {
        status = await requestLocationPermission();
      }
      if (status === 'blocked') {
        if (!silent) {
          Alert.alert(
            'Location blocked',
            "We can't access your location. Open Settings to enable it, or search for your address.",
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => openAppSettings() },
            ],
          );
        }
        // Fall back to warehouse so the map still has SOMETHING to show.
        if (!pinCoords) {
          setPinCoords({
            latitude: SHIPPING_CONFIG.warehouseLat,
            longitude: SHIPPING_CONFIG.warehouseLng,
          });
        }
        return;
      }
      if (status !== 'granted' && status !== 'limited') {
        if (!pinCoords) {
          setPinCoords({
            latitude: SHIPPING_CONFIG.warehouseLat,
            longitude: SHIPPING_CONFIG.warehouseLng,
          });
        }
        return;
      }

      const gps = await getCurrentLocation({ highAccuracy: true });
      if (!gps.ok) {
        if (!pinCoords) {
          setPinCoords({
            latitude: SHIPPING_CONFIG.warehouseLat,
            longitude: SHIPPING_CONFIG.warehouseLng,
          });
        }
        return;
      }
      await applyCoordinates(gps.coords.latitude, gps.coords.longitude);
    } catch {
      if (!pinCoords) {
        setPinCoords({
          latitude: SHIPPING_CONFIG.warehouseLat,
          longitude: SHIPPING_CONFIG.warehouseLng,
        });
      }
    }
  };

  /**
   * Set pin → reverse-geocode → update the "Detected location" card +
   * mirror to the global delivery-location store (so the home pill
   * updates immediately).
   */
  const applyCoordinates = async (lat: number, lng: number) => {
    setPinCoords({ latitude: lat, longitude: lng });
    setResolving(true);
    try {
      const geo = await reverseGeocode(lat, lng);
      if (!geo.ok) {
        if (geo.error === 'key_missing' || geo.error === 'key_rejected') {
          showToast.error(
            'Maps key issue',
            'Check Cloud Console: enable Geocoding API and verify SHA-1.',
          );
        }
        return;
      }
      setResolved(geo.address);
      // Push to global store too
      await setStoreLocation({
        pincode: geo.address.pincode,
        city: geo.address.city,
        state: geo.address.state,
        area: geo.address.area,
        road: geo.address.road,
        formatted: geo.address.formatted,
        latitude: geo.address.latitude,
        longitude: geo.address.longitude,
        source: 'gps',
        capturedAt: new Date().toISOString(),
      });
      haptics.tap();
    } finally {
      setResolving(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────
  //  Autocomplete (Google Places New)
  // ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (trimmed.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const r = await gAutocomplete(trimmed, sessionTokenRef.current);
      setSearching(false);
      if (r.ok) setSuggestions(r.suggestions);
      else setSuggestions([]);
    }, AUTOCOMPLETE_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const pickSuggestion = async (s: PlaceSuggestion) => {
    setSearching(true);
    try {
      const r = await placeDetails(s.placeId, sessionTokenRef.current);
      sessionTokenRef.current = createSessionToken(); // mint a fresh session
      if (!r.ok || !r.details.pincode) {
        showToast.error("Couldn't read that address", 'Try a different result or drag the pin.');
        return;
      }
      const d = r.details;
      setPinCoords({ latitude: d.latitude, longitude: d.longitude });
      setResolved({
        pincode: d.pincode!, // narrowed by the !r.details.pincode guard above
        city: d.city,
        state: d.state,
        country: d.country,
        area: d.area,
        road: d.road,
        formatted: d.formatted,
        latitude: d.latitude,
        longitude: d.longitude,
      });
      setSearchQuery('');
      setSuggestions([]);
      haptics.tap();
    } finally {
      setSearching(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────
  //  Save
  // ────────────────────────────────────────────────────────────────────
  const onSubmit = async (data: AddressInput) => {
    if (!resolved || !pinCoords) {
      showToast.error(
        'Pick your location',
        'Use the map / search to set your delivery location.',
      );
      return;
    }
    if (!resolved.pincode || !resolved.city || !resolved.state) {
      showToast.error(
        'Address incomplete',
        "We couldn't determine the pincode for this spot. Drag the pin closer to a road.",
      );
      return;
    }
    setSubmitting(true);
    try {
      // Non-null assertions are safe — the early return above guards
      // pincode/city/state. TypeScript doesn't carry the narrowing through
      // the showToast/return path, so we re-assert here.
      const payload = {
        ...data,
        city: resolved.city!,
        state: resolved.state!,
        postcode: resolved.pincode,
        latitude: pinCoords.latitude,
        longitude: pinCoords.longitude,
      };
      if (isEdit) {
        await addressService.update({ ...payload, customerAddressId: addressId });
      } else {
        await addressService.save(payload);
      }
      haptics.success();
      showToast.success(isEdit ? 'Address updated' : 'Address saved');
      navigation.goBack();
    } catch (e: any) {
      showToast.error('Save failed', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (initializing) return <LoadingScreen />;

  return (
    <Container edges={['top']}>
      <ScreenHeader title={isEdit ? 'Edit address' : 'Add address'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Map (always visible, full-width) ───────────────────────── */}
          {pinCoords ? (
            <LocationMapPreview
              latitude={pinCoords.latitude}
              longitude={pinCoords.longitude}
              draggable
              height={200}
              onCoordinateChange={c => void applyCoordinates(c.latitude, c.longitude)}
              style={{ marginBottom: spacing.sm }}
            />
          ) : null}

          {/* ── Search bar (Places autocomplete) ───────────────────────── */}
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color={colors.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search area, street, or landmark"
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="words"
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : searchQuery.length > 0 ? (
              <Pressable onPress={() => { setSearchQuery(''); setSuggestions([]); }} hitSlop={8}>
                <Icon name="x" size={16} color={colors.textTertiary} />
              </Pressable>
            ) : null}
          </View>

          {/* ── Autocomplete suggestions dropdown ──────────────────────── */}
          {suggestions.length > 0 ? (
            <Card style={styles.suggestionsCard} padded={false}>
              {suggestions.map((s, i) => (
                <Pressable
                  key={s.placeId}
                  onPress={() => pickSuggestion(s)}
                  style={({ pressed }) => [
                    styles.suggestion,
                    i > 0 && styles.suggestionDivider,
                    pressed && { opacity: 0.92 },
                  ]}
                  android_ripple={{ color: colors.pressed }}
                >
                  <Icon name="map-pin" size={16} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text variant="bodyBold" weight="700" numberOfLines={1}>
                      {s.primaryText}
                    </Text>
                    {s.secondaryText ? (
                      <Text variant="caption" weight="500" color={colors.textSecondary} numberOfLines={1}>
                        {s.secondaryText}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </Card>
          ) : null}

          {/* ── Resolved-location card (auto-filled from map / search) ─── */}
          {resolved ? (
            <Card style={styles.resolvedCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Icon name="map-pin" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text variant="bodyBold" weight="700" color={colors.textPrimary}>
                    Delivery to
                  </Text>
                  <Text
                    variant="caption"
                    weight="600"
                    color={colors.textSecondary}
                    style={{ marginTop: 2 }}
                  >
                    {resolved.formatted ??
                      [resolved.area, resolved.city, resolved.state, resolved.pincode]
                        .filter(Boolean)
                        .join(', ')}
                  </Text>
                  {resolving ? (
                    <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
                      Updating…
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => detectFromGps(false)} hitSlop={8} style={styles.refreshBtn}>
                  <Icon name="navigation" size={16} color={colors.primary} />
                </Pressable>
              </View>
            </Card>
          ) : (
            <Card style={[styles.resolvedCard, { backgroundColor: '#fef2f2' }]} elevated={false}>
              <Text variant="caption" color={colors.error} weight="600">
                Pick a location on the map or search to continue.
              </Text>
            </Card>
          )}

          {/* ── Manual inputs ──────────────────────────────────────────── */}
          <View style={[styles.row, { marginTop: spacing.lg }]}>
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
                label="Flat / House no. / Plot"
                placeholder="e.g. Plot 42, Flat 3B"
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
                label="Landmark (optional)"
                placeholder="e.g. Near temple"
                value={value}
                onChangeText={onChange}
                error={errors.address2?.message}
              />
            )}
          />
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
              />
            )}
          />

          <Button
            title={isEdit ? 'Update address' : 'Save address'}
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            disabled={!resolved || !pinCoords}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'] },
  row: { flexDirection: 'row' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    minHeight: 48,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: colors.textPrimary,
    padding: 0,
  },

  suggestionsCard: {
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  suggestionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },

  resolvedCard: {
    backgroundColor: colors.tintSoft,
    borderWidth: 1,
    borderColor: colors.tintMid,
    marginBottom: spacing.sm,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
