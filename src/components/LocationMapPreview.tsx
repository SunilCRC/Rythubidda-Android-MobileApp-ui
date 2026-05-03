import React, { useRef } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Text } from './common/Text';
import { ErrorBoundary } from './common/ErrorBoundary';
import { colors } from '../theme/colors';
import { radius, shadows, spacing } from '../theme/spacing';

/**
 * Tiny wrapper around `react-native-maps`. We lazy-require so the JS
 * bundle still loads on a debug build that hasn't been re-linked yet
 * (the dev would otherwise see a red-screen on app launch).
 *
 * On Android we force the Google provider — that's the whole point.
 * On iOS we leave the provider unset so it falls back to Apple Maps,
 * which is fine: the iOS bundle ID + key isn't set up yet, and we want
 * the screen to *render* (just without the Google branding) until
 * someone wires that up.
 *
 * Behaviour:
 *  • Initial region centred on the supplied lat/lng with ~1km zoom.
 *  • Single draggable marker. `onCoordinateChange` fires only on
 *    `onDragEnd` — we don't re-geocode mid-drag.
 *  • The map itself is non-interactive otherwise (no zoom/pan) — that
 *    keeps the preview tight and avoids accidental re-renders.
 */

interface Props {
  latitude: number;
  longitude: number;
  /** Fires when the user lifts their finger after dragging the pin. */
  onCoordinateChange?: (coords: { latitude: number; longitude: number }) => void;
  /** Set false to disable dragging the marker (preview-only mode). */
  draggable?: boolean;
  /** Override default 180px height. */
  height?: number;
  style?: ViewStyle;
}

interface MapsModule {
  default: any;
  Marker: any;
  PROVIDER_GOOGLE?: any;
}

function loadMaps(): MapsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-maps') as MapsModule;
  } catch {
    return null;
  }
}

/**
 * Friendly fallback shown when:
 *  - the `react-native-maps` native module is missing (pre-rebuild)
 *  - the device has no Google Play Services (some emulators)
 *  - rendering MapView throws (caught by the ErrorBoundary below)
 *
 * Rendering this instead of crashing lets the user still confirm
 * their detected pincode + use the address. The map is a nice-to-have,
 * not a hard dependency.
 */
const MapFallback: React.FC<{ height: number; style?: ViewStyle }> = ({
  height,
  style,
}) => (
  <View style={[styles.fallback, { height }, style]}>
    <Icon name="map-pin" size={32} color={colors.primary} />
    <Text
      variant="caption"
      weight="600"
      color={colors.textSecondary}
      align="center"
      style={{ marginTop: spacing.xs, paddingHorizontal: spacing.base }}
    >
      Map preview unavailable on this device.{'\n'}
      Your detected location is still ready to use below.
    </Text>
  </View>
);

const InnerMap: React.FC<Props> = ({
  latitude,
  longitude,
  onCoordinateChange,
  draggable = true,
  height = 180,
  style,
}) => {
  // Coordinate ref so the map view doesn't re-render every drag event.
  const lastCoordsRef = useRef({ latitude, longitude });
  lastCoordsRef.current = { latitude, longitude };

  const maps = loadMaps();
  if (!maps) {
    return <MapFallback height={height} style={style} />;
  }

  // The library exports the MapView as the default export, but some
  // older RN setups end up with the namespace object as the require
  // result. Belt-and-braces: try `default`, then the module itself.
  const MapView: any = maps.default ?? (maps as any).MapView ?? null;
  const Marker = maps.Marker;
  const PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;

  if (!MapView || !Marker) {
    return <MapFallback height={height} style={style} />;
  }

  const region = {
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={[styles.wrap, { height }, style]}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        // Re-centre when the parent passes new coords (e.g. user picked
        // a different autocomplete suggestion).
        region={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        loadingEnabled
        loadingBackgroundColor={colors.tintSoft}
        loadingIndicatorColor={colors.primary}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          draggable={draggable}
          onDragEnd={
            draggable
              ? (e: any) => {
                  const c = e?.nativeEvent?.coordinate;
                  if (
                    c &&
                    typeof c.latitude === 'number' &&
                    typeof c.longitude === 'number'
                  ) {
                    onCoordinateChange?.({
                      latitude: c.latitude,
                      longitude: c.longitude,
                    });
                  }
                }
              : undefined
          }
          anchor={{ x: 0.5, y: 1 }}
          pinColor={colors.primary}
        />
      </MapView>
    </View>
  );
};

/**
 * Public component: wraps `InnerMap` in an ErrorBoundary so a render
 * exception from the map library can't crash the host screen. (Note:
 * native crashes — e.g. missing Google Play Services — bypass this and
 * kill the process. For those, the AVD must be a "Google Play" image.)
 */
export const LocationMapPreview: React.FC<Props> = props => (
  <ErrorBoundary
    fallback={() => (
      <MapFallback height={props.height ?? 180} style={props.style} />
    )}
  >
    <InnerMap {...props} />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  fallback: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.tintSoft,
    borderWidth: 1,
    borderColor: colors.tintMid,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
  },
});
