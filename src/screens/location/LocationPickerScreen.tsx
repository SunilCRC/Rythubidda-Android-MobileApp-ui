import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { confirm } from '../../utils/confirm';
import Icon from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  Card,
  Divider,
  LoadingScreen,
  Text,
} from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import { addressService } from '../../api/services';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { fonts, fontSizes } from '../../theme/typography';
import {
  useDeliveryCenterStore,
  useIsAuthenticated,
  useLocationStore,
  type DeliveryLocation,
} from '../../store';
import {
  checkLocationPermission,
  openAppSettings,
  requestLocationPermission,
} from '../../utils/locationPermissions';
import { getCurrentLocation } from '../../utils/geolocation';
import { forwardGeocode, reverseGeocode } from '../../utils/googleGeocode';
import { calculateShippingMobile } from '../../utils/mobileShipping';
import {
  autocomplete as gAutocomplete,
  createSessionToken,
  placeDetails,
  type PlaceSuggestion,
} from '../../utils/googlePlaces';
import { showToast } from '../../utils/toast';
import { haptics } from '../../utils/haptics';
import { toArray } from '../../utils/format';
import { APP_CONFIG } from '../../constants/config';
import type { LocationStackParamList } from '../../navigation/types';
import type { CustomerAddress } from '../../types';

// Tall map (Zepto/Swiggy style) — ~42% of viewport, clamped so it
// always feels like a "map screen", never a tiny preview.
const SCREEN_H = Dimensions.get('window').height;
const MAP_H = Math.max(300, Math.min(440, Math.round(SCREEN_H * 0.42)));

type Props = NativeStackScreenProps<LocationStackParamList, 'LocationPicker'>;

/**
 * Single screen that handles every way a user picks a delivery location.
 *
 * 1. **Address autocomplete** (Google Places) — type "Kukat" → suggestions
 *    → tap → fetch details → save.
 * 2. **Use current location** (GPS) — permission → fix → reverse-geocode
 *    → preview map (draggable pin) → confirm → save.
 * 3. **Saved address** (auth users) — tap a one-line summary → save.
 * 4. **Manual pincode** — fallback when nothing above works → validate
 *    against /pincode/validate → save.
 *
 * Routed-to from:
 *   • The home-screen "Deliver to" pill (always)
 *   • The first-launch flow (after PermissionPrimer; with autoDetect=true)
 *   • The cart/checkout when serviceability fails
 */
const AUTOCOMPLETE_DEBOUNCE_MS = 300;

export const LocationPickerScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const setLocation = useLocationStore(s => s.setLocation);
  const recents = useLocationStore(s => s.recents);
  const isAuth = useIsAuthenticated();
  const inputRef = useRef<TextInput>(null);

  // Live delivery-center config (centers + global rate) hydrated on
  // splash. We use this — NOT the legacy `pincodes_validation` table —
  // to decide if a location is serviceable. Source of truth is "is the
  // customer inside the radius of any active delivery_center row?".
  const shippingConfig = useDeliveryCenterStore(s => s.config);

  /**
   * Pure serviceability check by distance — mirrors what CheckoutScreen
   * does. Returns `serviceable=undefined` when shipping config hasn't
   * hydrated yet (treat as "unknown — let the user proceed; checkout
   * will recheck"). Returns `false` when the nearest active center is
   * farther than its maxRadiusKm. Returns `true` otherwise, alongside
   * the distance and store name (handy for future UX).
   */
  const checkServiceableByDistance = (lat: number, lng: number) => {
    if (!shippingConfig || shippingConfig.centers.length === 0) {
      // Config not hydrated → don't block; checkout recomputes anyway.
      return { serviceable: undefined as boolean | undefined, distanceKm: 0, centerName: '' };
    }
    const r = calculateShippingMobile(
      lat,
      lng,
      0,
      shippingConfig.centers,
      shippingConfig.perKmRate,
      shippingConfig.freeAboveCartAmount,
    );
    return {
      serviceable: r.applicable,
      distanceKm: r.distanceKm,
      centerName: r.centerName,
    };
  };

  // Autocomplete state
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const sessionTokenRef = useRef<string>(createSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pincode state (fallback when autocomplete is empty)
  const [pincodeValidating, setPincodeValidating] = useState(false);

  // GPS state
  const [detecting, setDetecting] = useState(false);
  const [detectedPreview, setDetectedPreview] = useState<DeliveryLocation | null>(null);

  // Saved-address state
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null);

  const autoDetect = route.params?.autoDetect === true;

  // Load saved addresses (auth only). Surfaced as one-tap suggestions.
  useEffect(() => {
    if (!isAuth) {
      setAddresses([]);
      return;
    }
    addressService
      .list()
      .then(raw => setAddresses(toArray<CustomerAddress>(raw)))
      .catch(() => setAddresses([]));
  }, [isAuth]);

  // Auto-fire detection when the primer routed here with consent.
  useEffect(() => {
    if (autoDetect) {
      void handleDetect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDetect]);

  // ────────────────────────────────────────────────────────────────────
  // 1. Google Places autocomplete — debounced
  // ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Trim and short-circuit on empty / too-short input — Places hates
    // very short queries and we save a request.
    const trimmed = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (trimmed.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const r = await gAutocomplete(trimmed, sessionTokenRef.current);
      if (r.ok) {
        setSuggestions(r.suggestions);
      } else {
        setSuggestions([]);
        if (r.error === 'key_missing') {
          showToast.error(
            'API key not in build',
            'Rebuild Android after setting GOOGLE_MAPS_API_KEY in .env.',
          );
        } else if (r.error === 'key_rejected') {
          showToast.error(
            'Google rejected the key',
            'Check Cloud Console: enable Places API + match SHA-1.',
          );
        }
        // Other errors are silent — the empty-results state is the same UI.
      }
      setSearching(false);
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const pickSuggestion = async (s: PlaceSuggestion) => {
    setSearching(true);
    try {
      const r = await placeDetails(s.placeId, sessionTokenRef.current);
      // Mint a fresh session for the next typing session.
      sessionTokenRef.current = createSessionToken();
      if (!r.ok || !r.details.pincode) {
        showToast.error(
          "Couldn't read that address",
          'Try a different result or use GPS.',
        );
        return;
      }
      const d = r.details;
      // Distance-based serviceability — uses the live delivery_center
      // list, NOT the legacy pincodes_validation table.
      const { serviceable } = checkServiceableByDistance(d.latitude, d.longitude);
      if (serviceable === false) {
        showToast.error(
          "We don't deliver here yet",
          "You're outside our delivery radius. Pick a closer address.",
        );
        return;
      }
      const loc: DeliveryLocation = {
        pincode: d.pincode!,
        city: d.city,
        state: d.state,
        area: d.area,
        road: d.road,
        formatted: d.formatted,
        latitude: d.latitude,
        longitude: d.longitude,
        source: 'autocomplete',
        isServiceable: serviceable,
        capturedAt: new Date().toISOString(),
      };
      await setLocation(loc);
      haptics.success();
      showToast.success('Delivery location set', `${d.area ?? d.city ?? ''} ${d.pincode}`.trim());
      navigation.goBack();
    } finally {
      setSearching(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────
  // 2. Use current location (GPS → reverse-geocode)
  // ────────────────────────────────────────────────────────────────────
  const handleDetect = async () => {
    if (detecting) return;
    setDetecting(true);
    setDetectedPreview(null);
    try {
      let status = await checkLocationPermission();
      if (status === 'denied') {
        status = await requestLocationPermission();
      }
      if (status === 'blocked') {
        const ok = await confirm({
          title: 'Location is blocked',
          message:
            "We can't access your location. Open Settings to enable it, or enter your pincode manually below.",
          confirmText: 'Open Settings',
          cancelText: 'Not now',
          icon: 'map-pin',
        });
        if (ok) openAppSettings();
        return;
      }
      if (status === 'unavailable') {
        showToast.info(
          'GPS not available',
          'Rebuild the app to enable detection. Enter pincode below for now.',
        );
        return;
      }
      if (status !== 'granted' && status !== 'limited') {
        showToast.info('Location not granted', 'You can enter pincode manually.');
        return;
      }

      const gps = await getCurrentLocation({ highAccuracy: true });
      if (!gps.ok) {
        const msg =
          gps.error === 'timeout'
            ? "Couldn't get a GPS fix. Make sure location is on and try again."
            : gps.error === 'permission_denied'
            ? 'Permission was denied.'
            : "Couldn't get your location. Try entering pincode below.";
        showToast.error('Location error', msg);
        return;
      }

      await resolveAndPreview(gps.coords.latitude, gps.coords.longitude, {
        silent: false,
      });
    } catch {
      showToast.error('Could not detect location', 'Try again or enter pincode.');
    } finally {
      setDetecting(false);
    }
  };

  /**
   * Shared between initial GPS detect and pin-drag refinement.
   *
   * `opts.silent` controls error noise:
   *   • silent=false (default for "Use current location") — shows toasts
   *     for every failure mode, including no_result/network. The user
   *     just tapped a button; they need feedback.
   *   • silent=true (used by pin-drag) — only shows toasts for ACTIONABLE
   *     configuration errors (missing/rejected key, quota exceeded). For
   *     no_result / network / timeout we keep the previous resolved
   *     address visible and let the user pan again. This stops the
   *     "Couldn't read address" red toast from spamming during normal
   *     map exploration when the pin lands briefly on water / a forest /
   *     any spot without a postal_code component.
   */
  const resolveAndPreview = async (
    lat: number,
    lng: number,
    opts?: { silent?: boolean },
  ) => {
    const silent = opts?.silent ?? false;
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
      } else if (geo.error === 'over_limit') {
        showToast.error('Map quota exceeded', 'Try again in a moment.');
      } else if (!silent) {
        // Soft, non-alarming wording — no_result almost always means
        // "this exact pixel has no address; nudge the map".
        if (geo.error === 'no_result') {
          showToast.info(
            'No address at that exact spot',
            'Move the map slightly and try again.',
          );
        } else {
          showToast.error("Couldn't read address", 'Try again or enter pincode below.');
        }
      }
      return;
    }
    // Distance-based serviceability against the active delivery_centers.
    const { serviceable } = checkServiceableByDistance(
      geo.address.latitude,
      geo.address.longitude,
    );
    setDetectedPreview({
      pincode: geo.address.pincode,
      city: geo.address.city,
      state: geo.address.state,
      area: geo.address.area,
      road: geo.address.road,
      formatted: geo.address.formatted,
      latitude: geo.address.latitude,
      longitude: geo.address.longitude,
      source: 'gps',
      isServiceable: serviceable,
      capturedAt: new Date().toISOString(),
    });
    haptics.tap();
  };

  // Debounce pin-drag geocodes — every map-settle event fires this, and
  // a user panning around the map shouldn't trigger 5 API calls + 5
  // toasts in 2 seconds. 350ms feels instant after the user lets go.
  const panDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPinDrag = (c: { latitude: number; longitude: number }) => {
    if (panDebounceRef.current) clearTimeout(panDebounceRef.current);
    panDebounceRef.current = setTimeout(() => {
      void resolveAndPreview(c.latitude, c.longitude, { silent: true });
    }, 350);
  };

  const acceptDetected = async () => {
    if (!detectedPreview) return;
    if (detectedPreview.isServiceable === false) {
      showToast.error(
        "We don't deliver here yet",
        'Please pick a different pincode.',
      );
      return;
    }
    await setLocation(detectedPreview);
    haptics.success();
    showToast.success(
      'Delivery location set',
      `${detectedPreview.area ?? detectedPreview.city ?? ''} ${detectedPreview.pincode}`.trim(),
    );
    navigation.goBack();
  };

  // ────────────────────────────────────────────────────────────────────
  // 3. Saved address shortcut
  // ────────────────────────────────────────────────────────────────────
  const useSavedAddress = async (a: CustomerAddress) => {
    if (!a.postcode) return;
    const loc: DeliveryLocation = {
      pincode: a.postcode,
      city: a.city,
      state: a.state,
      formatted: `${a.address1}${a.address2 ? `, ${a.address2}` : ''}, ${a.city}, ${a.state}`,
      latitude: a.latitude,
      longitude: a.longitude,
      source: 'saved-address',
      capturedAt: new Date().toISOString(),
    };
    await setLocation(loc);
    haptics.tap();
    showToast.success('Delivery location set', a.postcode);
    navigation.goBack();
  };

  // ────────────────────────────────────────────────────────────────────
  // 4. Manual pincode (fallback path — visible when input is exactly 6 digits)
  // ────────────────────────────────────────────────────────────────────
  const isPincodeQuery =
    /^\d{6}$/.test(query.trim()) && query.trim().length === APP_CONFIG.PINCODE_LENGTH;

  const handlePincodeCheck = async () => {
    const trimmed = query.trim();
    if (!isPincodeQuery) return;
    setPincodeValidating(true);
    try {
      // Forward-geocode the pincode → lat/lng → distance check against
      // active delivery_centers. This replaces the legacy
      // pincodes_validation lookup so the gating is consistent across
      // every entry point (GPS, autocomplete, manual pincode).
      const fg = await forwardGeocode(trimmed);
      if (!fg.ok) {
        showToast.error(
          "Couldn't locate that pincode",
          'Try the search box above or use current location.',
        );
        return;
      }
      const { serviceable } = checkServiceableByDistance(
        fg.address.latitude,
        fg.address.longitude,
      );
      if (serviceable === false) {
        showToast.error(
          "We don't deliver here yet",
          "You're outside our delivery radius. Try a closer pincode.",
        );
        return;
      }
      const loc: DeliveryLocation = {
        pincode: trimmed,
        city: fg.address.city,
        state: fg.address.state,
        area: fg.address.area,
        formatted: fg.address.formatted,
        latitude: fg.address.latitude,
        longitude: fg.address.longitude,
        source: 'manual',
        // We already returned early on `serviceable === false` above, so
        // here it's either `true` or `undefined` (config not hydrated).
        // Treat the unknown case as serviceable — checkout recomputes.
        isServiceable: true,
        capturedAt: new Date().toISOString(),
      };
      await setLocation(loc);
      haptics.success();
      showToast.success('Delivery location set', trimmed);
      navigation.goBack();
    } catch (e: any) {
      showToast.error('Could not validate pincode', e?.message);
    } finally {
      setPincodeValidating(false);
    }
  };

  // Use a recent location.
  const useRecent = async (loc: DeliveryLocation) => {
    await setLocation({
      ...loc,
      capturedAt: new Date().toISOString(),
    });
    haptics.tap();
    showToast.success('Delivery location set', loc.pincode);
    navigation.goBack();
  };

  // NOTE: hooks MUST be declared before any early return — React tracks
  // them by call order. Pulling these above `if (addresses === null)`
  // keeps the hook count stable across renders.
  const recentsToShow = useMemo(
    () => recents.filter(r => r.pincode).slice(0, 5),
    [recents],
  );

  if (addresses === null) return <LoadingScreen />;

  const showSuggestions = query.trim().length >= 3 && !isPincodeQuery;

  return (
    <Container edges={['top']}>
      <ScreenHeader title="Choose delivery location" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          // Android: lets the nested MapView consume vertical pans
          // instead of the parent ScrollView swallowing them.
          nestedScrollEnabled
        >
          {/* ── Search box (Google Places autocomplete + 6-digit pincode) ── */}
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color={colors.primary} />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search area, street, or 6-digit pincode"
              placeholderTextColor={colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType={isPincodeQuery ? 'search' : 'default'}
              onSubmitEditing={isPincodeQuery ? handlePincodeCheck : undefined}
            />
            {isPincodeQuery ? (
              <Pressable
                onPress={handlePincodeCheck}
                disabled={pincodeValidating}
                style={[
                  styles.searchSubmit,
                  pincodeValidating && { opacity: 0.5 },
                ]}
              >
                <Text variant="caption" weight="800" color={colors.white}>
                  {pincodeValidating ? '…' : 'Check'}
                </Text>
              </Pressable>
            ) : searching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Icon name="x" size={16} color={colors.textTertiary} />
              </Pressable>
            ) : null}
          </View>

          {/* ── Autocomplete suggestions ── */}
          {showSuggestions && suggestions.length > 0 ? (
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
                      <Text
                        variant="caption"
                        weight="500"
                        color={colors.textSecondary}
                        numberOfLines={1}
                      >
                        {s.secondaryText}
                      </Text>
                    ) : null}
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.textTertiary} />
                </Pressable>
              ))}
            </Card>
          ) : null}

          {showSuggestions && !searching && suggestions.length === 0 ? (
            <Text
              variant="caption"
              color={colors.textTertiary}
              align="center"
              style={{ marginTop: spacing.sm }}
            >
              No matches. Try a 6-digit pincode or "Use current location".
            </Text>
          ) : null}

          {/* ── Use current location ── */}
          <Pressable
            onPress={handleDetect}
            disabled={detecting}
            style={({ pressed }) => [
              styles.gpsCard,
              pressed && { opacity: 0.92 },
              detecting && { opacity: 0.7 },
            ]}
            android_ripple={{ color: colors.pressed }}
          >
            <View style={styles.gpsIcon}>
              <Icon name="navigation" size={18} color={colors.white} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.base }}>
              <Text variant="bodyBold" weight="700" color={colors.textPrimary}>
                {detecting ? 'Detecting location…' : 'Use current location'}
              </Text>
              <Text
                variant="caption"
                weight="600"
                color={colors.textSecondary}
                style={{ marginTop: 2 }}
              >
                Auto-detect via GPS — fastest way to find serviceable pincodes.
              </Text>
            </View>
            {detecting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="chevron-right" size={18} color={colors.textTertiary} />
            )}
          </Pressable>

          {/* ── Detected preview ── BIG map (Zepto/Swiggy style) ──── */}
          {detectedPreview &&
          typeof detectedPreview.latitude === 'number' &&
          typeof detectedPreview.longitude === 'number' ? (
            <View style={styles.detectedBlock}>
              {/* Edge-to-edge map dominates this block. The map itself */}
              {/* shows a centred pin overlay + locate-me FAB.           */}
              <LocationMapPreview
                latitude={detectedPreview.latitude}
                longitude={detectedPreview.longitude}
                onCoordinateChange={onPinDrag}
                draggable
                height={MAP_H}
                showLocateMe
                onLocateMe={handleDetect}
                style={styles.detectedMap}
              />

              <View style={styles.detectedInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="map-pin" size={16} color={colors.primary} />
                  <Text
                    variant="bodyBold"
                    weight="700"
                    color={colors.textPrimary}
                    style={{ marginLeft: spacing.xs }}
                  >
                    {detectedPreview.area ?? detectedPreview.city ?? 'Selected location'}
                    {detectedPreview.pincode ? `, ${detectedPreview.pincode}` : ''}
                  </Text>
                </View>
                {detectedPreview.formatted ? (
                  <Text
                    variant="caption"
                    color={colors.textSecondary}
                    weight="500"
                    numberOfLines={2}
                    style={{ marginTop: 4 }}
                  >
                    {detectedPreview.formatted}
                  </Text>
                ) : null}

                {detectedPreview.isServiceable === false ? (
                  <View style={styles.notServiceable}>
                    <Icon name="alert-circle" size={14} color={colors.error} />
                    <Text
                      variant="caption"
                      weight="700"
                      color={colors.error}
                      style={{ marginLeft: 4 }}
                    >
                      Outside our delivery radius
                    </Text>
                  </View>
                ) : detectedPreview.isServiceable === true ? (
                  <View style={styles.serviceable}>
                    <Icon name="check-circle" size={14} color={colors.success} />
                    <Text
                      variant="caption"
                      weight="700"
                      color={colors.success}
                      style={{ marginLeft: 4 }}
                    >
                      We deliver here
                    </Text>
                  </View>
                ) : null}

                <View style={styles.detectedActions}>
                  <Button
                    title="Use this location"
                    onPress={acceptDetected}
                    disabled={detectedPreview.isServiceable === false}
                    size="md"
                    fullWidth
                  />
                </View>
              </View>
            </View>
          ) : null}

          {/* ── Recently used ── */}
          {recentsToShow.length > 0 ? (
            <>
              <Divider style={{ marginVertical: spacing.lg }} />
              <Text
                variant="label"
                weight="700"
                color={colors.textPrimary}
                style={styles.sectionLabel}
              >
                Recent locations
              </Text>
              {recentsToShow.map((r, i) => (
                <Pressable
                  key={`recent-${r.pincode}-${i}`}
                  onPress={() => useRecent(r)}
                  style={({ pressed }) => [
                    styles.recentRow,
                    pressed && { opacity: 0.9 },
                  ]}
                  android_ripple={{ color: colors.pressed }}
                >
                  <Icon name="clock" size={14} color={colors.textTertiary} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text variant="bodyBold" weight="700" numberOfLines={1}>
                      {r.area ?? r.city ?? `Pincode ${r.pincode}`}
                    </Text>
                    <Text
                      variant="caption"
                      weight="500"
                      color={colors.textSecondary}
                      numberOfLines={1}
                    >
                      {r.formatted ?? `${r.city ?? ''} ${r.pincode}`.trim()}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </>
          ) : null}

          {/* ── Saved addresses (auth users) ── */}
          {addresses.length > 0 ? (
            <>
              <Divider style={{ marginVertical: spacing.lg }} />
              <Text
                variant="label"
                weight="700"
                color={colors.textPrimary}
                style={styles.sectionLabel}
              >
                Your saved addresses
              </Text>
              {addresses.map(a => (
                <Pressable
                  key={`addr-${a.customerAddressId}`}
                  onPress={() => useSavedAddress(a)}
                  style={({ pressed }) => [
                    styles.savedAddress,
                    pressed && { opacity: 0.92 },
                  ]}
                  android_ripple={{ color: colors.pressed }}
                >
                  <Icon name="map-pin" size={16} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text variant="bodyBold" weight="700" numberOfLines={1}>
                      {a.firstname} {a.lastname}
                    </Text>
                    <Text
                      variant="caption"
                      weight="500"
                      color={colors.textSecondary}
                      numberOfLines={2}
                    >
                      {a.address1}
                      {a.address2 ? `, ${a.address2}` : ''}, {a.city}, {a.state}{' '}
                      {a.postcode}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.textTertiary} />
                </Pressable>
              ))}
            </>
          ) : null}

          {!isAuth ? (
            <View style={styles.guestNote}>
              <Text
                variant="caption"
                weight="600"
                color={colors.textSecondary}
                align="center"
              >
                Sign in to use your saved addresses as quick picks.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['2xl'] },

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
    minHeight: 54,
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
  searchSubmit: {
    paddingHorizontal: spacing.base,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },

  suggestionsCard: {
    marginTop: spacing.sm,
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

  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.base,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadows.sm,
  },
  gpsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // The detected-location block has TWO halves: a tall edge-to-edge map
  // up top, and an info/action panel below. The whole thing reads as one
  // card thanks to the matching border/radius/shadow.
  detectedBlock: {
    marginTop: spacing.base,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  detectedMap: {
    borderRadius: 0,
    borderWidth: 0,
  },
  detectedInfo: {
    padding: spacing.base,
    backgroundColor: colors.tintSoft,
  },
  serviceable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  notServiceable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  detectedActions: {
    flexDirection: 'row',
    marginTop: spacing.base,
  },

  sectionLabel: {
    marginBottom: spacing.sm,
  },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },

  savedAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },

  guestNote: {
    marginTop: spacing.lg,
    padding: spacing.base,
    backgroundColor: colors.tintSoft,
    borderRadius: radius.lg,
  },
});
